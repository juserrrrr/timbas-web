"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { getToken } from "@/lib/auth"
import { createLivePeerConnection, getIceServers } from "@/lib/webrtc"
import { preferVideoCodecs, tuneAudioSender, tuneOpusSdp, tuneVideoSender, type VideoProfile } from "@/lib/live/tuning"
import {
  endStream,
  getStreamViewers,
  leaveStream,
  sendSignal,
  startStream,
  updateStreamVisibility,
  type SignalEvent,
  type StreamPeer,
} from "@/lib/services/streaming"
import { useLiveMedia } from "./use-live-media"
import type { BroadcastStats, HostBroadcast, StartOptions } from "./broadcast-types"

interface Senders {
  video: RTCRtpSender
  audio: RTCRtpSender
}

const HEALTH_INTERVAL_MS = 3000
const ICE_RESTART_AFTER_MS = 6000
const REBUILD_AFTER_MS = 14_000

/**
 * Peer to peer transport: one connection per viewer, straight from the host's
 * machine. Lowest latency there is, but the host uploads and encodes one copy
 * per person watching, so it does not scale past a handful of viewers.
 *
 * Each connection is laid out once, one video and one audio transceiver, and
 * the tracks inside are swapped with replaceTrack afterwards. Nothing the host
 * does during the live renegotiates, which is what keeps the picture from
 * blacking out.
 */
export function useHostBroadcast(
  streamId: string,
  peerId: string,
  initialViewers: StreamPeer[],
  live: boolean,
): HostBroadcast {
  const pcsRef = useRef(new Map<string, RTCPeerConnection>())
  const sendersRef = useRef(new Map<string, Senders>())
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const offeredAtRef = useRef(new Map<string, number>())
  const viewersRef = useRef(new Map(initialViewers.map((viewer) => [viewer.peerId, viewer])))
  const buildingRef = useRef(new Set<string>())

  const iceServersRef = useRef<RTCIceServer[]>([])
  const iceServersPromiseRef = useRef<Promise<RTCIceServer[]> | null>(null)
  const peerIdRef = useRef(peerId)
  const profileRef = useRef<VideoProfile>({ quality: "1080p", frameRate: 60 })
  const statsSampleRef = useRef({ bytes: 0, at: 0 })

  const [viewers, setViewers] = useState<StreamPeer[]>(initialViewers)
  const [hasStarted, setHasStarted] = useState(live)
  const [switchingScreen, setSwitchingScreen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stats, setStats] = useState<BroadcastStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  peerIdRef.current = peerId

  const publishVideoTrack = useCallback((track: MediaStreamTrack | null) => {
    void Promise.all([...sendersRef.current.values()].map(async ({ video }) => {
      await video.replaceTrack(track).catch(() => {})
      if (track) await tuneVideoSender(video, profileRef.current, viewersRef.current.size)
    }))
  }, [])

  const media = useLiveMedia(hasStarted, publishVideoTrack)
  const { mixerRef, videoTrackRef } = media

  const ensureIceServers = useCallback(() => {
    if (iceServersRef.current.length) return Promise.resolve(iceServersRef.current)
    if (iceServersPromiseRef.current) return iceServersPromiseRef.current

    const token = getToken()
    if (!token) return Promise.resolve<RTCIceServer[]>([])

    iceServersPromiseRef.current = getIceServers(token)
      .then((servers) => {
        iceServersRef.current = servers
        return servers
      })
      .catch((caught: unknown) => {
        iceServersPromiseRef.current = null
        throw caught
      })
    return iceServersPromiseRef.current
  }, [])

  // ─── PEER CONNECTIONS ──────────────────────────────────────────────────────

  const negotiate = useCallback(async (target: string, pc: RTCPeerConnection, iceRestart: boolean) => {
    const token = getToken()
    if (!token || pc.signalingState === "closed") return

    const offer = await pc.createOffer({ iceRestart })
    await pc.setLocalDescription({ type: "offer", sdp: tuneOpusSdp(offer.sdp) })
    offeredAtRef.current.set(target, Date.now())

    const description = pc.localDescription ?? offer
    await sendSignal(token, streamId, {
      from: peerIdRef.current,
      to: target,
      type: "offer",
      data: { type: description.type, sdp: description.sdp },
    })
  }, [streamId])

  const buildPeer = useCallback(async (target: string) => {
    const token = getToken()
    const mixer = mixerRef.current
    if (!token || !mixer || buildingRef.current.has(target)) return

    buildingRef.current.add(target)
    try {
      const iceServers = await ensureIceServers()
      pcsRef.current.get(target)?.close()

      const pc = createLivePeerConnection(iceServers)
      pcsRef.current.set(target, pc)
      pendingIceRef.current.delete(target)

      const outbound = new MediaStream()
      const videoTx = pc.addTransceiver(videoTrackRef.current ?? "video", { direction: "sendonly", streams: [outbound] })
      const audioTx = pc.addTransceiver(mixer.track, { direction: "sendonly", streams: [outbound] })
      preferVideoCodecs(videoTx, profileRef.current)
      sendersRef.current.set(target, { video: videoTx.sender, audio: audioTx.sender })

      await tuneVideoSender(videoTx.sender, profileRef.current, viewersRef.current.size)
      await tuneAudioSender(audioTx.sender)

      pc.onicecandidate = (event) => {
        if (!event.candidate) return
        void sendSignal(token, streamId, { from: peerIdRef.current, to: target, type: "ice", data: event.candidate.toJSON() })
      }

      pc.onconnectionstatechange = () => {
        if (pcsRef.current.get(target) !== pc) return
        if (pc.connectionState === "connected") setError(null)
        if (pc.connectionState === "failed") offeredAtRef.current.set(target, 0)
      }

      await negotiate(target, pc, false)
    } finally {
      buildingRef.current.delete(target)
    }
  }, [ensureIceServers, mixerRef, negotiate, streamId, videoTrackRef])

  const closePeer = useCallback((target: string) => {
    pcsRef.current.get(target)?.close()
    pcsRef.current.delete(target)
    sendersRef.current.delete(target)
    pendingIceRef.current.delete(target)
    offeredAtRef.current.delete(target)
    viewersRef.current.delete(target)
    setViewers([...viewersRef.current.values()])
  }, [])

  const handleEvent = useCallback(async (event: SignalEvent) => {
    const from = event.from
    if (!from) return

    if (event.type === "viewer_joined") {
      const payload = event.payload as { name?: string } | undefined
      viewersRef.current.set(from, { peerId: from, name: payload?.name || "Espectador" })
      setViewers([...viewersRef.current.values()])
      if (mixerRef.current) await buildPeer(from)
      return
    }

    if (event.type === "viewer_left") {
      closePeer(from)
      return
    }

    if (event.type === "answer") {
      const pc = pcsRef.current.get(from)
      if (!pc || pc.signalingState !== "have-local-offer") return
      await pc.setRemoteDescription(new RTCSessionDescription(event.payload)).catch(() => {})
      for (const candidate of pendingIceRef.current.get(from) ?? []) await pc.addIceCandidate(candidate).catch(() => {})
      pendingIceRef.current.delete(from)
      return
    }

    if (event.type === "ice") {
      const pc = pcsRef.current.get(from)
      if (pc?.remoteDescription) await pc.addIceCandidate(event.payload).catch(() => {})
      else pendingIceRef.current.set(from, [...(pendingIceRef.current.get(from) ?? []), event.payload])
    }
  }, [buildPeer, closePeer, mixerRef])

  /** Keeps every viewer connected without ever tearing a healthy peer down. */
  const checkHealth = useCallback(async () => {
    const token = getToken()
    if (!token || !mixerRef.current) return

    const latest = await getStreamViewers(token, streamId).catch(() => null)
    if (latest) {
      const known = new Set(latest.map((viewer) => viewer.peerId))
      let changed = viewersRef.current.size !== latest.length
      for (const viewer of latest) {
        if (!viewersRef.current.has(viewer.peerId)) changed = true
        viewersRef.current.set(viewer.peerId, viewer)
      }
      for (const existing of [...viewersRef.current.keys()]) {
        if (known.has(existing)) continue
        viewersRef.current.delete(existing)
        pcsRef.current.get(existing)?.close()
        pcsRef.current.delete(existing)
        sendersRef.current.delete(existing)
        changed = true
      }
      if (changed) setViewers([...viewersRef.current.values()])
    }

    const now = Date.now()
    for (const target of viewersRef.current.keys()) {
      const pc = pcsRef.current.get(target)
      const since = now - (offeredAtRef.current.get(target) ?? 0)

      if (!pc || pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (since > 2000) await buildPeer(target)
        continue
      }
      if (pc.connectionState === "connected") continue

      if (pc.connectionState === "disconnected" && since > ICE_RESTART_AFTER_MS) {
        pc.restartIce()
        await negotiate(target, pc, true).catch(() => {})
        continue
      }
      if (since > REBUILD_AFTER_MS) await buildPeer(target)
    }
  }, [buildPeer, mixerRef, negotiate, streamId])

  useEffect(() => {
    if (!hasStarted) return
    void checkHealth()
    const interval = window.setInterval(() => { void checkHealth() }, HEALTH_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [checkHealth, hasStarted])

  // Viewer count changes the share of the upload each copy is allowed to use.
  useEffect(() => {
    if (!media.sharing) return
    for (const { video } of sendersRef.current.values()) {
      void tuneVideoSender(video, profileRef.current, viewers.length)
    }
  }, [media.sharing, viewers.length])

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────

  const { beginCapture, switchCapture, stopMedia } = media

  const start = useCallback(async ({ profile, visibility, withMic, withGameAudio }: StartOptions) => {
    setError(null)
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Seu navegador não suporta compartilhamento de tela.")
      return false
    }

    setStarting(true)
    try {
      profileRef.current = profile
      await beginCapture(profile, withMic, withGameAudio)

      const token = getToken()
      if (!token) throw new Error("Faça login novamente para transmitir.")

      await updateStreamVisibility(token, streamId, visibility).catch(() => null)
      await startStream(token, streamId)
      setHasStarted(true)

      await Promise.all([...viewersRef.current.keys()].map((target) => buildPeer(target)))
      return true
    } catch (caught: unknown) {
      setError(
        caught instanceof Error && caught.name === "NotAllowedError"
          ? "Você cancelou a seleção de tela."
          : caught instanceof Error ? caught.message : "Não foi possível iniciar a transmissão.",
      )
      return false
    } finally {
      setStarting(false)
    }
  }, [beginCapture, buildPeer, streamId])

  const switchScreen = useCallback(async () => {
    if (switchingScreen) return
    setSwitchingScreen(true)
    setError(null)
    try {
      await switchCapture(profileRef.current)
      toast.success("Tela trocada", { description: "A live seguiu no mesmo link, sem cortar." })
    } catch (caught: unknown) {
      if (caught instanceof Error && caught.name !== "NotAllowedError") {
        setError("Não foi possível trocar a tela. Tente novamente.")
      }
    } finally {
      setSwitchingScreen(false)
    }
  }, [switchCapture, switchingScreen])

  const stopEverything = useCallback(() => {
    stopMedia()
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    sendersRef.current.clear()
    pendingIceRef.current.clear()
    offeredAtRef.current.clear()
    setHasStarted(false)
    setStats(null)
  }, [stopMedia])

  const finish = useCallback(async () => {
    stopEverything()
    const token = getToken()
    if (token) await endStream(token, streamId).catch(() => {})
  }, [stopEverything, streamId])

  const resetPeers = useCallback((nextViewers: StreamPeer[]) => {
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    sendersRef.current.clear()
    pendingIceRef.current.clear()
    offeredAtRef.current.clear()
    viewersRef.current = new Map(nextViewers.map((viewer) => [viewer.peerId, viewer]))
    setViewers(nextViewers)
  }, [])

  // ─── STATS ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!media.sharing) return

    const collect = async () => {
      let bytes = 0
      let fps = 0
      let width = 0
      let height = 0
      let rttMs = 0
      let relayed = false

      for (const pc of pcsRef.current.values()) {
        const report = await pc.getStats().catch(() => null)
        if (!report) continue

        const candidateTypes = new Map<string, string>()
        report.forEach((entry) => {
          if (entry.type === "local-candidate") candidateTypes.set(entry.id, entry.candidateType)
        })
        report.forEach((entry) => {
          if (entry.type === "outbound-rtp" && entry.kind === "video") {
            bytes += entry.bytesSent ?? 0
            fps = Math.max(fps, Math.round(entry.framesPerSecond ?? 0))
            width = Math.max(width, entry.frameWidth ?? 0)
            height = Math.max(height, entry.frameHeight ?? 0)
          }
          if (entry.type === "candidate-pair" && entry.state === "succeeded" && entry.nominated) {
            rttMs = Math.max(rttMs, Math.round((entry.currentRoundTripTime ?? 0) * 1000))
            if (candidateTypes.get(entry.localCandidateId) === "relay") relayed = true
          }
        })
      }

      const now = Date.now()
      const previous = statsSampleRef.current
      statsSampleRef.current = { bytes, at: now }
      if (!previous.at || now <= previous.at) return

      setStats({
        kbps: Math.max(0, Math.round(((bytes - previous.bytes) * 8) / (now - previous.at))),
        fps,
        width,
        height,
        rttMs,
        relayed,
      })
    }

    void collect()
    const interval = window.setInterval(() => { void collect() }, 2000)
    return () => window.clearInterval(interval)
  }, [media.sharing])

  useEffect(() => {
    void ensureIceServers().catch(() => setError("Não foi possível carregar a configuração de conexão da live."))
  }, [ensureIceServers])

  useEffect(() => () => {
    stopEverything()
    const token = getToken()
    if (token) void leaveStream(token, streamId, peerIdRef.current)
  }, [stopEverything, streamId])

  return {
    transport: "p2p",
    previewRef: media.previewRef,
    viewers,
    sharing: media.sharing,
    hasStarted,
    starting,
    switchingScreen,
    screen: media.screen,
    micReady: media.micReady,
    micOn: media.micOn,
    micBusy: media.micBusy,
    gameAudioState: media.gameAudioState,
    gameAudioLabel: media.gameAudioLabel,
    gameAudioBusy: media.gameAudioBusy,
    levels: media.levels,
    stats,
    audioInputs: media.audioInputs,
    loopbackDevices: media.loopbackDevices,
    error,
    handleEvent,
    start,
    switchScreen,
    toggleMic: media.toggleMic,
    connectGameAudio: media.connectGameAudio,
    disconnectGameAudio: media.disconnectGameAudio,
    setVolume: media.setVolume,
    finish,
    resetPeers,
  }
}
