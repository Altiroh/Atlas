import { useMemo, useState, type CSSProperties } from 'react'
import {
  aUneCouleur,
  espaceOf,
  filtrer,
  grouperParJour,
  libelleHeure,
  SANS_ESPACE,
  titreDe,
  useAtlas,
  type Post,
} from '../store/atlas'
import {
  IconArchive,
  IconClose,
  IconFolder,
  IconRestore,
  IconSearch,
} from '../ui/Icon'
import { SwipeRow } from '../ui/SwipeRow'
import { useImageUrl } from '../ui/useImageUrl'

/* ---------------------------------------------------------------
   Le Flux. Pas « l'Inbox » : aucun compteur de retard, aucun zéro à
   atteindre (docs/02 § 4.1). Un post qui reste libre n'est pas un
   échec — c'est pour ça que la recherche est en tête d'écran.

   Le balayage est le geste de tri promis pour l'iPad, étendu aux
   trois supports :
   · vers la droite → Classer, le tri « tiré par le projet » ;
   · vers la gauche → Archiver, qui ne supprime jamais rien.
   --------------------------------------------------------------- */

/* ---------------------------------------------------------------
   Le bandeau d'espace.

   Il réemploie exactement la matière des cartes du panneau Espaces —
   mêmes classes, même halo déduit de `--sc-h`, même filigrane. Ce
   n'est pas de l'économie de code : c'est ce qui fait qu'on RECONNAÎT
   l'espace en arrivant. Une carte orange dans la grille, un bandeau
   orange dans le flux : c'est le même lieu, et ça se voit avant qu'on
   ait lu le nom.
   --------------------------------------------------------------- */

function EnTete({
  titre,
  hue,
  imageId,
  n,
  onFermer,
}: {
  titre: string
  hue?: number
  imageId?: string | null
  n: number
  onFermer: () => void
}) {
  const image = useImageUrl(imageId ?? null)
  const teinte = hue !== undefined && aUneCouleur(hue)

  return (
    <div
      className={`esp__carte esp__banniere${teinte ? '' : ' esp__carte--neutre'}`}
      style={teinte ? ({ '--sc-h': hue } as CSSProperties) : undefined}
    >
      {teinte && <span className="esp__halo" aria-hidden="true" />}
      {image && <img className="esp__img" src={image} alt="" />}

      <span className="esp__filigrane" aria-hidden="true">
        {n}
      </span>

      <span className="esp__corps">
        <span className="esp__nom">{titre}</span>
        <span className="esp__compte">
          {n} note{n > 1 ? 's' : ''}
        </span>
      </span>

      <button className="esp__quitter" onClick={onFermer} aria-label="Revenir à tout le flux">
        <IconClose size={16} />
      </button>
    </div>
  )
}

export function FluxPanel({ onPick }: { onPick?: (id: string) => void }) {
  const posts = useAtlas((s) => s.posts)
  const espaces = useAtlas((s) => s.espaces)
  const selectedId = useAtlas((s) => s.selectedId)
  const query = useAtlas((s) => s.query)
  const espaceActif = useAtlas((s) => s.espaceActif)
  const setQuery = useAtlas((s) => s.setQuery)
  const setEspaceActif = useAtlas((s) => s.setEspaceActif)
  const select = useAtlas((s) => s.select)
  const archiver = useAtlas((s) => s.archiver)
  const restaurer = useAtlas((s) => s.restaurer)

  const [archives, setArchives] = useState(false)
  const [ouvertId, setOuvertId] = useState<string | null>(null)
  const [aClasser, setAClasser] = useState<string | null>(null)

  const groupes = useMemo(
    () => grouperParJour(filtrer(posts, query, espaceActif, archives)),
    [posts, query, espaceActif, archives],
  )
  const espace = espaceOf(espaces, espaceActif)
  const nbArchives = posts.filter((p) => p.etat === 'archivee').length

  return (
    <>
      <div className="searchbar">
        <IconSearch size={17} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher dans tout"
          aria-label="Chercher dans le flux"
        />
      </div>

      {/* Entrer dans un espace, ce n'est pas « appliquer un filtre » :
          c'est ouvrir un lieu. Il se présente donc avec ce que
          l'utilisateur y a mis — son nom, sa couleur, son image — plutôt
          qu'avec une pastille grise qui pourrait dire n'importe quoi.

          « Non triés » a droit au même bandeau, en neutre : c'est bien
          un lieu, mais personne ne l'a décoré. */}
      {espaceActif === SANS_ESPACE ? (
        <EnTete
          titre="Non triés"
          n={posts.filter((p) => !p.espaceId && p.etat !== 'archivee').length}
          onFermer={() => setEspaceActif(null)}
        />
      ) : (
        espace && (
          <EnTete
            titre={espace.nom}
            hue={espace.hue}
            imageId={espace.imageId}
            n={posts.filter((p) => p.espaceId === espace.id && p.etat !== 'archivee').length}
            onFermer={() => setEspaceActif(null)}
          />
        )
      )}

      <div className="scroll">
        {groupes.length === 0 ? (
          <div className="empty">
            <div className="empty__title">
              {archives ? 'Aucune archive' : 'Rien qui corresponde'}
            </div>
            <div className="empty__sub">
              {archives
                ? "Ce qui n'est plus dans le flux atterrit ici, jamais à la poubelle."
                : 'Essaie un autre mot — la recherche regarde le texte entier, pas seulement les titres.'}
            </div>
          </div>
        ) : (
          groupes.map((g) => (
            <section className="daygroup" key={g.label}>
              <h3 className="daygroup__label">{g.label}</h3>
              {g.items.map((p) => (
                <SwipeRow
                  key={p.id}
                  id={p.id}
                  ouvertId={ouvertId}
                  onOuvrir={setOuvertId}
                  gauche={
                    archives
                      ? {
                          label: 'Restaurer',
                          icone: <IconRestore size={19} />,
                          ton: 'var(--accent-h) var(--accent-s) 45%',
                          faire: () => restaurer(p.id),
                        }
                      : {
                          label: 'Classer',
                          icone: <IconFolder size={19} />,
                          ton: 'var(--accent-h) var(--accent-s) 45%',
                          faire: () => setAClasser(p.id),
                        }
                  }
                  droite={
                    archives
                      ? undefined
                      : {
                          label: 'Archiver',
                          icone: <IconArchive size={19} />,
                          ton: '36 80% 45%',
                          faire: () => archiver(p.id),
                        }
                  }
                >
                  <ItemPost
                    post={p}
                    actif={selectedId === p.id}
                    espace={espaceOf(espaces, p.espaceId)}
                    onClick={() => {
                      select(p.id)
                      onPick?.(p.id)
                    }}
                  />
                </SwipeRow>
              ))}
            </section>
          ))
        )}

        {(nbArchives > 0 || archives) && (
          <button className="flux__archives" onClick={() => setArchives(!archives)}>
            <IconArchive size={15} />
            {archives ? 'Revenir au flux' : `Archives (${nbArchives})`}
          </button>
        )}
      </div>

      {aClasser && (
        <ChoixEspace id={aClasser} onFermer={() => setAClasser(null)} />
      )}
    </>
  )
}

function ItemPost({
  post,
  actif,
  espace,
  onClick,
}: {
  post: Post
  actif: boolean
  espace: { nom: string; hue: number } | null
  onClick: () => void
}) {
  const vignette = useImageUrl(post.coverId)
  const extrait = post.titre.trim() ? post.texte : post.texte.split('\n').slice(1).join(' ')

  return (
    <button className="item" aria-current={actif} onClick={onClick}>
      {vignette && <img className="item__vignette" src={vignette} alt="" />}
      <div className="item__corps">
        <div className="item__titre">{titreDe(post)}</div>
        {extrait.trim() && <div className="item__extrait">{extrait}</div>}
        <div className="item__meta">
          <span>{libelleHeure(post.createdAt)}</span>
          {post.carte && (
            <>
              <span aria-hidden="true">·</span>
              <span>carte</span>
            </>
          )}
          {espace && (
            <>
              <span aria-hidden="true">·</span>
              <span className="item__space">
                <i style={{ background: `hsl(${espace.hue} 78% 55%)` }} />
                {espace.nom}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

/* Le tri « tiré par le projet » : on choisit l'espace au moment où
   on en a besoin, pas au moment de la capture (docs/02 § 4.2). */
function ChoixEspace({ id, onFermer }: { id: string; onFermer: () => void }) {
  const espaces = useAtlas((s) => s.espaces)
  const post = useAtlas((s) => s.posts.find((p) => p.id === id))
  const majPost = useAtlas((s) => s.majPost)

  if (!post) return null

  const choisir = (espaceId: string | null) => {
    majPost(id, { espaceId })
    onFermer()
  }

  return (
    <div className="sheet" role="dialog" aria-label="Classer dans un espace" onClick={onFermer}>
      <div className="sheet__panel rise" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h3 className="sheet__titre">Classer</h3>
          <button className="btn btn--icon" onClick={onFermer} aria-label="Fermer">
            <IconClose size={18} />
          </button>
        </div>

        <p className="sheet__note" style={{ marginTop: 0, marginBottom: 14 }}>
          {titreDe(post)}
        </p>

        <div className="choix">
          {espaces.map((e) => (
            <button
              key={e.id}
              className="choix__item"
              aria-current={post.espaceId === e.id}
              onClick={() => choisir(e.id)}
            >
              <i style={{ background: `hsl(${e.hue} 80% 56%)` }} />
              {e.nom}
            </button>
          ))}
          <button
            className="choix__item"
            aria-current={post.espaceId === null}
            onClick={() => choisir(null)}
          >
            <i style={{ background: 'var(--text-3)' }} />
            Aucun espace
          </button>
        </div>
      </div>
    </div>
  )
}
