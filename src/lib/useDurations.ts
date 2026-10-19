// Total length of several recordings, read from their metadata (for the letter details sheet).
import { useEffect, useState } from 'react'

export function useTotalDuration(urls: string[]): number | null {
  const key = urls.join('\n')
  const [total, setTotal] = useState<number | null>(null)
  useEffect(() => {
    const list = key ? key.split('\n') : []
    if (!list.length) return
    let alive = true
    Promise.all(
      list.map(
        (src) =>
          new Promise<number>((resolve) => {
            const audio = new Audio()
            audio.preload = 'metadata'
            audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0)
            audio.onerror = () => resolve(0)
            audio.src = src
          }),
      ),
    ).then((lengths) => alive && setTotal(lengths.reduce((a, b) => a + b, 0) || null))
    return () => {
      alive = false
    }
  }, [key])
  return total
}
