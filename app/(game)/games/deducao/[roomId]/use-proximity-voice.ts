"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Room } from "@colyseus/sdk"
import type { Snapshot } from "./use-deducao-room"

const FULL_VOLUME_DISTANCE = 3
const SILENT_DISTANCE = 15
const VOLUME_UPDATE_MS = 120
const VOICE_HEARTBEAT_MS = 10_000

interface VoicePeer {
  connection: RTCPeerConnection
  audio: HTMLAudioElement
  pendingIce: RTCIceCandidateInit[]
  makingOffer: boolean
}

interface VoiceSignal {
  from: string
  kind: "offer" | "answer" | "ice"
  description?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

export interface VoiceControls {
  enabled: boolean
  configured: boolean
  busy: boolean
  peerCount: number
  error: string
  devices: { deviceId: string; label: string }[]
  selectedDeviceId: string
  configure: (deviceId?: string) => void
  toggle: () => void
}

interface Options {
  roomRef: React.MutableRefObject<Room | null>
  me: string
  snapshot: Snapshot
  poseRef: React.MutableRefObject<{ x: number; z: number; dir: number }>
}

function volumeAt(distance: number) {
  if (distance <= FULL_VOLUME_DISTANCE) return 1
  if (distance >= SILENT_DISTANCE) return 0
  const linear = 1 - (distance - FULL_VOLUME_DISTANCE) / (SILENT_DISTANCE - FULL_VOLUME_DISTANCE)
  return linear * linear * (3 - 2 * linear)
}

export function useProximityVoice({ roomRef, me, snapshot, poseRef }: Options): VoiceControls {
  const [enabled, setEnabled] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState(false)
  const [peerCount, setPeerCount] = useState(0)
  const [error, setError] = useState("")
  const [devices, setDevices] = useState<VoiceControls["devices"]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState("")
  const streamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef(new Map<string, VoicePeer>())
  const enabledRef = useRef(false)
  const mutedRef = useRef(false)
  const busyRef = useRef(false)
  const requestVersion = useRef(0)
  const mounted = useRef(false)
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot

  const reportMicrophone = useCallback((ready: boolean) => {
    try { roomRef.current?.send("microphone:status" as never, { ready } as never) } catch { /* A reconexão confirma novamente. */ }
  }, [roomRef])

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const available = await navigator.mediaDevices.enumerateDevices()
      if (!mounted.current || !streamRef.current) return
      setDevices(available.filter((device) => device.kind === "audioinput" && device.deviceId)
        .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Microfone ${index + 1}` })))
    } catch { /* A captura pode funcionar mesmo sem a lista de dispositivos. */ }
  }, [])

  const sendSignal = useCallback(
    (to: string, payload: Omit<VoiceSignal, "from">) => {
      roomRef.current?.send("voice:signal" as never, { to, ...payload } as never)
    },
    [roomRef],
  )

  const removePeer = useCallback((id: string) => {
    const peer = peersRef.current.get(id)
    if (!peer) return
    peer.connection.onicecandidate = null
    peer.connection.ontrack = null
    peer.connection.onconnectionstatechange = null
    peer.connection.close()
    peer.audio.pause()
    peer.audio.srcObject = null
    peer.audio.remove()
    peersRef.current.delete(id)
    setPeerCount(peersRef.current.size)
  }, [])

  const ensurePeer = useCallback(
    (id: string) => {
      const existing = peersRef.current.get(id)
      if (existing) return existing
      const stream = streamRef.current
      if (!stream || id === me) return null

      const connection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      })
      const audio = document.createElement("audio")
      audio.autoplay = true
      audio.setAttribute("playsinline", "")
      audio.volume = 0
      audio.dataset.voicePeer = id
      audio.style.display = "none"
      document.body.appendChild(audio)

      const peer: VoicePeer = { connection, audio, pendingIce: [], makingOffer: false }
      peersRef.current.set(id, peer)
      setPeerCount(peersRef.current.size)

      for (const track of stream.getAudioTracks()) connection.addTrack(track, stream)
      connection.onicecandidate = (event) => {
        if (!event.candidate) return
        sendSignal(id, { kind: "ice", candidate: event.candidate.toJSON() })
      }
      connection.ontrack = (event) => {
        const remote = event.streams[0] ?? new MediaStream([event.track])
        if (audio.srcObject !== remote) audio.srcObject = remote
        void audio.play().catch(() => {
          // O clique que liga o microfone normalmente libera o autoplay. Se o
          // navegador ainda segurar, a próxima interação tenta novamente.
        })
      }
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === "failed" || connection.connectionState === "closed") removePeer(id)
      }
      return peer
    },
    [me, removePeer, sendSignal],
  )

  const makeOffer = useCallback(
    async (id: string) => {
      const peer = ensurePeer(id)
      if (
        !peer ||
        peer.makingOffer ||
        peer.connection.signalingState !== "stable" ||
        peer.connection.localDescription ||
        peer.connection.remoteDescription
      )
        return
      peer.makingOffer = true
      try {
        const offer = await peer.connection.createOffer()
        await peer.connection.setLocalDescription(offer)
        if (offer.sdp) {
          sendSignal(id, { kind: "offer", description: { type: "offer", sdp: offer.sdp } })
        }
      } catch {
        removePeer(id)
      } finally {
        peer.makingOffer = false
      }
    },
    [ensurePeer, removePeer, sendSignal],
  )

  const stop = useCallback(
    (notify = true) => {
      requestVersion.current++
      busyRef.current = false
      enabledRef.current = false
      if (notify) {
        reportMicrophone(false)
        try { roomRef.current?.send("voice:leave" as never) } catch { /* A sala já pode ter sido encerrada. */ }
      }
      for (const id of [...peersRef.current.keys()]) removePeer(id)
      streamRef.current?.getTracks().forEach((track) => { track.onended = null; track.stop() })
      streamRef.current = null
      setEnabled(false)
      setConfigured(false)
      setBusy(false)
      setPeerCount(0)
    },
    [removePeer, reportMicrophone, roomRef],
  )

  useEffect(() => {
    const room = roomRef.current
    if (!room) return

    const connectKnownPeer = (id: string) => {
      if (!enabledRef.current || !id || id === me) return
      ensurePeer(id)
      // Uma regra estável escolhe exatamente um lado para criar a oferta e
      // impede as duas abas de negociarem ao mesmo tempo.
      if (me.localeCompare(id) < 0) void makeOffer(id)
    }
    const offPeers = room.onMessage("voice:peers", (payload: { peers?: string[] }) => {
      for (const id of payload?.peers ?? []) connectKnownPeer(id)
    })
    const offJoined = room.onMessage("voice:peer-joined", (payload: { id?: string }) => {
      if (payload?.id) connectKnownPeer(payload.id)
    })
    const offLeft = room.onMessage("voice:peer-left", (payload: { id?: string }) => {
      if (payload?.id) removePeer(payload.id)
    })
    const offSignal = room.onMessage("voice:signal", (payload: VoiceSignal) => {
      if (!enabledRef.current || !payload?.from || payload.from === me) return
      void (async () => {
        const peer = ensurePeer(payload.from)
        if (!peer) return
        try {
          if ((payload.kind === "offer" || payload.kind === "answer") && payload.description) {
            await peer.connection.setRemoteDescription(payload.description)
            for (const candidate of peer.pendingIce.splice(0)) {
              await peer.connection.addIceCandidate(candidate)
            }
            if (payload.kind === "offer") {
              const answer = await peer.connection.createAnswer()
              await peer.connection.setLocalDescription(answer)
              if (answer.sdp) {
                sendSignal(payload.from, {
                  kind: "answer",
                  description: { type: "answer", sdp: answer.sdp },
                })
              }
            }
            return
          }
          if (payload.kind === "ice" && payload.candidate) {
            if (peer.connection.remoteDescription) await peer.connection.addIceCandidate(payload.candidate)
            else peer.pendingIce.push(payload.candidate)
          }
        } catch {
          removePeer(payload.from)
        }
      })()
    })

    return () => {
      offPeers()
      offJoined()
      offLeft()
      offSignal()
    }
  }, [ensurePeer, makeOffer, me, removePeer, roomRef, sendSignal])

  useEffect(() => {
    if (!configured) return
    const updateVolumes = () => {
      const current = snapshotRef.current
      const roomState = roomRef.current?.state as any
      const localPlayer = roomState?.players?.get?.(me)
      const localAlive = Boolean(localPlayer?.alive)
      const everyone =
        current.phase === "lobby" ||
        current.phase === "reuniao" ||
        current.phase === "votacao" ||
        current.phase === "fim"

      for (const [id, peer] of peersRef.current) {
        const remote = roomState?.players?.get?.(id)
        let volume = 0
        if (remote && remote.connected !== false && Boolean(remote.alive) === localAlive) {
          if (everyone) volume = 1
          else if (!remote.inVent && !localPlayer?.inVent && Number(remote.level ?? 0) === Number(localPlayer?.level ?? 0)) {
            volume = volumeAt(Math.hypot(Number(remote.x) - poseRef.current.x, Number(remote.z) - poseRef.current.z))
          }
        }
        peer.audio.volume += (volume - peer.audio.volume) * 0.45
        if (peer.audio.paused && volume > 0.01) void peer.audio.play().catch(() => undefined)
      }
    }
    updateVolumes()
    const volumeTimer = window.setInterval(updateVolumes, VOLUME_UPDATE_MS)
    const heartbeat = window.setInterval(() => {
      if (!streamRef.current?.getAudioTracks().some((track) => track.readyState === "live")) {
        setError("O microfone foi desconectado. Configure novamente para marcar pronto.")
        stop(true)
        return
      }
      reportMicrophone(true)
      roomRef.current?.send("voice:join" as never)
    }, VOICE_HEARTBEAT_MS)
    return () => {
      window.clearInterval(volumeTimer)
      window.clearInterval(heartbeat)
    }
  }, [configured, me, poseRef, reportMicrophone, roomRef, stop])

  useEffect(() => {
    mounted.current = true
    const onDeviceChange = () => { void refreshDevices() }
    navigator.mediaDevices?.addEventListener("devicechange", onDeviceChange)
    let permission: PermissionStatus | undefined
    let observing = true
    const onPermissionChange = () => {
      if (permission?.state !== "denied") return
      setError("O acesso ao microfone foi bloqueado. Permita nas configurações do site e tente novamente.")
      stop(true)
    }
    void navigator.permissions?.query({ name: "microphone" as PermissionName }).then((status) => {
      if (!observing) return
      permission = status
      status.addEventListener("change", onPermissionChange)
    }).catch(() => undefined)
    return () => {
      observing = false
      mounted.current = false
      navigator.mediaDevices?.removeEventListener("devicechange", onDeviceChange)
      permission?.removeEventListener("change", onPermissionChange)
      stop(true)
    }
  }, [refreshDevices, stop])

  const configure = useCallback((deviceId?: string) => {
    if (busyRef.current || !mounted.current) return
    busyRef.current = true
    const version = ++requestVersion.current
    setBusy(true)
    setError("")
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
          throw new Error("Seu navegador não oferece áudio WebRTC.")
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          },
          video: false,
        })
        if (!mounted.current || version !== requestVersion.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        const audioTrack = stream.getAudioTracks().find((track) => track.readyState === "live")
        if (!audioTrack) {
          stream.getTracks().forEach((track) => track.stop())
          throw new Error("Nenhum microfone ativo foi encontrado. Conecte um microfone e tente novamente.")
        }
        const previous = streamRef.current
        streamRef.current = stream
        for (const track of stream.getAudioTracks()) {
          track.enabled = !mutedRef.current
          track.onended = () => {
            if (streamRef.current !== stream) return
            setError("O microfone foi desconectado. Configure novamente para marcar pronto.")
            stop(true)
          }
        }
        for (const [id, peer] of peersRef.current) {
          const sender = peer.connection.getSenders().find((candidate) => candidate.track?.kind === "audio")
          if (sender) void sender.replaceTrack(audioTrack).catch(() => {
            if (peersRef.current.get(id) === peer) removePeer(id)
          })
        }
        previous?.getTracks().forEach((track) => { track.onended = null; track.stop() })
        enabledRef.current = true
        setConfigured(true)
        setEnabled(!mutedRef.current)
        setSelectedDeviceId(audioTrack.getSettings().deviceId || deviceId || "")
        reportMicrophone(true)
        roomRef.current?.send("voice:join" as never)
        void refreshDevices()
      } catch (problem) {
        if (!mounted.current || version !== requestVersion.current) return
        const name = problem instanceof DOMException ? problem.name : ""
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Permita o microfone nas configurações do site no navegador e tente novamente para marcar pronto."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "Microfone não encontrado. Conecte um dispositivo ou escolha outro microfone."
              : name === "NotReadableError" || name === "AbortError"
                ? "Não foi possível acessar o microfone. Confira se outro aplicativo está usando o dispositivo."
                : problem instanceof Error ? problem.message : "Não foi possível ligar o microfone.",
        )
        if (!streamRef.current?.getAudioTracks().some((track) => track.readyState === "live")) stop(true)
      } finally {
        if (mounted.current && version === requestVersion.current) {
          busyRef.current = false
          setBusy(false)
        }
      }
    })()
  }, [refreshDevices, removePeer, reportMicrophone, roomRef, stop])

  const toggle = useCallback(() => {
    if (busyRef.current) return
    const tracks = streamRef.current?.getAudioTracks().filter((track) => track.readyState === "live")
    if (!tracks?.length) { configure(); return }
    mutedRef.current = !mutedRef.current
    tracks.forEach((track) => { track.enabled = !mutedRef.current })
    setEnabled(!mutedRef.current)
  }, [configure])

  return { enabled, configured, busy, peerCount, error, devices, selectedDeviceId, configure, toggle }
}
