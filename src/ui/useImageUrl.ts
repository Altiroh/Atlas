import { useEffect, useState } from 'react'
import { urlImage } from '../store/db'

/** Résout l'URL d'affichage d'une image stockée localement. */
export function useImageUrl(imageId: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imageId) {
      setUrl(null)
      return
    }
    let vivant = true
    void urlImage(imageId).then((u) => {
      if (vivant) setUrl(u)
    })
    return () => {
      vivant = false
    }
  }, [imageId])

  return url
}
