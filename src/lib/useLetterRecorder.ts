// Records a letter piece: MediaRecorder for the audio, plus the browser's speech recognition
// (Chrome/Edge/Safari) for the transcript, so it works without the backend. Where speech
// recognition isn't available the transcript is empty and the storyteller can type it.
import { useCallback, useEffect, useRef, useState } from 'react'

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

function makeRecognition(): Recognition | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export const speechSupported = () => makeRecognition() !== null

export type Recording = { blob: Blob; transcript: string; seconds: number }

export function useLetterRecorder(lang: string) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<Recognition | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const finalRef = useRef('')
  const activeRef = useRef(false)
  const startedRef = useRef(0)
  // Latest text including interim words, for stop(), in case the last words never became final.
  const liveRef = useRef('')

  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => setElapsed((Date.now() - startedRef.current) / 1000), 250)
    return () => window.clearInterval(id)
  }, [recording])

  const teardown = useCallback(() => {
    activeRef.current = false
    recognitionRef.current?.abort()
    recognitionRef.current = null
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop())
  }, [])

  // Release the mic if the screen goes away mid-recording.
  useEffect(() => teardown, [teardown])

  const start = useCallback(async () => {
    setError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError(
        window.isSecureContext
          ? 'We couldn’t reach your microphone. Please allow microphone access and try again.'
          : 'The microphone only works over HTTPS. Open this page with https://',
      )
      return
    }
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.start()
    recorderRef.current = recorder

    finalRef.current = ''
    liveRef.current = ''
    setLiveTranscript('')
    activeRef.current = true
    const listen = () => {
      const recognition = makeRecognition()
      if (!recognition) return
      recognition.lang = lang
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]!
          if (r.isFinal) finalRef.current += `${r[0].transcript.trim()} `
          else interim += r[0].transcript
        }
        liveRef.current = `${finalRef.current}${interim}`.trim()
        setLiveTranscript(liveRef.current)
      }
      // Chrome stops listening after a pause; keep going while we're recording.
      recognition.onend = () => {
        if (activeRef.current) listen()
      }
      recognition.onerror = () => {}
      try {
        recognition.start()
        recognitionRef.current = recognition
      } catch {
        // Already started or not allowed: record audio only.
      }
    }
    listen()

    startedRef.current = Date.now()
    setElapsed(0)
    setRecording(true)
  }, [lang])

  const stop = useCallback((): Promise<Recording | null> => {
    const recorder = recorderRef.current
    if (!recorder) return Promise.resolve(null)
    const seconds = (Date.now() - startedRef.current) / 1000
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        // Give the recognizer a moment to deliver its last words.
        window.setTimeout(() => {
          teardown()
          resolve({ blob, transcript: finalRef.current.trim() || liveRef.current, seconds })
        }, 400)
      }
      recorder.stop()
      recorderRef.current = null
      setRecording(false)
    })
  }, [teardown])

  // "Forget this" while recording: stop and throw the audio away.
  const forget = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder) {
      recorder.onstop = null
      recorder.ondataavailable = null
      if (recorder.state !== 'inactive') recorder.stop()
    }
    recorderRef.current = null
    chunksRef.current = []
    finalRef.current = ''
    teardown()
    setRecording(false)
    setElapsed(0)
    setLiveTranscript('')
  }, [teardown])

  return { recording, elapsed, liveTranscript, error, start, stop, forget }
}
