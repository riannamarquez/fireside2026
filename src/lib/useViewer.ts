// Which side of Postscript the current member is on. The storyteller (Ama) gets full-screen
// steps with big labeled buttons; everyone else (the family) gets bottom sheets for details.
// Screens ask here instead of checking roles themselves.
import { useEffect, useState } from 'react'
import { getViewer, type Viewer } from '../api'

export function useViewer(): Viewer | null {
  const [viewer, setViewer] = useState<Viewer | null>(null)
  useEffect(() => {
    let alive = true
    getViewer()
      .then((v) => alive && setViewer(v))
      .catch((err) => console.error(err))
    return () => {
      alive = false
    }
  }, [])
  return viewer
}

// null while loading, so a screen can wait instead of flashing the wrong version.
export function useIsStoryteller(): boolean | null {
  const viewer = useViewer()
  return viewer ? viewer.isStoryteller : null
}
