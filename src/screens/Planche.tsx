import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { idDans, type Piece } from '../store/formes'
import { stockerImage, oublierImage } from '../store/db'
import { lisible, peutAjouterImage, QUOTA_IMAGES } from '../store/quota'
import {
  IconFocus,
  IconImage,
  IconLien,
  IconMoins,
  IconPivoter,
  IconPlanche,
  IconPlus,
  IconTexte,
  IconTrash,
  IconZoomMoins,
  IconZoomPlus,
} from '../ui/Icon'
import { BarreCanevas, OutilCanevas, SeparateurCanevas } from '../ui/BarreCanevas'
import { useImageUrl } from '../ui/useImageUrl'

/* ---------------------------------------------------------------
   LA PLANCHE — le moodboard.

   Un plan sans grille où l'on pose des images et des mots, qu'on
   déplace, qu'on incline et qu'on empile. C'est le seul endroit
   d'Atlas où la POSITION EST LE CONTENU : ailleurs, une note se lit
   de haut en bas ; ici, c'est le voisinage de deux images qui dit
   quelque chose.

   Trois décisions, et aucune n'est décorative.

   1. L'EMPILEMENT EST UN CHAMP (`z`), pas l'ordre du tableau. Passer
      une pièce devant devient une écriture d'un nombre au lieu d'une
      réindexation de toute la liste — et deux appareils qui empilent
      chacun de leur côté fusionnent sans se battre.

   2. LE GESTE VIT EN LOCAL, la base n'apprend qu'au relâchement.
      Écrire à chaque pixel réenregistrerait la note cent fois par
      seconde, et la synchronisation partirait avec.

   3. ON PEUT COLLER. C'est la priorité de docs/06 § 1 : sur iPhone,
      capture d'écran → copier → coller est le seul chemin qui existe.
      La planche est son point d'arrivée naturel.

   Le plan et le zoom reprennent exactement la mécanique de la carte
   mentale — un seul `transform` sur un calque unique, aucune mise en
   page recalculée.
   --------------------------------------------------------------- */

const ZOOM_MIN = 0.25
const ZOOM_MAX = 3
const LARGEUR_DEFAUT = 260
const LARGEUR_MIN = 60
/** Au-delà, la pièce couvre tout le plan et on ne voit plus la planche. */
const LARGEUR_MAX = 1400

type Vue = { x: number; y: number; k: number }

/** Une inclinaison légère, tirée au sort : c'est elle qui fait la planche. */
function inclinaison() {
  return Math.round((Math.random() * 8 - 4) * 10) / 10
}

export function Planche({
  pieces,
  ecrire,
}: {
  pieces: Piece[]
  ecrire: (p: Piece[]) => void
}) {
  const surface = useRef<HTMLDivElement>(null)
  const fichier = useRef<HTMLInputElement>(null)
  const [vue, setVue] = useState<Vue>({ x: 0, y: 0, k: 1 })
  const [selection, setSelection] = useState<string | null>(null)
  const [edition, setEdition] = useState<string | null>(null)
  const [glisse, setGlisse] = useState<{ id: string; x: number; y: number } | null>(null)
  const [taille, setTaille] = useState<{ id: string; l: number } | null>(null)
  const [envoi, setEnvoi] = useState(false)

  /* LE MODE RELIER — une pièce de départ, et l'attente de la seconde.

     Il aurait été plus court de tirer un fil depuis une poignée, comme
     on redimensionne. Ça demande de viser un point précis sur une
     pièce inclinée, puis de tenir le doigt jusqu'à une autre pièce qui
     peut être hors champ — donc de défiler en glissant. Deux appuis
     nets font le même travail sans rien viser, et se rattrapent d'un
     appui sur le fond. */
  const [relierDepuis, setRelierDepuis] = useState<string | null>(null)

  /* LES HAUTEURS, MESURÉES ET NON DÉDUITES.

     Une pièce n'a qu'une largeur dans le modèle : sa hauteur dépend de
     l'image qu'elle porte, et n'est connue qu'une fois celle-ci
     chargée. Or un trait doit partir du CENTRE, sinon il sort par le
     coin et l'œil ne suit plus. On observe donc les éléments — et
     l'observateur est indispensable, pas un luxe : la hauteur d'une
     vignette change à l'instant où son image arrive, bien après le
     rendu qui l'a posée. */
  const monde = useRef<HTMLDivElement>(null)
  const [hauteurs, setHauteurs] = useState<Record<string, number>>({})
  const empreinte = pieces.map((p) => p.id).join(',')

  useEffect(() => {
    const racine = monde.current
    if (!racine || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entrees) => {
      setHauteurs((avant) => {
        let change = false
        const suite = { ...avant }
        for (const e of entrees) {
          const id = (e.target as HTMLElement).dataset.piece
          if (!id) continue
          const h = Math.round(e.contentRect.height)
          if (suite[id] !== h) {
            suite[id] = h
            change = true
          }
        }
        return change ? suite : avant
      })
    })
    racine.querySelectorAll<HTMLElement>('[data-piece]').forEach((el) => ro.observe(el))
    return () => ro.disconnect()
  }, [empreinte])

  /* Le centre d'une pièce, en coordonnées du plan. La rotation ne
     compte pas : elle tourne autour de ce point-là, qui ne bouge donc
     pas d'un pixel. */
  const centreDe = (p: Piece) => ({
    x: p.x + p.l / 2,
    y: p.y + (hauteurs[p.id] ?? 120) / 2,
  })

  /** Pose ou retire le lien entre deux pièces, dans le sens qu'il a déjà. */
  const basculerLien = (a: string, b: string) => {
    if (a === b) return
    const existant = pieces.find(
      (p) =>
        (p.id === a && (p.vers ?? []).includes(b)) || (p.id === b && (p.vers ?? []).includes(a)),
    )
    if (existant) {
      const autre = existant.id === a ? b : a
      ecrire(
        pieces.map((p) =>
          p.id === existant.id ? { ...p, vers: (p.vers ?? []).filter((v) => v !== autre) } : p,
        ),
      )
      return
    }
    ecrire(pieces.map((p) => (p.id === a ? { ...p, vers: [...(p.vers ?? []), b] } : p)))
  }

  /* Le centre de la vue, en coordonnées du plan : c'est là qu'atterrit
     tout ce qu'on ajoute — jamais au coin, jamais hors champ. */
  const centreDuPlan = useCallback(() => {
    const cadre = surface.current?.getBoundingClientRect()
    const [w, h] = [cadre?.width ?? 800, cadre?.height ?? 600]
    return { x: (w / 2 - vue.x) / vue.k, y: (h / 2 - vue.y) / vue.k }
  }, [vue])

  const dessus = () => (pieces.length ? Math.max(...pieces.map((p) => p.z)) + 1 : 0)

  const poser = useCallback(
    (partielle: Partial<Piece>) => {
      const c = centreDuPlan()
      // les pièces ajoutées coup sur coup se décalent, sinon la
      // deuxième cache la première et on croit qu'il ne s'est rien passé
      const decalage = pieces.length ? ((pieces.length % 6) - 3) * 26 : 0
      const piece: Piece = {
        id: idDans('pc'),
        x: Math.round(c.x - LARGEUR_DEFAUT / 2 + decalage),
        y: Math.round(c.y - 90 + decalage),
        l: LARGEUR_DEFAUT,
        rot: inclinaison(),
        z: pieces.length ? Math.max(...pieces.map((p) => p.z)) + 1 : 0,
        ...partielle,
      }
      ecrire([...pieces, piece])
      setSelection(piece.id)
      return piece
    },
    [centreDuPlan, ecrire, pieces],
  )

  const maj = (id: string, patch: Partial<Piece>) =>
    ecrire(pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const retirer = (p: Piece) => {
    if (p.imageId) oublierImage(p.imageId)
    /* LES LIENS QUI LA DÉSIGNAIENT PARTENT AVEC ELLE. Les laisser
       pendre ne se verrait pas — le rendu ignore un identifiant
       inconnu — mais ils reviendraient à la vie le jour où une
       fusion ramène la pièce, et se traîneraient dans chaque
       sauvegarde en attendant. */
    ecrire(
      pieces
        .filter((x) => x.id !== p.id)
        .map((x) =>
          (x.vers ?? []).includes(p.id) ? { ...x, vers: x.vers!.filter((v) => v !== p.id) } : x,
        ),
    )
    setSelection(null)
    setRelierDepuis(null)
  }

  /* --- importer une ou plusieurs images --- */

  const importer = useCallback(
    async (fichiers: File[]) => {
      if (!fichiers.length) return
      setEnvoi(true)
      try {
        let suite = pieces
        const c = centreDuPlan()
        for (const [i, f] of fichiers.entries()) {
          // le plafond se dit AVANT le travail de réduction, pas après
          if (!peutAjouterImage(f.size)) {
            alert(
              `Plafond d'images atteint (${lisible(QUOTA_IMAGES)}). Écrire, en revanche, n'est jamais bloqué.`,
            )
            break
          }
          const imageId = await stockerImage(f)
          const decalage = ((suite.length % 6) - 3) * 26 + i * 8
          suite = [
            ...suite,
            {
              id: idDans('pc'),
              imageId,
              x: Math.round(c.x - LARGEUR_DEFAUT / 2 + decalage),
              y: Math.round(c.y - 90 + decalage),
              l: LARGEUR_DEFAUT,
              rot: inclinaison(),
              z: suite.length ? Math.max(...suite.map((p) => p.z)) + 1 : 0,
            },
          ]
        }
        if (suite !== pieces) {
          ecrire(suite)
          setSelection(suite[suite.length - 1].id)
        }
      } finally {
        setEnvoi(false)
      }
    },
    [centreDuPlan, ecrire, pieces],
  )

  /* --- le collage ---

     Une image dans le presse-papier devient une pièce ; du texte
     devient une étiquette. On n'intercepte JAMAIS le collage quand un
     champ a le focus : on serait en train de voler le texte que
     l'utilisateur colle dans une légende. */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const cible = e.target as HTMLElement | null
      if (cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA')) return
      const items = [...(e.clipboardData?.items ?? [])]
      const images = items
        .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
        .map((i) => i.getAsFile())
        .filter((f): f is File => Boolean(f))
      if (images.length) {
        e.preventDefault()
        void importer(images)
        return
      }
      const texte = e.clipboardData?.getData('text/plain')?.trim()
      if (texte) {
        e.preventDefault()
        poser({ texte, l: 240, imageId: null })
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [importer, poser])

  /* --- recentrer : ramener toutes les pièces dans le cadre --- */

  const recentrer = useCallback(() => {
    const el = surface.current
    if (!el || !pieces.length) return
    const cadre = el.getBoundingClientRect()
    const minX = Math.min(...pieces.map((p) => p.x))
    const maxX = Math.max(...pieces.map((p) => p.x + p.l))
    const minY = Math.min(...pieces.map((p) => p.y))
    // la hauteur réelle dépend des images ; on l'approche par la largeur,
    // ce qui suffit à ne rien laisser hors champ
    const maxY = Math.max(...pieces.map((p) => p.y + p.l))
    const k = Math.min(1, (cadre.width - 100) / (maxX - minX || 1), (cadre.height - 100) / (maxY - minY || 1))
    const kf = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, k))
    setVue({
      k: kf,
      x: cadre.width / 2 - ((minX + maxX) / 2) * kf,
      y: cadre.height / 2 - ((minY + maxY) / 2) * kf,
    })
  }, [pieces])

  // au premier affichage seulement : ensuite, la vue appartient à l'utilisateur
  const centre = useRef(false)
  useLayoutEffect(() => {
    if (centre.current || !pieces.length) return
    centre.current = true
    recentrer()
  }, [pieces.length, recentrer])

  /* --- molette : zoom au pincement trackpad, panoramique sinon --- */
  useEffect(() => {
    const el = surface.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const cadre = el.getBoundingClientRect()
      const mx = e.clientX - cadre.left
      const my = e.clientY - cadre.top
      if (e.ctrlKey || e.metaKey) {
        setVue((v) => zoomVers(v, Math.exp(-e.deltaY / 240), mx, my))
      } else {
        setVue((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /* --- le fond : panoramique et pincement --- */

  const doigts = useRef(new Map<number, { x: number; y: number }>())
  const pince = useRef<{ d: number; k: number; x: number; y: number } | null>(null)

  const fondDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return
    setSelection(null)
    setEdition(null)
    setRelierDepuis(null)
    doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* la capture est un confort, pas une dépendance */
    }
  }

  const fondMove = (e: React.PointerEvent) => {
    const connu = doigts.current.get(e.pointerId)
    if (!connu) return
    const avant = [...doigts.current.values()]
    doigts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (doigts.current.size >= 2) {
      const [a, b] = [...doigts.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const cadre = surface.current!.getBoundingClientRect()
      const mx = (a.x + b.x) / 2 - cadre.left
      const my = (a.y + b.y) / 2 - cadre.top
      if (!pince.current) pince.current = { d, k: vue.k, x: mx, y: my }
      else setVue((v) => zoomVers(v, (d / pince.current!.d) * (pince.current!.k / v.k), mx, my))
      return
    }

    if (avant.length === 1) {
      setVue((v) => ({ ...v, x: v.x + (e.clientX - connu.x), y: v.y + (e.clientY - connu.y) }))
    }
  }

  const fondUp = (e: React.PointerEvent) => {
    doigts.current.delete(e.pointerId)
    if (doigts.current.size < 2) pince.current = null
  }

  /* --- déplacer une pièce --- */

  const depart = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null)

  const pieceDown = (e: React.PointerEvent, p: Piece) => {
    if (edition === p.id) return
    e.stopPropagation()

    /* EN MODE RELIER, LA PIÈCE NE SE DÉPLACE PAS. Laisser le glissé
       vivre en même temps ferait qu'on relie ET qu'on bouge d'un même
       appui — deux effets pour un geste, dont un qu'on n'a pas
       demandé. Le second appui ferme le mode : relier trois pièces
       d'affilée se fait en repartant de la première, ce qui est aussi
       la façon de dire qu'on a fini. */
    if (relierDepuis) {
      basculerLien(relierDepuis, p.id)
      setRelierDepuis(null)
      setSelection(p.id)
      return
    }

    setSelection(p.id)
    depart.current = { sx: e.clientX, sy: e.clientY, x: p.x, y: p.y }
    setGlisse({ id: p.id, x: p.x, y: p.y })
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* idem */
    }
  }

  const pieceMove = (e: React.PointerEvent) => {
    const d = depart.current
    if (!d || !glisse) return
    e.stopPropagation()
    setGlisse({
      id: glisse.id,
      x: Math.round(d.x + (e.clientX - d.sx) / vue.k),
      y: Math.round(d.y + (e.clientY - d.sy) / vue.k),
    })
  }

  const pieceUp = () => {
    if (glisse && depart.current) {
      // un simple appui n'a rien déplacé : pas d'écriture inutile
      const bouge = glisse.x !== depart.current.x || glisse.y !== depart.current.y
      if (bouge) maj(glisse.id, { x: glisse.x, y: glisse.y })
    }
    depart.current = null
    setGlisse(null)
  }

  /* --- redimensionner ---

     Le doigt tire en diagonale ; on ne retient que sa composante le
     long de l'axe X DE LA PIÈCE, celle-ci pouvant être inclinée. Sans
     cette projection, une pièce penchée grandit de travers. */

  const redimensionner = (e: React.PointerEvent, p: Piece) => {
    e.stopPropagation()
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    const l0 = p.l
    const rad = (p.rot * Math.PI) / 180
    try {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* idem */
    }
    const bouger = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / vue.k
      const dy = (ev.clientY - sy) / vue.k
      const long = dx * Math.cos(rad) + dy * Math.sin(rad)
      setTaille({ id: p.id, l: Math.max(LARGEUR_MIN, Math.round(l0 + long)) })
    }
    const finir = () => {
      setTaille((t) => {
        if (t) maj(t.id, { l: t.l })
        return null
      })
      window.removeEventListener('pointermove', bouger)
      window.removeEventListener('pointerup', finir)
      window.removeEventListener('pointercancel', finir)
    }
    window.addEventListener('pointermove', bouger)
    window.addEventListener('pointerup', finir)
    window.addEventListener('pointercancel', finir)
  }

  const position = (p: Piece) => (glisse?.id === p.id ? { ...p, ...glisse } : p)
  const largeur = (p: Piece) => (taille?.id === p.id ? taille.l : p.l)

  const rangees = [...pieces].sort((a, b) => a.z - b.z)
  const choisie = pieces.find((p) => p.id === selection) ?? null

  /* Les traits se calculent sur la position AFFICHÉE, celle que
     `position` corrige pendant un glissé : sans quoi le trait resterait
     accroché à l'ancienne place et ne rattraperait la pièce qu'au
     relâchement. Un lien qui désigne une pièce disparue est simplement
     sauté — c'est la seule tolérance, et elle évite qu'une fusion
     bancale ne fasse tomber la planche entière. */
  const traits = pieces.flatMap((a) =>
    (a.vers ?? []).flatMap((idB) => {
      const b = pieces.find((x) => x.id === idB)
      if (!b) return []
      const ca = centreDe(position(a))
      const cb = centreDe(position(b))
      return [{ cle: `${a.id}-${idB}`, x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y }]
    }),
  )

  return (
    <div className="planche">
      <input
        ref={fichier}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void importer([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />

      <div
        ref={surface}
        className="planche__surface"
        onPointerDown={fondDown}
        onPointerMove={fondMove}
        onPointerUp={fondUp}
        onPointerCancel={fondUp}
      >
        <div
          ref={monde}
          className="planche__monde"
          style={{ transform: `translate3d(${vue.x}px, ${vue.y}px, 0) scale(${vue.k})` }}
        >
          {/* LES TRAITS SOUS LES PIÈCES, dans le même plan.

              Le calque vit DANS le monde transformé : il hérite donc du
              déplacement et du zoom sans une ligne de calcul, et un
              trait ne peut pas se désolidariser de ce qu'il relie. Sa
              taille est nulle et son débordement visible — c'est un
              système de coordonnées, pas une surface. */}
          <svg className="planche__liens" aria-hidden="true">
            {traits.map((t) => (
              <line key={t.cle} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
            ))}
          </svg>

          {rangees.map((brute) => {
            const p = position(brute)
            const l = largeur(brute)
            const actif = selection === p.id
            return (
              <div
                key={p.id}
                className="piece"
                data-piece={p.id}
                data-actif={actif}
                data-depart={relierDepuis === p.id || undefined}
                data-cible={(relierDepuis && relierDepuis !== p.id) || undefined}
                data-mot={!p.imageId || undefined}
                style={{
                  transform: `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rot}deg)`,
                  width: l,
                  zIndex: brute.z + 1,
                }}
                onPointerDown={(e) => pieceDown(e, brute)}
                onPointerMove={pieceMove}
                onPointerUp={pieceUp}
                onPointerCancel={pieceUp}
                onDoubleClick={() => !p.imageId && setEdition(p.id)}
              >
                {p.imageId ? (
                  <PieceImage imageId={p.imageId} legende={p.texte} />
                ) : edition === p.id ? (
                  <textarea
                    className="piece__champ"
                    autoFocus
                    defaultValue={p.texte ?? ''}
                    onPointerDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      maj(p.id, { texte: e.target.value })
                      setEdition(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEdition(null)
                    }}
                  />
                ) : (
                  <span className="piece__mot">{p.texte || 'Deux fois pour écrire'}</span>
                )}

                {actif && (
                  <span
                    className="piece__poignee"
                    onPointerDown={(e) => redimensionner(e, brute)}
                    role="separator"
                    aria-label="Redimensionner"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* UNE CONSIGNE PENDANT L'ATTENTE, et elle dit les deux issues.

          Un mode dans lequel on est entré sans s'en rendre compte est
          un mode dont on ne sait pas sortir. Celui-ci change ce que
          fait un appui sur une pièce : il doit donc se voir, dire ce
          qu'il attend, et dire comment en sortir — les trois dans la
          même phrase. */}
      {relierDepuis && (
        <div className="planche__consigne" role="status">
          Touche la pièce à relier. Un appui sur le fond annule ; sur une pièce déjà reliée, le
          trait s’efface.
        </div>
      )}

      {/* Les commandes de la pièce choisie sont ANCRÉES À LA BARRE, pas
          collées à la pièce : une pièce inclinée emporterait ses boutons
          dans son inclinaison, et une pièce au bord de l'écran les
          pousserait hors champ. */}
      <BarreCanevas>
        <OutilCanevas
          titre="Ajouter des images"
          onClick={() => fichier.current?.click()}
          desactive={envoi}
        >
          <IconImage size={17} />
        </OutilCanevas>
        <OutilCanevas titre="Ajouter une étiquette" onClick={() => {
          const p = poser({ texte: '', l: 240, imageId: null })
          setEdition(p.id)
        }}>
          <IconTexte size={17} />
        </OutilCanevas>

        {choisie && (
          <>
            <SeparateurCanevas />
            <OutilCanevas
              titre="Mettre devant"
              onClick={() => maj(choisie.id, { z: dessus() })}
            >
              <IconPlanche size={17} />
            </OutilCanevas>
            <OutilCanevas
              titre="Mettre derrière"
              onClick={() =>
                maj(choisie.id, { z: Math.min(...pieces.map((p) => p.z)) - 1 })
              }
            >
              <IconPlanche size={17} style={{ opacity: 0.5, transform: 'scaleX(-1)' }} />
            </OutilCanevas>
            {/* AGRANDIR ET RÉDUIRE AU BOUTON, en plus de la poignée.

                La poignée demande de viser un cercle de dix-huit
                pixels posé au coin d'une pièce inclinée, puis de tirer
                droit : c'est un geste précis, et il l'est d'autant
                moins que la pièce est petite — c'est-à-dire exactement
                quand on veut l'agrandir. Deux boutons font le même
                travail sans rien viser, et par pas réguliers.

                Le pas est MULTIPLICATIF (un cinquième), pas additif :
                vingt pixels ne veulent pas dire la même chose sur une
                vignette de soixante et sur une image de six cents. */}
            <OutilCanevas
              titre="Réduire"
              desactive={choisie.l <= LARGEUR_MIN}
              onClick={() =>
                maj(choisie.id, { l: Math.max(LARGEUR_MIN, Math.round(choisie.l / 1.2)) })
              }
            >
              <IconMoins size={17} />
            </OutilCanevas>
            <OutilCanevas
              titre="Agrandir"
              desactive={choisie.l >= LARGEUR_MAX}
              onClick={() =>
                maj(choisie.id, { l: Math.min(LARGEUR_MAX, Math.round(choisie.l * 1.2)) })
              }
            >
              <IconPlus size={17} />
            </OutilCanevas>
            <OutilCanevas
              titre="Pivoter"
              onClick={() => maj(choisie.id, { rot: Math.round((choisie.rot + 8) % 360) })}
            >
              <IconPivoter size={17} />
            </OutilCanevas>
            <OutilCanevas
              titre={
                relierDepuis === choisie.id
                  ? 'Choisis la pièce à relier'
                  : 'Relier à une autre pièce'
              }
              actif={relierDepuis === choisie.id}
              onClick={() =>
                setRelierDepuis(relierDepuis === choisie.id ? null : choisie.id)
              }
            >
              <IconLien size={17} />
            </OutilCanevas>
            <OutilCanevas titre="Retirer" onClick={() => retirer(choisie)}>
              <IconTrash size={16} />
            </OutilCanevas>
          </>
        )}

        <SeparateurCanevas />

        {/* L'AFFICHAGE, pas les pièces. Les deux gestes se ressemblent
            trop pour partager leurs icônes : la loupe dit « je change ce
            que je vois », le plus et le moins nus, plus haut, disent
            « je change la chose ». */}
        <OutilCanevas
          titre="Agrandir l’affichage"
          desactive={vue.k >= ZOOM_MAX}
          onClick={() => setVue((v) => zoomCentre(surface.current, v, 1.25))}
        >
          <IconZoomPlus size={17} />
        </OutilCanevas>
        <OutilCanevas
          titre="Réduire l’affichage"
          desactive={vue.k <= ZOOM_MIN}
          onClick={() => setVue((v) => zoomCentre(surface.current, v, 1 / 1.25))}
        >
          <IconZoomMoins size={17} />
        </OutilCanevas>
        <OutilCanevas titre="Tout ramener dans le cadre" onClick={recentrer}>
          <IconFocus size={17} />
        </OutilCanevas>
      </BarreCanevas>

      {!pieces.length && (
        <div className="planche__vide">
          <IconPlanche size={26} />
          <p>Une planche vide.</p>
          <button className="btn btn--accent" onClick={() => fichier.current?.click()}>
            Poser des images
          </button>
          <span>ou colle une capture d’écran directement ici.</span>
        </div>
      )}

      <p className="carte__aide">
        Glisse le fond pour te déplacer · glisse une pièce pour la poser ailleurs · double-clic sur
        une étiquette pour l’écrire · Ctrl+V colle une image
      </p>
    </div>
  )
}

/* ================= une image posée ================= */

function PieceImage({ imageId, legende }: { imageId: string; legende?: string }) {
  const url = useImageUrl(imageId)
  if (!url) return <span className="piece__attente" aria-label="Image en cours de chargement" />
  return <img className="piece__image" src={url} alt={legende ?? ''} draggable={false} />
}

/* --- helpers de vue, identiques à ceux de la carte --- */

function zoomVers(v: Vue, ratio: number, mx: number, my: number): Vue {
  const k = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.k * ratio))
  const f = k / v.k
  return { k, x: mx - (mx - v.x) * f, y: my - (my - v.y) * f }
}

function zoomCentre(el: HTMLElement | null, v: Vue, ratio: number): Vue {
  const cadre = el?.getBoundingClientRect()
  return zoomVers(v, ratio, (cadre?.width ?? 0) / 2, (cadre?.height ?? 0) / 2)
}
