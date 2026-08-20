import { useEffect, useMemo, useRef, useState } from 'react'
import { libelleHeure, libelleJour, titreDe, useAtlas } from '../store/atlas'
import {
  depuisAncienModele,
  LIBELLES,
  nouvelleForme,
  type Forme,
  type TypeForme,
} from '../store/formes'
import { oublierImage, stockerImage } from '../store/db'
import { lisible, peutAjouterImage, QUOTA_IMAGES } from '../store/quota'
import { Confirmation } from '../ui/Confirmation'
import {
  IconBack,
  IconBolt,
  IconCarte,
  IconClose,
  IconFrise,
  IconImage,
  IconPencil,
  IconPlanche,
  IconPlus,
  IconTable,
  IconTexte,
  IconTrash,
} from '../ui/Icon'
import { useImageUrl } from '../ui/useImageUrl'
import { Dessin } from './Dessin'
import { Editeur } from './Editeur'
import { Frise } from './Frise'
import { carteInitiale, MindMap } from './MindMap'
import { Planche } from './Planche'
import { Table } from './Table'

/* ---------------------------------------------------------------
   L'ÉDITEUR DE NOTE.

   Deux lignes en tête, et la séparation entre les deux est le sujet :

   · LA PREMIÈRE PARLE DE LA NOTE — d'où l'on vient, comment elle
     s'appelle, et le seul geste qu'Atlas ne sait pas défaire. Elle ne
     bouge jamais.
   · LA SECONDE PARLE DE SES FORMES — les onglets. Elle défile
     horizontalement, parce qu'une note peut en porter dix et qu'on ne
     va pas rétrécir les noms jusqu'à l'illisible pour les faire
     tenir.

   Une note porte autant de fiches, de cartes et de dessins qu'elle
   veut, chacune nommée et renommable. Le « type » d'une note reste
   une conséquence de ce qu'on en fait, jamais une case à cocher
   (docs/03 § 1.2) — on ajoute simplement la forme dont on a besoin au
   moment où on en a besoin.

   Tout s'enregistre au fil de la frappe : il n'y a pas de bouton
   « Enregistrer », et il n'y en aura jamais.
   --------------------------------------------------------------- */

/* L'ordre est celui de la fréquence d'usage, pas celui du modèle :
   on écrit tous les jours, on tient une chronologie trois fois par an. */
const AJOUTS: { t: TypeForme; icone: typeof IconTexte; quoi: string }[] = [
  { t: 'texte', icone: IconTexte, quoi: 'Écrire au fil de la plume.' },
  { t: 'carte', icone: IconCarte, quoi: 'Ramifier une idée en branches.' },
  { t: 'dessin', icone: IconPencil, quoi: 'Croquer, annoter, surligner.' },
  { t: 'planche', icone: IconPlanche, quoi: 'Poser des images, les empiler, voir.' },
  { t: 'table', icone: IconTable, quoi: 'Lister des personnages, des lieux, des sources.' },
  { t: 'frise', icone: IconFrise, quoi: 'Mettre des événements dans l’ordre.' },
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
  const [actif, setActif] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState(false)
  const [ajout, setAjout] = useState(false)
  const [renomme, setRenomme] = useState<string | null>(null)

  /* La reprise des notes écrites avant les formes : une fois, à
     l'ouverture, et on réenregistre aussitôt. */
  const secours = useMemo(
    () => (post && !post.formes ? depuisAncienModele(post) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [post?.id],
  )
  const formes = post?.formes ?? secours ?? []

  useEffect(() => {
    if (post && !post.formes && secours) majPost(post.id, { formes: secours })
  }, [post, secours, majPost])

  /* Changer de note ramène à sa première forme — sauf si la capture a
     demandé une forme précise : « En dessin » doit ouvrir sur le
     dessin. Le vœu est consommé une fois. */
  useEffect(() => {
    if (!post) return
    const voulu = formeInitiale
    if (voulu) {
      setFormeInitiale(null)
      const f = formes.find((x) => x.t === voulu)
      if (f) return setActif(f.id)
    }
    setActif(formes[0]?.id ?? null)
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
        <div className="empty__sub">Choisis une note dans le flux, ou commences-en une nouvelle.</div>
        <button
          className="btn btn--accent"
          style={{ marginTop: 14 }}
          onClick={() => select(creerPost())}
        >
          Nouvelle note
        </button>
      </div>
    )
  }

  const forme = formes.find((f) => f.id === actif) ?? formes[0]

  const ecrireFormes = (suite: Forme[]) => majPost(post.id, { formes: suite })

  /** Écrit le contenu d'une seule forme, sans toucher aux autres. */
  const majForme = (id: string, patch: Partial<Forme>) =>
    ecrireFormes(formes.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const ajouter = (t: TypeForme) => {
    const f = nouvelleForme(formes, t, t === 'carte' ? { carte: carteInitiale(titreDe(post)) } : {})
    ecrireFormes([...formes, f])
    setActif(f.id)
    setAjout(false)
  }

  const retirer = (id: string) => {
    // il reste toujours une forme : une note sans rien où écrire n'existe pas
    if (formes.length <= 1) return
    const suite = formes.filter((f) => f.id !== id)
    ecrireFormes(suite)
    if (actif === id) setActif(suite[0].id)
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

  return (
    <div className="post">
      {/* ── première ligne : la note ── */}
      <div className="note__tete">
        <button className="note__retour" onClick={() => select(null)}>
          <IconBack size={17} />
          <span>Retour</span>
        </button>

        <input
          className="note__titre"
          value={post.titre}
          placeholder={titreDe(post)}
          onChange={(e) => majPost(post.id, { titre: e.target.value })}
          aria-label="Titre de la note"
        />

        <button
          className="note__suppr"
          onClick={() => setASupprimer(true)}
          aria-label="Supprimer la note"
        >
          <IconTrash size={16} />
          <span>Supprimer la note</span>
        </button>
      </div>

      {/* ── deuxième ligne : les formes ── */}
      <div className="note__onglets" role="tablist" aria-label="Formes de la note">
        {formes.map((f) =>
          renomme === f.id ? (
            /* ENTRÉE VALIDE DIRECTEMENT, sans passer par le `blur`.
               Le premier jet appelait `blur()` sur Entrée et laissait le
               gestionnaire de sortie faire le travail : une saisie dont
               la validation dépend d'un événement de focus se perd dès
               que le focus n'a pas été posé là où on croyait — ce qui
               arrive plus souvent qu'on ne pense au doigt. Le `blur`
               reste, en second chemin. */
            <RenommerOnglet
              key={f.id}
              nom={f.nom}
              valider={(nom) => {
                majForme(f.id, { nom: nom.trim() || LIBELLES[f.t] })
                setRenomme(null)
              }}
              annuler={() => setRenomme(null)}
            />
          ) : (
            <button
              key={f.id}
              className="onglet"
              role="tab"
              aria-selected={forme?.id === f.id}
              /* Un deuxième appui sur l'onglet COURANT le renomme. Ni
                 double-clic — introuvable au doigt — ni menu : le geste
                 est le même que pour renommer un fichier partout
                 ailleurs, et il ne coûte aucun bouton. */
              onClick={() => (forme?.id === f.id ? setRenomme(f.id) : setActif(f.id))}
            >
              {f.nom}
              {formes.length > 1 && forme?.id === f.id && (
                <span
                  className="onglet__fermer"
                  role="button"
                  aria-label={`Retirer ${f.nom}`}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    retirer(f.id)
                  }}
                >
                  <IconClose size={12} />
                </span>
              )}
            </button>
          ),
        )}

        <button className="onglet onglet--plus" onClick={() => setAjout(true)} aria-label="Ajouter une forme">
          <IconPlus size={15} />
        </button>

        <span className="note__onglets-fin" aria-hidden="true" />
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

      {forme?.t === 'carte' ? (
        <MindMap
          carte={forme.carte ?? []}
          titre={titreDe(post)}
          ecrire={(carte) => majForme(forme.id, { carte })}
        />
      ) : forme?.t === 'dessin' ? (
        <Dessin
          traits={forme.dessin ?? []}
          papier={forme.papier ?? 'points'}
          ecrire={(dessin) => majForme(forme.id, { dessin })}
          setPapier={(papier) => majForme(forme.id, { papier })}
        />
      ) : forme?.t === 'planche' ? (
        <Planche
          pieces={forme.planche ?? []}
          ecrire={(planche) => majForme(forme.id, { planche })}
        />
      ) : forme?.t === 'frise' ? (
        <Frise
          evenements={forme.frise ?? []}
          ecrire={(frise) => majForme(forme.id, { frise })}
        />
      ) : forme?.t === 'table' ? (
        <Table
          colonnes={forme.colonnes ?? []}
          lignes={forme.lignes ?? []}
          ecrire={(patch) => majForme(forme.id, patch)}
          /* La promotion crée une VRAIE note, avec son espace hérité :
             une fiche de personnage rangée hors du Bouquin serait à
             reclasser à la main dès sa naissance. */
          promouvoir={(nom) => {
            const id = creerPost('', post.espaceId)
            majPost(id, { titre: nom || 'Sans titre' })
            return id
          }}
          ouvrir={(id) => select(id)}
        />
      ) : (
        <div className="scroll">
          <article className="editor" key={forme?.id}>
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

            {forme && (
              <Editeur
                blocs={forme.blocs ?? []}
                ecrire={(blocs) => majForme(forme.id, { blocs })}
              />
            )}

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
              {!cover && (
                <button className="editor__ajoutCover" onClick={() => fichier.current?.click()} disabled={envoi}>
                  <IconImage size={14} />
                  {envoi ? 'Import…' : 'Image de couverture'}
                </button>
              )}
              Créé {libelleJour(post.createdAt).toLowerCase()} à {libelleHeure(post.createdAt)}
              {post.updatedAt - post.createdAt > 60_000 &&
                ` · modifié à ${libelleHeure(post.updatedAt)}`}
            </div>
          </article>
        </div>
      )}

      {ajout && (
        <div className="sheet" role="dialog" onClick={() => setAjout(false)}>
          <div className="sheet__panel rise" onClick={(e) => e.stopPropagation()}>
            <div className="menu__section">Ajouter une forme</div>
            <div className="menu">
              {AJOUTS.map((a) => (
                <button key={a.t} className="menu__item" onClick={() => ajouter(a.t)}>
                  <span className="menu__icone">
                    <a.icone size={17} />
                  </span>
                  <span className="menu__corps">
                    <span className="menu__nom">{LIBELLES[a.t]}</span>
                    <span className="menu__quoi">{a.quoi}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="menu__pied">
              La même idée, travaillée autrement. On peut en ajouter plusieurs du même type — deux
              cartes pour deux angles, une fiche par chapitre. Appuyer deux fois sur un onglet le
              renomme.
            </p>
          </div>
        </div>
      )}

      {aSupprimer && (
        <Confirmation
          titre="Supprimer cette note ?"
          detail={
            <>
              <strong>{titreDe(post)}</strong> — ses {formes.length} forme
              {formes.length > 1 ? 's' : ''}, son image et son contenu partent avec elle, sur tous
              tes appareils. C'est le seul geste qu'Atlas ne sait pas défaire.
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

/* Le champ de renommage d’un onglet.

   Son état est LOCAL : on n’écrit dans la note qu’une fois, à la
   validation. Écrire à chaque touche renommerait la forme lettre par
   lettre — et une note synchronisée enverrait autant de versions. */
function RenommerOnglet({
  nom,
  valider,
  annuler,
}: {
  nom: string
  valider: (n: string) => void
  annuler: () => void
}) {
  const [v, setV] = useState(nom)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  return (
    <input
      ref={ref}
      className="onglet onglet--saisie"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => valider(v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          valider(v)
        }
        if (e.key === 'Escape') annuler()
      }}
      aria-label={`Renommer ${nom}`}
    />
  )
}
