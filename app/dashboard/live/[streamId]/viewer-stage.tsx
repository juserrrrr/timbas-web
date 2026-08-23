"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getToken } from "@/lib/auth"
import { createLivePeerConnection, getIceServers } from "@/lib/webrtc"
import { tuneOpusSdp, tuneReceiverLatency } from "@/lib/live/tuning"
import {
  getPublicIceServers,
  leavePublicStream,
  leaveStream,
  sendPublicSignal,
  sendSignal,
  type SignalEvent,
  type StreamSummary,
} from "@/lib/services/streaming"
import { useSignalChannel } from "@/hooks/use-signal-channel"
import { ViewerShell, type ViewerStats, type ViewerStatus } from "./viewer-shell"

interface Props {
  streamId: string
  peerId: string
  stream: StreamSummary
  guestToken?: string
  onReconnect: () => Promise<void>
}

/**
 * Peer to peer playback: media arrives straight from the host's machine over a
 * single connection that is kept alive across screen changes and ICE restarts.
 */
export function ViewerStage({ streamId, peerId, stream, guestToken, onReconnect }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const hostRef = useRef<string | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pausedProbeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iceServersRef = useRef<RTCIceServer[]>([])
  const iceServersPromiseRef = useRef<Promise<RTCIceServer[]> | null>(null)
  const statsSampleRef = useRef({ bytes: 0, at: 0 })

  const [status, setStatus] = useState<ViewerStatus>("connecting")
  const [muted, setMuted] = useState(true)
  const [volume, setVolume] = useState(1)
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false)
  const [viewerCount, setViewerCount] = useState(stream.viewers)
  const [stats, setStats] = useState<ViewerStats | null>(null)

  const ensureIceServers = useCallback(() => {
    if (iceServersRef.current.length) return Promise.resolve(iceServersRef.current)
    if (iceServersPromiseRef.current) return iceServersPromiseRef.current

    const token = getToken()
    const request = guestToken ? getPublicIceServers() : token ? getIceServers(token) : Promise.resolve<RTCIceServer[]>([])
    iceServersPromiseRef.current = request
      .then((servers) => {
        iceServersRef.current = servers
        return servers
      })
      .catch((caught: unknown) => {
        iceServersPromiseRef.current = null
        throw caught
      })
    return iceServersPromiseRef.current
  }, [guestToken])

  const signal = useCallback((to: string, type: "answer" | "ice", data: unknown) => {
    const token = getToken()
    const body = { from: peerId, to, type, data }
    if (guestToken) void sendPublicSignal(streamId, guestToken, body)
    else if (token) void sendSignal(token, streamId, body)
  }, [guestToken, peerId, streamId])

  const closePeer = useCallback(() => {
    if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current)
    if (pausedProbeRef.current) clearTimeout(pausedProbeRef.current)
    disconnectTimerRef.current = null
    pausedProbeRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    hostRef.current = null
    pendingIceRef.current = []
    if (videoRef.current) videoRef.current.srcObject = null
    if (audioRef.current) audioRef.current.srcObject = null
    setHasRemoteAudio(false)
    setStats(null)
  }, [])

  /**
   * Plays the sound as soon as the browser allows it. Autoplay with audio is
   * blocked until the person has interacted with the site, so a refusal falls
   * back to muted playback and the button takes over.
   */
  const tryPlayAudio = useCallback(async () => {
    const audio = audioRef.current
    if (!audio?.srcObject) return
    audio.muted = false
    try {
      await audio.play()
      setMuted(false)
    } catch {
      audio.muted = true
      setMuted(true)
      await audio.play().catch(() => {})
    }
  }, [])

  const attachPeerMedia = useCallback((pc: RTCPeerConnection) => {
    const video = new MediaStream()
    const audio = new MediaStream()

    pc.ontrack = (event) => {
      if (event.track.kind === "video") {
        video.addTrack(event.track)
        // The host pausing replaces the track with nothing, which mutes it on
        // this side instead of turning the picture black. A track also starts
        // out muted, so only a mute after real frames means a true pause.
        event.track.onmute = () => setStatus((value) => (value === "live" ? "paused" : value))
        event.track.onunmute = () => {
          if (pausedProbeRef.current) clearTimeout(pausedProbeRef.current)
          pausedProbeRef.current = null
          setStatus("live")
          void videoRef.current?.play().catch(() => {})
        }
        event.track.onended = () => setStatus("waiting")
        if (videoRef.current && videoRef.current.srcObject !== video) videoRef.current.srcObject = video
      } else {
        audio.addTrack(event.track)
        setHasRemoteAudio(true)
        if (audioRef.current && audioRef.current.srcObject !== audio) {
          audioRef.current.srcObject = audio
          void tryPlayAudio()
        }
      }
      tuneReceiverLatency(pc)
    }
  }, [tryPlayAudio])

  const acceptOffer = useCallback(async (from: string, offer: RTCSessionDescriptionInit) => {
    const token = getToken()
    if (!guestToken && !token) return

    const current = pcRef.current
    // An offer from the same host on a healthy connection is a renegotiation
    // or an ICE restart. Answering on the existing peer keeps the picture on
    // screen; rebuilding it would blank the stage for a second or two.
    const reusable = current && hostRef.current === from && current.connectionState !== "closed" && current.signalingState === "stable"

    let pc: RTCPeerConnection
    if (reusable && current) {
      pc = current
    } else {
      const pendingCandidates = pendingIceRef.current
      closePeer()
      pendingIceRef.current = pendingCandidates
      setStatus("connecting")

      pc = createLivePeerConnection(await ensureIceServers())
      pcRef.current = pc
      hostRef.current = from
      attachPeerMedia(pc)

      pc.onicecandidate = (event) => {
        if (event.candidate) signal(from, "ice", event.candidate.toJSON())
      }

      // The host closing the tab shows up here long before the API times it out.
      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return
        if (pc.connectionState === "connected") {
          if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current)
          disconnectTimerRef.current = null
          tuneReceiverLatency(pc)

          // Joining while the host is between screens gives a connected peer
          // with no frames coming. Waiting a moment tells that apart from the
          // normal gap before the first frame.
          const videoTrack = pc.getReceivers().find((receiver) => receiver.track?.kind === "video")?.track
          if (videoTrack?.muted) {
            if (pausedProbeRef.current) clearTimeout(pausedProbeRef.current)
            pausedProbeRef.current = setTimeout(() => {
              if (pcRef.current === pc && videoTrack.muted) setStatus("paused")
              pausedProbeRef.current = null
            }, 3000)
            return
          }
          setStatus((value) => (value === "paused" ? value : "live"))
          return
        }
        if (pc.connectionState === "failed") {
          setStatus("connecting")
          return
        }
        if (pc.connectionState === "disconnected" && !disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(() => {
            if (pcRef.current === pc && pc.connectionState === "disconnected") setStatus("connecting")
            disconnectTimerRef.current = null
          }, 5000)
        }
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    for (const candidate of pendingIceRef.current) await pc.addIceCandidate(candidate).catch(() => {})
    pendingIceRef.current = []

    const answer = await pc.createAnswer()
    await pc.setLocalDescription({ type: "answer", sdp: tuneOpusSdp(answer.sdp) })
    tuneReceiverLatency(pc)

    const description = pc.localDescription ?? answer
    signal(from, "answer", { type: description.type, sdp: description.sdp })
  }, [attachPeerMedia, closePeer, ensureIceServers, guestToken, signal])

  const handleEvent = useCallback(async (event: SignalEvent) => {
    if (event.type === "offer" && event.from) {
      await acceptOffer(event.from, event.payload)
      return
    }

    if (event.type === "ice") {
      const pc = pcRef.current
      if (pc?.remoteDescription) await pc.addIceCandidate(event.payload).catch(() => {})
      else pendingIceRef.current.push(event.payload)
      return
    }

    if (event.type === "host_ready") {
      closePeer()
      setStatus("connecting")
      return
    }

    if (event.type === "host_unavailable") {
      closePeer()
      setStatus("waiting")
      return
    }

    if (event.type === "viewers") {
      setViewerCount(event.payload?.count ?? 0)
      return
    }

    if (event.type === "stream_ended") {
      closePeer()
      setStatus("ended")
    }
  }, [acceptOffer, closePeer])

  const connected = useSignalChannel(streamId, peerId, handleEvent, status !== "ended", guestToken, onReconnect)

  useEffect(() => {
    void ensureIceServers().catch(() => {})
  }, [ensureIceServers])

  useEffect(() => () => {
    closePeer()
    const token = getToken()
    if (guestToken) void leavePublicStream(streamId, peerId, guestToken)
    else if (token) void leaveStream(token, streamId, peerId)
  }, [closePeer, guestToken, peerId, streamId])

  useEffect(() => {
    if (status !== "live" && status !== "paused") return

    const collect = async () => {
      const report = await pcRef.current?.getStats().catch(() => null)
      if (!report) return

      let bytes = 0
      let fps = 0
      let width = 0
      let height = 0
      let rttMs = 0
      let relayed = false
      const candidateTypes = new Map<string, string>()

      report.forEach((entry) => {
        if (entry.type === "local-candidate") candidateTypes.set(entry.id, entry.candidateType)
      })
      report.forEach((entry) => {
        if (entry.type === "inbound-rtp" && entry.kind === "video") {
          bytes += entry.bytesReceived ?? 0
          fps = Math.round(entry.framesPerSecond ?? 0)
          width = entry.frameWidth ?? 0
          height = entry.frameHeight ?? 0
        }
        if (entry.type === "candidate-pair" && entry.state === "succeeded" && entry.nominated) {
          rttMs = Math.round((entry.currentRoundTripTime ?? 0) * 1000)
          if (candidateTypes.get(entry.localCandidateId) === "relay") relayed = true
        }
      })

      const now = Date.now()
      const previous = statsSampleRef.current
      statsSampleRef.current = { bytes, at: now }
      if (!previous.at || now <= previous.at) return

      setStats({ kbps: Math.max(0, Math.round(((bytes - previous.bytes) * 8) / (now - previous.at))), fps, width, height, rttMs, relayed })
    }

    void collect()
    const interval = window.setInterval(() => { void collect() }, 2000)
    return () => window.clearInterval(interval)
  }, [status])

  const toggleSound = () => {
    const audio = audioRef.current
    if (!audio || !hasRemoteAudio) return
    if (audio.muted) {
      void tryPlayAudio()
      return
    }
    audio.muted = true
    setMuted(true)
  }

  const changeVolume = (next: number) => {
    setVolume(next)
    if (audioRef.current) audioRef.current.volume = next
  }

  return (
    <ViewerShell
      stream={stream}
      connected={connected}
      viewerCount={viewerCount}
      status={status}
      hasAudio={hasRemoteAudio}
      muted={muted}
      volume={volume}
      stats={stats}
      videoRef={videoRef}
      audioRef={audioRef}
      onToggleSound={toggleSound}
      onVolumeChange={changeVolume}
    />
  )
}
