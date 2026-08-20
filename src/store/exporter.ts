import { db } from './db'
import type { Espace, Noeud, Post } from './atlas'
import { versMarkdown } from './blocs'
import { imagesDuPost, type Colonne, type Evenement, type Forme, type Ligne } from './formes'

/* ---------------------------------------------------------------
   Export — l'assurance-vie du projet (D2).

   Puisque les données vivront chez un hébergeur tiers, il faut
   pouvoir tout récupérer à tout moment, dans un format lisible sans
   Atlas. On produit une archive .zip contenant :

     atlas.md     tout le contenu en markdown, groupé par espace
     atlas.json   la même chose en fidélité totale (pour réimporter)
     images/…     les fichiers d'origine

   Le .zip est écrit à la main, sans dépendance : les images sont
   déjà compressées (WebP), donc on stocke sans recompresser.
   --------------------------------------------------------------- */

/* ================= écriture ZIP ================= */

const TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  TABLE[n] = c >>> 0
}

function crc32(data: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

type Entree = { nom: string; data: Uint8Array }

export function zipper(entrees: Entree[]): Blob {
  const enc = new TextEncoder()
  const locaux: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const e of entrees) {
    const nom = enc.encode(e.nom)
    const crc = crc32(e.data)

    const entete = new Uint8Array(30 + nom.length)
    const v = new DataView(entete.buffer)
    v.setUint32(0, 0x04034b50, true)
    v.setUint16(4, 20, true) // version minimale
    v.setUint16(6, 0x0800, true) // noms de fichiers en UTF-8
    v.setUint16(8, 0, true) // méthode 0 : stocké, sans compression
    v.setUint32(14, crc, true)
    v.setUint32(18, e.data.length, true)
    v.setUint32(22, e.data.length, true)
    v.setUint16(26, nom.length, true)
    entete.set(nom, 30)

    locaux.push(entete, e.data)

    const cd = new Uint8Array(46 + nom.length)
    const c = new DataView(cd.buffer)
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true)
    c.setUint16(6, 20, true)
    c.setUint16(8, 0x0800, true)
    c.setUint16(10, 0, true)
    c.setUint32(16, crc, true)
    c.setUint32(20, e.data.length, true)
    c.setUint32(24, e.data.length, true)
    c.setUint16(28, nom.length, true)
    c.setUint32(42, offset, true)
    cd.set(nom, 46)
    central.push(cd)

    offset += entete.length + e.data.length
  }

  const tailleCentral = central.reduce((n, c) => n + c.length, 0)
  const fin = new Uint8Array(22)
  const f = new DataView(fin.buffer)
  f.setUint32(0, 0x06054b50, true)
  f.setUint16(8, entrees.length, true)
  f.setUint16(10, entrees.length, true)
  f.setUint32(12, tailleCentral, true)
  f.setUint32(16, offset, true)

  // TypeScript distingue depuis peu Uint8Array<ArrayBuffer> et <ArrayBufferLike> ;
  // Blob accepte les deux, la conversion n'a pas d'effet à l'exécution.
  const morceaux = [...locaux, ...central, fin] as unknown as BlobPart[]
  return new Blob(morceaux, { type: 'application/zip' })
}

/* ================= markdown ================= */

function dateLisible(ts: number) {
  return new Date(ts).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** La carte devient une liste à puces indentée : lisible partout. */
function carteEnListe(noeuds: Noeud[]): string {
  const lignes: string[] = []
  const enfants = (parent: string | null) =>
    noeuds.filter((n) => n.parentId === parent).sort((a, b) => a.y - b.y)

  const descendre = (n: Noeud, niveau: number) => {
    lignes.push(`${'  '.repeat(niveau)}- ${n.texte || 'Sans titre'}`)
    enfants(n.id).forEach((e) => descendre(e, niveau + 1))
  }

  enfants(null).forEach((r) => descendre(r, 0))
  return lignes.join('\n')
}

/** Le lien markdown d'une image, avec l'extension réelle du fichier. */
function lienImage(id: string, extensions: Map<string, string>, texte = '') {
  return `![${texte}](images/${id}.${extensions.get(id) ?? 'bin'})`
}

/**
 * La frise devient une liste, du premier au dernier.
 *
 * Les pistes disparaissent : le markdown ne sait pas mettre deux fils
 * côte à côte, et une piste rendue en colonne serait moins lisible que
 * pas de piste du tout. On garde hors d'Atlas ce qui compte — l'ordre
 * et ce qui est dit — et `atlas.json` conserve le reste au complet.
 */
function friseEnListe(evenements: Evenement[]): string {
  return [...evenements]
    .sort((a, b) => a.ordre - b.ordre)
    .map((e) => {
      const tete = [e.quand?.trim(), e.titre.trim() || 'Sans titre'].filter(Boolean).join(' — ')
      const note = e.note?.trim() ? `\n  ${e.note.trim().replace(/\n/g, '\n  ')}` : ''
      return `- ${tete}${note}`
    })
    .join('\n')
}

/** La table devient un vrai tableau markdown — lisible dans n'importe quel éditeur. */
function tableEnMarkdown(
  colonnes: Colonne[],
  lignes: Ligne[],
  extensions: Map<string, string>,
): string {
  if (!colonnes.length) return ''
  const cellule = (l: Ligne, c: Colonne) => {
    const v = l.cellules[c.id] ?? ''
    if (c.type === 'case') return v === 'oui' ? 'x' : ''
    if (c.type === 'image') return v ? lienImage(v, extensions) : ''
    // une barre verticale dans une cellule casserait la table entière
    return v.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  }
  return [
    `| ${colonnes.map((c) => c.nom || '—').join(' | ')} |`,
    `|${' --- |'.repeat(colonnes.length)}`,
    ...lignes.map((l) => `| ${colonnes.map((c) => cellule(l, c)).join(' | ')} |`),
  ].join('\n')
}

/**
 * Le contenu d'une forme, sans son nom.
 *
 * Une forme absente de ce `switch` s'exporte VIDE, en silence. C'est
 * la raison d'être du `default` explicite plus bas : le compilateur ne
 * dira rien, alors autant que le prochain à passer ici le lise.
 */
function formeEnMarkdown(f: Forme, extensions: Map<string, string>): string {
  switch (f.t) {
    case 'texte':
      return f.blocs?.length ? versMarkdown(f.blocs, extensions) : ''
    case 'carte':
      return f.carte?.length ? carteEnListe(f.carte) : ''
    case 'dessin':
      // un tracé vectoriel n'a pas d'équivalent markdown : il reste
      // intact dans atlas.json, et on le signale plutôt que de mentir
      return f.dessin?.length
        ? `*(dessin — ${f.dessin.length} traits, conservés dans atlas.json)*`
        : ''
    case 'planche': {
      // le placement libre ne se dit pas davantage : on remet à la
      // suite, du fond vers le premier plan
      const pieces = [...(f.planche ?? [])].sort((a, b) => a.z - b.z)
      return pieces
        .map((p) => (p.imageId ? lienImage(p.imageId, extensions, p.texte ?? '') : `**${p.texte ?? ''}**`))
        .filter((l) => l !== '****')
        .join('\n\n')
    }
    case 'frise':
      return f.frise?.length ? friseEnListe(f.frise) : ''
    case 'table':
      return f.lignes?.length ? tableEnMarkdown(f.colonnes ?? [], f.lignes, extensions) : ''
    default:
      return ''
  }
}

function postEnMarkdown(post: Post, extensions: Map<string, string>) {
  const bouts: string[] = []
  bouts.push(`### ${post.titre.trim() || 'Sans titre'}`)
  bouts.push(`*${dateLisible(post.createdAt)}${post.etat === 'archivee' ? ' · archivé' : ''}*`)
  if (post.coverId) {
    bouts.push(`![](images/${post.coverId}.${extensions.get(post.coverId) ?? 'bin'})`)
  }
  /* CHAQUE FORME EST UNE SECTION, sous son propre nom. Une note à trois
     cartes doit se relire telle qu'elle a été écrite : c'est tout
     l'intérêt de les avoir nommées. Le titre de section n'apparaît que
     s'il y a plus d'une forme — sur une note ordinaire, un intertitre
     « Fiche » serait du bruit. */
  if (post.formes?.length) {
    const plusieurs = post.formes.length > 1
    for (const f of post.formes) {
      const md = formeEnMarkdown(f, extensions)
      if (!md.trim()) continue
      if (plusieurs) bouts.push(`**${f.nom}**`)
      bouts.push(md)
    }
  } else {
    // notes d'avant les formes, non encore reprises
    if (post.blocs?.length) {
      const md = versMarkdown(post.blocs, extensions)
      if (md.trim()) bouts.push(md)
    } else if (post.texte.trim()) {
      bouts.push(post.texte.trim())
    }
    if (post.dessin?.length) {
      bouts.push(`*(dessin — ${post.dessin.length} traits, conservés dans atlas.json)*`)
    }
    if (post.carte?.length) {
      bouts.push('**Carte**\n')
      bouts.push(carteEnListe(post.carte))
    }
  }
  return bouts.join('\n\n')
}

/* ================= assemblage ================= */

export type Bilan = { fichier: string; posts: number; images: number; octets: number }

export async function construireArchive(posts: Post[], espaces: Espace[]): Promise<Bilan & { blob: Blob }> {
  const enc = new TextEncoder()
  const entrees: Entree[] = []
  const extensions = new Map<string, string>()

  // On ne récupère que les images réellement référencées : les orphelines
  // ne méritent pas de place dans la sauvegarde.
  const ids = [
    // couverture, fiches, planches, colonnes visuelles : `imagesDuPost`
    // est le seul endroit qui sait où une note range ses images
    ...posts.flatMap(imagesDuPost),
    ...espaces.map((e) => e.imageId),
  ].filter((v): v is string => Boolean(v))

  for (const id of ids) {
    const blob = await db.lire<Blob>('images', id)
    if (!blob) continue
    const ext = blob.type.split('/')[1] ?? 'bin'
    extensions.set(id, ext)
    entrees.push({ nom: `images/${id}.${ext}`, data: new Uint8Array(await blob.arrayBuffer()) })
  }

  const parEspace = (idEspace: string | null) =>
    posts
      .filter((p) => p.espaceId === idEspace)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((p) => postEnMarkdown(p, extensions))

  const sections: string[] = [
    `# Atlas — export du ${dateLisible(Date.now())}`,
    `${posts.length} post${posts.length > 1 ? 's' : ''} · ${espaces.length} espace${espaces.length > 1 ? 's' : ''} · ${entrees.length} image${entrees.length > 1 ? 's' : ''}`,
  ]

  for (const e of espaces) {
    const contenu = parEspace(e.id)
    if (!contenu.length) continue
    sections.push(`\n---\n\n## ${e.nom}`)
    sections.push(...contenu)
  }

  const libres = parEspace(null)
  if (libres.length) {
    sections.push('\n---\n\n## Sans espace')
    sections.push(...libres)
  }

  entrees.unshift({ nom: 'atlas.md', data: enc.encode(sections.join('\n\n')) })
  entrees.unshift({
    nom: 'atlas.json',
    data: enc.encode(JSON.stringify({ version: 1, exporteLe: Date.now(), espaces, posts }, null, 2)),
  })

  const blob = zipper(entrees)
  const d = new Date()
  const jour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return {
    blob,
    fichier: `atlas-${jour}.zip`,
    posts: posts.length,
    images: entrees.filter((e) => e.nom.startsWith('images/')).length,
    octets: blob.size,
  }
}

export async function exporter(posts: Post[], espaces: Espace[]): Promise<Bilan> {
  const { blob, ...bilan } = await construireArchive(posts, espaces)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = bilan.fichier
  a.click()
  // laisser au navigateur le temps de démarrer le téléchargement
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
  try {
    localStorage.setItem('atlas.export', String(Date.now()))
  } catch {
    /* sans importance */
  }
  return bilan
}

export function dernierExport(): number | null {
  try {
    const v = localStorage.getItem('atlas.export')
    return v ? Number(v) : null
  } catch {
    return null
  }
}
