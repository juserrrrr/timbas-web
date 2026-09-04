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
  busy: boolean
  peerCount: number
  error: string
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
  const [busy, setBusy] = useState(false)
  const [peerCount, setPeerCount] = useState(0)
  const [error, setError] = useState("")
  const streamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef(new Map<string, VoicePeer>())
  const enabledRef = useRef(false)
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot

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
      enabledRef.current = false
      if (notify) roomRef.current?.send("voice:leave" as never)
      for (const id of [...peersRef.current.keys()]) removePeer(id)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setEnabled(false)
      setBusy(false)
      setPeerCount(0)
    },
    [removePeer, roomRef],
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
    if (!enabled) return
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
    const heartbeat = window.setInterval(() => roomRef.current?.send("voice:join" as never), VOICE_HEARTBEAT_MS)
    return () => {
      window.clearInterval(volumeTimer)
      window.clearInterval(heartbeat)
    }
  }, [enabled, me, poseRef, roomRef])

  useEffect(() => () => stop(true), [stop])

  const toggle = useCallback(() => {
    if (busy) return
    if (enabledRef.current) {
      stop(true)
      return
    }
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
          },
          video: false,
        })
        streamRef.current = stream
        enabledRef.current = true
        setEnabled(true)
        roomRef.current?.send("voice:join" as never)
      } catch (problem) {
        const denied = problem instanceof DOMException && problem.name === "NotAllowedError"
        setError(
          denied
            ? "Permita o microfone no navegador para usar o áudio."
            : problem instanceof Error
              ? problem.message
              : "Não foi possível ligar o microfone.",
        )
        stop(false)
      } finally {
        setBusy(false)
      }
    })()
  }, [busy, roomRef, stop])

  return { enabled, busy, peerCount, error, toggle }
}
