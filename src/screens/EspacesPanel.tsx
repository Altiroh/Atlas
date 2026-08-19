import type { CSSProperties } from 'react'
import { useRef, useState } from 'react'
import { useAtlas, type Espace } from '../store/atlas'
import { oublierImage, stockerImage } from '../store/db'
import { peutAjouterImage } from '../store/quota'
import { IconClose, IconImage, IconPencil, IconPlus, IconTrash } from '../ui/Icon'
import { useImageUrl } from '../ui/useImageUrl'

/* ---------------------------------------------------------------
   Les espaces, personnalisables : nom, couleur, image de couverture.
   Cliquer un espace filtre le flux ; le crayon ouvre son réglage.
   --------------------------------------------------------------- */

export function EspacesPanel() {
  const espaces = useAtlas((s) => s.espaces)
  const posts = useAtlas((s) => s.posts)
  const creerEspace = useAtlas((s) => s.creerEspace)
  const setNav = useAtlas((s) => s.setNav)
  const setEspaceActif = useAtlas((s) => s.setEspaceActif)

  const [edite, setEdite] = useState<string | null>(null)
  const libres = posts.filter((p) => !p.espaceId).length

  return (
    <div className="scroll">
      <div className="spaces">
        {espaces.map((e) => (
          <SpaceCard
            key={e.id}
            espace={e}
            n={posts.filter((p) => p.espaceId === e.id).length}
            onOuvrir={() => {
              setEspaceActif(e.id)
              setNav('flux')
            }}
            onEditer={() => setEdite(e.id)}
          />
        ))}

        <button
          className="space-card space-card--new"
          onClick={() => setEdite(creerEspace())}
        >
          <IconPlus size={20} />
          <span className="space-card__name">Nouvel espace</span>
        </button>
      </div>

      <p className="spaces__note">
        {libres} post{libres > 1 ? 's' : ''} sans espace — et c'est très bien comme ça. La
        recherche les retrouve ; le classement viendra le jour où un projet en aura besoin.
      </p>

      {edite && <EspaceEditor id={edite} onFermer={() => setEdite(null)} />}
    </div>
  )
}

function SpaceCard({
  espace,
  n,
  onOuvrir,
  onEditer,
}: {
  espace: Espace
  n: number
  onOuvrir: () => void
  onEditer: () => void
}) {
  const image = useImageUrl(espace.imageId)
  const couleur = `hsl(${espace.hue} 80% 56%)`

  return (
    <div className="space-card glass" style={{ '--sc': couleur } as CSSProperties}>
      {image && <img className="space-card__img" src={image} alt="" />}
      <button className="space-card__hit" onClick={onOuvrir} aria-label={`Ouvrir ${espace.nom}`} />
      <span className="space-card__mark" />
      <span className="space-card__name">{espace.nom}</span>
      <span className="space-card__count">
        {n} {n > 1 ? 'posts' : 'post'}
      </span>
      <button className="space-card__edit" onClick={onEditer} aria-label={`Régler ${espace.nom}`}>
        <IconPencil size={15} />
      </button>
    </div>
  )
}

/* --- feuille de réglage d'un espace --- */

function EspaceEditor({ id, onFermer }: { id: string; onFermer: () => void }) {
  const espace = useAtlas((s) => s.espaces.find((e) => e.id === id))
  const majEspace = useAtlas((s) => s.majEspace)
  const supprimerEspace = useAtlas((s) => s.supprimerEspace)
  const image = useImageUrl(espace?.imageId)
  const fichier = useRef<HTMLInputElement>(null)

  if (!espace) return null

  const importer = async (f: File | undefined) => {
    if (!f) return
    // le plafond se dit AVANT le travail de réduction, pas après
    if (!peutAjouterImage(f.size)) {
      alert("Plafond atteint : impossible d'ajouter une image. Le texte, lui, passe toujours.")
      return
    }
    if (espace.imageId) oublierImage(espace.imageId)
    majEspace(id, { imageId: await stockerImage(f) })
  }

  return (
    <div className="sheet" role="dialog" aria-label={`Réglages de ${espace.nom}`}>
      <div className="sheet__panel glass rise">
        <div className="sheet__head">
          <h3 className="sheet__titre">Espace</h3>
          <button className="btn btn--icon" onClick={onFermer} aria-label="Fermer">
            <IconClose size={18} />
          </button>
        </div>

        <label className="field">
          <span className="field__label">Nom</span>
          <input
            className="field__input"
            value={espace.nom}
            onChange={(e) => majEspace(id, { nom: e.target.value })}
            autoFocus
          />
        </label>

        <div className="field">
          <span className="field__label">Couleur</span>
          <div className="hue-row">
            <input
              className="hue"
              type="range"
              min={0}
              max={359}
              value={espace.hue}
              aria-label="Teinte de l'espace"
              onChange={(e) => majEspace(id, { hue: Number(e.target.value) })}
              style={{ '--accent': `hsl(${espace.hue} 80% 56%)` } as CSSProperties}
            />
            <span
              className="hue-row__dot"
              style={{ background: `hsl(${espace.hue} 80% 56%)` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="field">
          <span className="field__label">Image</span>
          {image && <img className="field__preview" src={image} alt="" />}
          <div style={{ display: 'flex', gap: 8, marginTop: image ? 10 : 0 }}>
            <button className="btn" onClick={() => fichier.current?.click()}>
              <IconImage size={16} />
              {image ? 'Remplacer' : 'Choisir une image'}
            </button>
            {image && (
              <button
                className="btn btn--ghost"
                onClick={() => {
                  oublierImage(espace.imageId!)
                  majEspace(id, { imageId: null })
                }}
              >
                Retirer
              </button>
            )}
          </div>
          <input
            ref={fichier}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void importer(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        <div className="sheet__pied">
          <button
            className="btn btn--ghost btn--danger"
            onClick={() => {
              supprimerEspace(id)
              onFermer()
            }}
          >
            <IconTrash size={16} />
            Supprimer l'espace
          </button>
          <span className="sheet__note">Les posts qu'il contient redeviennent libres.</span>
        </div>
      </div>
    </div>
  )
}
