import type { Espace, Post } from './atlas'
import type { Dorsale, Lot } from './dorsale'

/* ---------------------------------------------------------------
   Un faux nuage, dans une seconde base du navigateur.

   Il n'a aucune vocation à servir en vrai : il existe pour que la
   boucle de synchronisation soit PROUVÉE avant qu'un serveur entre
   en jeu. On peut y vider la base locale et tout récupérer, écraser
   une version périmée, propager une suppression — exactement ce
   qu'on demandera à Supabase.

   Il sert aussi de repli utile : deux onglets du même navigateur
   se synchronisent réellement à travers lui.
   --------------------------------------------------------------- */

const NOM = 'atlas-nuage'

let ouverture: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (ouverture) return ouverture
  ouverture = new Promise((resolve, reject) => {
    const req = indexedDB.open(NOM, 1)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('posts')) d.createObjectStore('posts', { keyPath: 'id' })
      if (!d.objectStoreNames.contains('espaces')) d.createObjectStore('espaces', { keyPath: 'id' })
      if (!d.objectStoreNames.contains('images')) d.createObjectStore('images')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return ouverture
}

function agir<T>(
  magasin: string,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return open().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(magasin, mode)
        const r = action(t.objectStore(magasin))
        r.onsuccess = () => resolve(r.result as T)
        r.onerror = () => reject(r.error)
      }),
  )
}

/** Ce que le serveur ajoute à chaque ligne : son propriétaire. */
type Possede = { proprietaire: string }

export class DorsaleLocale implements Dorsale {
  readonly nom = 'Nuage local (test)'

  /* Les données appartiennent à quelqu'un. Le cloisonnement reproduit ici
     ce que fera la sécurité au niveau des lignes côté serveur : deux
     comptes du même navigateur ne voient jamais le contenu de l'autre. */
  constructor(private readonly proprietaire: string) {}

  private aMoi = <T extends { updatedAt: number }>(r: T & Partial<Possede>) =>
    r.proprietaire === this.proprietaire

  async tirer(depuis: number): Promise<Lot & { horloge: number }> {
    const posts = (await agir<(Post & Possede)[]>('posts', 'readonly', (s) => s.getAll())).filter(
      (p) => this.aMoi(p) && p.updatedAt > depuis,
    )
    const espaces = (
      await agir<(Espace & Possede)[]>('espaces', 'readonly', (s) => s.getAll())
    ).filter((e) => this.aMoi(e) && e.updatedAt > depuis)
    return { posts, espaces, horloge: Date.now() }
  }

  /* Le serveur REFUSE une version plus ancienne que celle qu'il détient.
     C'est sa seule règle, et elle est indispensable : sans elle, un client
     qui a raté un tour de synchro peut écraser une suppression et
     ressusciter le contenu. Le vrai serveur devra la tenir aussi. */
  async pousser(lot: Lot): Promise<void> {
    const deposer = async (magasin: 'posts' | 'espaces', r: Post | Espace) => {
      const detenu = await agir<({ updatedAt?: number } & Partial<Possede>) | undefined>(
        magasin,
        'readonly',
        (s) => s.get(r.id),
      )
      // une ligne appartenant à quelqu'un d'autre n'est jamais touchée
      if (detenu && detenu.proprietaire !== this.proprietaire) return
      if (detenu && (detenu.updatedAt ?? 0) > r.updatedAt) return
      // `sale` est une notion purement locale : elle ne quitte jamais l'appareil.
      await agir(magasin, 'readwrite', (s) =>
        s.put({ ...r, sale: false, proprietaire: this.proprietaire }),
      )
    }
    for (const p of lot.posts) await deposer('posts', p)
    for (const e of lot.espaces) await deposer('espaces', e)
  }

  private cleImage = (id: string) => `${this.proprietaire}/${id}`

  async envoyerImage(id: string, blob: Blob): Promise<void> {
    const cle = this.cleImage(id)
    const deja = await agir<Blob | undefined>('images', 'readonly', (s) => s.get(cle))
    if (deja) return
    await agir('images', 'readwrite', (s) => s.put(blob, cle))
  }

  async recupererImage(id: string): Promise<Blob | null> {
    return (
      (await agir<Blob | undefined>('images', 'readonly', (s) => s.get(this.cleImage(id)))) ?? null
    )
  }

  /** Efface le faux nuage — utile pour repartir d'une page blanche en test. */
  async vider(): Promise<void> {
    for (const m of ['posts', 'espaces', 'images']) {
      await agir(m, 'readwrite', (s) => s.clear())
    }
  }
}
