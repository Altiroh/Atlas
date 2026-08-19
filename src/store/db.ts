/* ---------------------------------------------------------------
   Persistance locale — IndexedDB.

   Pourquoi pas localStorage : les images. Un seul cliché encodé en
   texte suffirait à saturer le quota de 5 Mo. IndexedDB stocke les
   binaires tels quels et n'a pas cette limite.

   C'est aussi le socle du jalon 3 : la synchronisation lira et
   écrira dans ces mêmes magasins, sans migration.
   --------------------------------------------------------------- */

const NOM = 'atlas'
const VERSION = 1

export type Magasin = 'posts' | 'espaces' | 'images'

let ouverture: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (ouverture) return ouverture
  ouverture = new Promise((resolve, reject) => {
    const req = indexedDB.open(NOM, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('posts')) db.createObjectStore('posts', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('espaces')) db.createObjectStore('espaces', { keyPath: 'id' })
      // les images sont des Blob bruts, indexés par identifiant
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return ouverture
}

function tx<T>(magasin: Magasin, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(magasin, mode)
        const req = action(t.objectStore(magasin))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const db = {
  tout: <T>(magasin: Magasin) => tx<T[]>(magasin, 'readonly', (s) => s.getAll()),

  poser: <T>(magasin: Magasin, valeur: T, cle?: IDBValidKey) =>
    tx<IDBValidKey>(magasin, 'readwrite', (s) => (cle === undefined ? s.put(valeur) : s.put(valeur, cle))),

  lire: <T>(magasin: Magasin, cle: IDBValidKey) => tx<T>(magasin, 'readonly', (s) => s.get(cle)),

  effacer: (magasin: Magasin, cle: IDBValidKey) =>
    tx<undefined>(magasin, 'readwrite', (s) => s.delete(cle)),

  /** Vide tout le contenu local. Utilisé au changement de compte. */
  vider: async () => {
    for (const m of ['posts', 'espaces', 'images'] as Magasin[]) {
      await tx<undefined>(m, 'readwrite', (s) => s.clear())
    }
  },
}

/* ---------------------------------------------------------------
   Images
   --------------------------------------------------------------- */

/** Réduit un fichier avant stockage : au-delà, on paie de la place pour rien. */
const COTE_MAX = 1600
const QUALITE = 0.82

export async function preparerImage(fichier: File): Promise<Blob> {
  const bitmap = await createImageBitmap(fichier)
  const facteur = Math.min(1, COTE_MAX / Math.max(bitmap.width, bitmap.height))

  if (facteur === 1 && fichier.size < 400_000) {
    bitmap.close()
    return fichier
  }

  const largeur = Math.round(bitmap.width * facteur)
  const hauteur = Math.round(bitmap.height * facteur)
  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, largeur, hauteur)
  bitmap.close()

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ?? fichier), 'image/webp', QUALITE)
  })
}

/* ---------------------------------------------------------------
   Le registre des tailles.

   Connaître la place occupée sans relire tous les fichiers : une
   somme sur les blobs obligerait à les charger tous en mémoire, ce
   qui coûterait de plus en plus cher à mesure que la base grandit.
   On tient donc un registre, mis à jour à chaque dépôt et à chaque
   retrait. Lire l'occupation devient instantané.
   --------------------------------------------------------------- */

const REGISTRE = 'atlas.images.tailles'

function lireRegistre(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(REGISTRE) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function ecrireRegistre(r: Record<string, number>) {
  try {
    localStorage.setItem(REGISTRE, JSON.stringify(r))
  } catch {
    /* sans importance : au pire l'occupation est sous-estimée */
  }
}

/** Place occupée par les images, en octets. */
export function octetsImages(): number {
  return Object.values(lireRegistre()).reduce((n, v) => n + v, 0)
}

export function nombreImages(): number {
  return Object.keys(lireRegistre()).length
}

export async function stockerImage(fichier: File): Promise<string> {
  const id = `img${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  const blob = await preparerImage(fichier)
  await db.poser('images', blob, id)
  ecrireRegistre({ ...lireRegistre(), [id]: blob.size })
  return id
}

/** Recompte à partir des fichiers réels — pour rattraper un registre perdu. */
export async function refaireRegistre(): Promise<void> {
  const cles = await tx<IDBValidKey[]>('images', 'readonly', (s) => s.getAllKeys())
  const blobs = await db.tout<Blob>('images')
  const r: Record<string, number> = {}
  cles.forEach((c, i) => {
    if (blobs[i]) r[String(c)] = blobs[i].size
  })
  ecrireRegistre(r)
}

/* Les URL d'objet sont conservées pour la session : les recréer à chaque
   rendu ferait clignoter les images et fuir de la mémoire. */
const urls = new Map<string, string>()

export async function urlImage(id: string): Promise<string | null> {
  const connue = urls.get(id)
  if (connue) return connue
  const blob = await db.lire<Blob>('images', id)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urls.set(id, url)
  return url
}

export function oublierImage(id: string) {
  const url = urls.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urls.delete(id)
  }
  void db.effacer('images', id)
  const r = lireRegistre()
  delete r[id]
  ecrireRegistre(r)
}
