import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { idDans, type Piece } from '../store/formes'
import { stockerImage, oublierImage } from '../store/db'
import { lisible, peutAjouterImage, QUOTA_IMAGES } from '../store/quota'
import {
  IconClose,
  IconFocus,
  IconImage,
  IconMoins,
  IconPlanche,
  IconPlus,
  IconTexte,
  IconTrash,
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
    ecrire(pieces.filter((x) => x.id !== p.id))
    setSelection(null)
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
          className="planche__monde"
          style={{ transform: `translate3d(${vue.x}px, ${vue.y}px, 0) scale(${vue.k})` }}
        >
          {rangees.map((brute) => {
            const p = position(brute)
            const l = largeur(brute)
            const actif = selection === p.id
            return (
              <div
                key={p.id}
                className="piece"
                data-actif={actif}
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
              <IconFocus size={17} />
            </OutilCanevas>
            <OutilCanevas titre="Retirer" onClick={() => retirer(choisie)}>
              <IconTrash size={16} />
            </OutilCanevas>
          </>
        )}

        <SeparateurCanevas />

        <OutilCanevas titre="Zoomer" onClick={() => setVue((v) => zoomCentre(surface.current, v, 1.25))}>
          <IconPlus size={17} />
        </OutilCanevas>
        <OutilCanevas
          titre="Dézoomer"
          onClick={() => setVue((v) => zoomCentre(surface.current, v, 1 / 1.25))}
        >
          <IconClose size={17} style={{ transform: 'rotate(45deg)' }} />
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
