import { useEffect, useRef, useState } from 'react'
import { libelleHeure, libelleJour, titreDe, useAtlas } from '../store/atlas'
import { oublierImage, stockerImage } from '../store/db'
import { lisible, peutAjouterImage, QUOTA_IMAGES } from '../store/quota'
import { IconBolt, IconImage, IconTrash } from '../ui/Icon'
import { useImageUrl } from '../ui/useImageUrl'
import { MindMap, carteInitiale } from './MindMap'
import { Dessin } from './Dessin'
import { Editeur } from './Editeur'
import { Confirmation } from '../ui/Confirmation'
import { IconCarte, IconPencil, IconPlus, IconTexte } from '../ui/Icon'

/* ---------------------------------------------------------------
   L'éditeur de post. Deux manières de travailler la même matière :
   · Texte — titre, corps, image de couverture ;
   · Carte — la même idée en mind map.

   Ce sont deux vues d'UN SEUL objet, pas deux objets. Un post gagne
   une carte quand on en a besoin, et la garde.

   Tout s'enregistre au fil de la frappe : il n'y a pas de bouton
   « Enregistrer », et il n'y en aura jamais.
   --------------------------------------------------------------- */

type Mode = 'texte' | 'carte' | 'dessin'

/* Un post n'a pas UN type : il a des FORMES, et il peut en cumuler.
   Le texte est toujours là ; la carte et le dessin s'ajoutent quand
   on en a besoin, et ne se retirent jamais tout seuls. */
const FORMES: {
  id: Mode
  libelle: string
  icone: typeof IconTexte
  quoi: string
  indice: string
}[] = [
  { id: 'texte', libelle: 'Texte', icone: IconTexte, quoi: 'Écrire au fil de la plume.', indice: 'défaut' },
  { id: 'carte', libelle: 'Carte mentale', icone: IconCarte, quoi: 'Ramifier une idée en branches.', indice: 'nœuds' },
  { id: 'dessin', libelle: 'Dessin', icone: IconPencil, quoi: 'Croquer, annoter, surligner.', indice: 'vectoriel' },
]

export function PostEditor() {
  const selectedId = useAtlas((s) => s.selectedId)
  const posts = useAtlas((s) => s.posts)
  const espaces = useAtlas((s) => s.espaces)
  const majPost = useAtlas((s) => s.majPost)
  const supprimerPost = useAtlas((s) => s.supprimerPost)
  const creerPost = useAtlas((s) => s.creerPost)
  const select = useAtlas((s) => s.select)
  const formeInitiale = useAtlas((s) => s.formeInitiale)
  const setFormeInitiale = useAtlas((s) => s.setFormeInitiale)

  const post = posts.find((p) => p.id === selectedId) ?? null
  const cover = useImageUrl(post?.coverId)
  const fichier = useRef<HTMLInputElement>(null)
  const [envoi, setEnvoi] = useState(false)
  const [mode, setMode] = useState<Mode>('texte')
  const [aSupprimer, setASupprimer] = useState(false)
  const [choixForme, setChoixForme] = useState(false)

  /* Changer de post ramène au texte — sauf si la capture a demandé une
     forme précise : « En dessin » doit ouvrir sur le dessin, pas sur un
     texte qu'il faudrait ensuite quitter. Le vœu est consommé une fois. */
  useEffect(() => {
    if (formeInitiale) {
      setMode(formeInitiale)
      setFormeInitiale(null)
    } else {
      setMode('texte')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id])

  if (!post) {
    return (
      <div className="empty">
        <div className="empty__icon">
          <IconBolt size={22} />
        </div>
        <div className="empty__ref">ATL_00 / VIDE</div>
        <div className="empty__title">Rien de sélectionné</div>
        <div className="empty__sub">Choisis un post dans le flux, ou commences-en un nouveau.</div>
        <button
          className="btn btn--accent"
          style={{ marginTop: 14 }}
          onClick={() => select(creerPost())}
        >
          Nouveau post
        </button>
      </div>
    )
  }

  const importer = async (f: File | undefined) => {
    if (!f) return
    // le plafond se dit AVANT le travail de réduction, pas après
    if (!peutAjouterImage(f.size)) {
      alert(`Plafond d'images atteint (${lisible(QUOTA_IMAGES)}). Écrire, en revanche, n'est jamais bloqué.`)
      return
    }
    setEnvoi(true)
    try {
      if (post.coverId) oublierImage(post.coverId)
      majPost(post.id, { coverId: await stockerImage(f) })
    } finally {
      setEnvoi(false)
    }
  }

  const presentes = FORMES.filter(
    (f) => f.id === 'texte' || (f.id === 'carte' ? post.carte : post.dessin),
  )
  const absentes = FORMES.filter((f) => !presentes.includes(f))

  const ouvrirForme = (f: Mode) => {
    // la carte naît du titre du post : on ne repart jamais d'une page blanche
    if (f === 'carte' && !post.carte?.length) {
      majPost(post.id, { carte: carteInitiale(titreDe(post)) })
    }
    if (f === 'dessin' && !post.dessin) majPost(post.id, { dessin: [] })
    setMode(f)
    setChoixForme(false)
  }

  return (
    <div className="post">
      <div className="post__bar">
        <div className="seg" role="group" aria-label="Forme">
          {presentes.map((f) => (
            <button
              key={f.id}
              className="seg__item"
              aria-current={mode === f.id}
              onClick={() => setMode(f.id)}
            >
              {f.libelle}
            </button>
          ))}
          {absentes.length > 0 && (
            <button
              className="seg__item seg__item--plus"
              aria-label="Ajouter une forme"
              onClick={() => setChoixForme(true)}
            >
              <IconPlus size={14} />
            </button>
          )}
        </div>

        {mode === 'carte' && <span className="post__nom">{titreDe(post)}</span>}

        <div style={{ flex: 1 }} />

        {mode === 'texte' && !cover && (
          <button className="btn btn--ghost" onClick={() => fichier.current?.click()} disabled={envoi}>
            <IconImage size={16} />
            {envoi ? 'Import…' : 'Image'}
          </button>
        )}
        <button
          className="btn btn--icon btn--danger"
          onClick={() => setASupprimer(true)}
          aria-label="Supprimer ce post"
        >
          <IconTrash size={17} />
        </button>
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

      {mode === 'carte' ? (
        <MindMap post={post} />
      ) : mode === 'dessin' ? (
        <Dessin post={post} />
      ) : (
        <div className="scroll">
          <article className="editor" key={post.id}>
            {cover && (
              <div className="editor__cover">
                <img src={cover} alt="" />
                <div className="editor__coverActions">
                  <button
                    className="btn btn--icon btn--onImage"
                    onClick={() => fichier.current?.click()}
                    aria-label="Remplacer l'image"
                  >
                    <IconImage size={17} />
                  </button>
                  <button
                    className="btn btn--icon btn--onImage"
                    aria-label="Retirer l'image"
                    onClick={() => {
                      oublierImage(post.coverId!)
                      majPost(post.id, { coverId: null })
                    }}
                  >
                    <IconTrash size={17} />
                  </button>
                </div>
              </div>
            )}

            <input
              className="editor__titre"
              value={post.titre}
              placeholder="Titre"
              onChange={(e) => majPost(post.id, { titre: e.target.value })}
              aria-label="Titre du post"
            />

            <Editeur post={post} />

            <div className="editor__section">
              <div className="eyebrow">Espace</div>
              <div className="chips">
                {espaces.map((e) => (
                  <button
                    key={e.id}
                    className="chip"
                    aria-pressed={post.espaceId === e.id}
                    onClick={() =>
                      majPost(post.id, { espaceId: post.espaceId === e.id ? null : e.id })
                    }
                  >
                    <span className="chip__dot" style={{ color: `hsl(${e.hue} 78% 55%)` }} />
                    {e.nom}
                  </button>
                ))}
              </div>
            </div>

            <div className="editor__meta">
              Créé {libelleJour(post.createdAt).toLowerCase()} à {libelleHeure(post.createdAt)}
              {post.updatedAt - post.createdAt > 60_000 &&
                ` · modifié à ${libelleHeure(post.updatedAt)}`}
              {post.carte && ` · ${post.carte.length} nœud${post.carte.length > 1 ? 's' : ''}`}
            </div>
          </article>
        </div>
      )}

      {choixForme && (
        <div className="sheet" role="dialog" onClick={() => setChoixForme(false)}>
          <div className="sheet__panel rise" onClick={(e) => e.stopPropagation()}>
            <div className="menu__section">Ajouter une forme</div>
            <div className="menu">
              {absentes.map((f) => (
                <button key={f.id} className="menu__item" onClick={() => ouvrirForme(f.id)}>
                  <span className="menu__icone">
                    <f.icone size={17} />
                  </span>
                  <span className="menu__corps">
                    <span className="menu__nom">{f.libelle}</span>
                    <span className="menu__quoi">{f.quoi}</span>
                  </span>
                  <span className="menu__indice">{f.indice}</span>
                </button>
              ))}
            </div>
            <p className="menu__pied">
              La même idée, travaillée autrement. Rien ne remplace rien : les formes s'ajoutent.
            </p>
          </div>
        </div>
      )}

      {aSupprimer && (
        <Confirmation
          titre="Supprimer ce post ?"
          detail={
            <>
              <strong>{titreDe(post)}</strong> — le texte, l'image, la carte et le dessin partent
              avec lui, sur tous tes appareils. C'est le seul geste qu'Atlas ne sait pas défaire.
            </>
          }
          action="Supprimer"
          onConfirmer={() => {
            setASupprimer(false)
            supprimerPost(post.id)
          }}
          onAnnuler={() => setASupprimer(false)}
        />
      )}
    </div>
  )
}

