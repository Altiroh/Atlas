import { useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
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
  IconBolt,
  IconClose,
  IconCoche,
  IconFolder,
  IconRestore,
  IconSearch,
  IconTrash,
} from '../ui/Icon'
import { Confirmation } from '../ui/Confirmation'
import { BarreSelection, useAppuiLong, useSelection } from '../ui/Selection'
import { SwipeRow } from '../ui/SwipeRow'
import { useImageUrl } from '../ui/useImageUrl'

/* ---------------------------------------------------------------
   Le Flux. Pas « l'Inbox » : aucun compteur de retard, aucun zéro à
   atteindre (docs/02 § 4.1). Un post qui reste libre n'est pas un
   échec — c'est pour ça que la recherche est en tête d'écran.

   Le balayage est le geste de tri promis pour l'iPad, étendu aux
   trois supports :
   · vers la droite → Archiver ou Supprimer — « je n'en veux plus
     ici », avec le choix de ce que ça coûte ;
   · vers la gauche → Classer, le tri « tiré par le projet ».

   Et l'APPUI LONG ouvre la sélection multiple, ici comme dans les
   archives et les espaces. Un même geste, trois listes.
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
  const pret = useAtlas((s) => s.pret)
  const espaces = useAtlas((s) => s.espaces)
  const selectedId = useAtlas((s) => s.selectedId)
  const query = useAtlas((s) => s.query)
  const espaceActif = useAtlas((s) => s.espaceActif)
  const setQuery = useAtlas((s) => s.setQuery)
  const setEspaceActif = useAtlas((s) => s.setEspaceActif)
  const select = useAtlas((s) => s.select)
  const archiver = useAtlas((s) => s.archiver)
  const restaurer = useAtlas((s) => s.restaurer)
  const setNav = useAtlas((s) => s.setNav)

  const supprimerPosts = useAtlas((s) => s.supprimerPosts)
  const archiverPosts = useAtlas((s) => s.archiverPosts)
  const restaurerPosts = useAtlas((s) => s.restaurerPosts)

  const [archives, setArchives] = useState(false)
  const [ouvertId, setOuvertId] = useState<string | null>(null)
  const [aClasser, setAClasser] = useState<string | null>(null)
  /** les notes dont on vient de demander la suppression — une ou cinquante */
  const [aSupprimer, setASupprimer] = useState<string[] | null>(null)
  const sel = useSelection()

  /* Ce que la liste montre à cet instant — filtre, recherche et
     archives compris. « Tout sélectionner » ne doit jamais dépasser
     ce que l'écran affiche : cocher des notes qu'on ne voit pas, puis
     les supprimer, serait un piège. */
  const visibles = useMemo(
    () => filtrer(posts, query, espaceActif, archives),
    [posts, query, espaceActif, archives],
  )
  const groupes = useMemo(() => grouperParJour(visibles), [visibles])
  const espace = espaceOf(espaces, espaceActif)
  const nbArchives = posts.filter((p) => p.etat === 'archivee').length

  /* Le vide propose la seule chose qui ait du sens : écrire. On lève
     aussi le filtre et la recherche au passage — les garder ferait
     retomber sur un écran vide juste après avoir capturé. */
  const ouvrirCapture = () => {
    setQuery('')
    setEspaceActif(null)
    setNav('capture')
  }

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
        {!pret ? (
          /* La base n'a pas encore répondu. On montre la FORME de ce qui
             arrive plutôt qu'une roue qui tourne : à la milliseconde où
             les notes arrivent, rien ne bouge de place. */
          <div className="squelettes">
            {[0, 1, 2, 3].map((i) => (
              <div className="squelette" key={i}>
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : groupes.length === 0 ? (
          /* Trois vides, trois messages. « Rien qui corresponde » servi à
             quelqu'un qui n'a simplement rien écrit encore lui répond à
             côté — et c'est le tout premier écran qu'il voit. */
          <div className="empty">
            {archives ? (
              <>
                <div className="empty__title">Aucune archive</div>
                <div className="empty__sub">
                  Ce qui n'est plus dans le flux atterrit ici, jamais à la poubelle.
                </div>
              </>
            ) : posts.length === 0 ? (
              <>
                <div className="empty__icon">
                  <IconBolt size={22} />
                </div>
                <div className="empty__title">Rien encore</div>
                <div className="empty__sub">
                  C'est normal : Atlas commence vide. Capture une idée — même mal formulée, même en
                  trois mots. Le tri viendra le jour où un projet en aura besoin.
                </div>
                <button className="btn btn--accent" style={{ marginTop: 14 }} onClick={ouvrirCapture}>
                  Capturer une idée
                </button>
              </>
            ) : (
              <>
                <div className="empty__title">Rien qui corresponde</div>
                <div className="empty__sub">
                  Essaie un autre mot — la recherche regarde le texte entier, pas seulement les
                  titres.
                </div>
              </>
            )}
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
                  fige={sel.actif}
                  /* TIRER VERS LA DROITE PROPOSE LE CHOIX : sortir la
                     note du flux, ou l'effacer pour de bon. Les deux
                     gestes se ressemblent dans l'intention — « je n'en
                     veux plus ici » — et se distinguent par ce qu'ils
                     coûtent. Les mettre côte à côte, c'est poser la
                     question au moment où on se la pose. */
                  gauche={[
                    archives
                      ? {
                          label: 'Restaurer',
                          icone: <IconRestore size={19} />,
                          ton: 'var(--accent-h) var(--accent-s) 45%',
                          faire: () => restaurer(p.id),
                        }
                      : {
                          label: 'Archiver',
                          icone: <IconArchive size={19} />,
                          ton: '36 80% 45%',
                          faire: () => archiver(p.id),
                        },
                    {
                      label: 'Supprimer',
                      icone: <IconTrash size={18} />,
                      ton: '2 74% 50%',
                      faire: () => setASupprimer([p.id]),
                    },
                  ]}
                  /* Classer part de l'autre bord : ce n'est pas le même
                     mouvement d'esprit — on range, on ne se débarrasse
                     pas. Les archives n'ont rien à y ranger. */
                  droite={
                    archives
                      ? undefined
                      : [
                          {
                            label: 'Classer',
                            icone: <IconFolder size={19} />,
                            ton: 'var(--accent-h) var(--accent-s) 45%',
                            faire: () => setAClasser(p.id),
                          },
                        ]
                  }
                >
                  <ItemPost
                    post={p}
                    actif={selectedId === p.id}
                    coche={sel.actif ? sel.ids.has(p.id) : undefined}
                    espace={espaceOf(espaces, p.espaceId)}
                    appuiLong={() => sel.basculer(p.id)}
                    onClick={() => {
                      if (sel.actif) return sel.basculer(p.id)
                      select(p.id)
                      onPick?.(p.id)
                    }}
                  />
                </SwipeRow>
              ))}
            </section>
          ))
        )}

        {/* TOUJOURS LÀ, même à zéro archive. Le bouton n'apparaissait
            qu'une fois quelque chose archivé : on ne pouvait donc pas
            savoir que les archives existaient avant d'y avoir mis
            quelque chose, ni vérifier qu'on n'y avait rien laissé.
            Un lieu dont l'entrée n'est visible qu'une fois qu'on y est
            entré n'est pas un lieu. */}
        <button
          className="flux__archives"
          onClick={() => {
            sel.vider()
            setArchives(!archives)
          }}
        >
          <IconArchive size={15} />
          {archives ? 'Revenir au flux' : nbArchives ? `Archives (${nbArchives})` : 'Archives'}
        </button>
      </div>

      {aClasser && (
        <ChoixEspace id={aClasser} onFermer={() => setAClasser(null)} />
      )}

      {sel.actif && (
        <BarreSelection
          n={sel.ids.size}
          total={visibles.length}
          onTout={() => sel.tout(visibles.map((p) => p.id))}
          onVider={sel.vider}
        >
          {archives ? (
            <button
              className="selbar__btn"
              onClick={() => {
                restaurerPosts([...sel.ids])
                sel.vider()
              }}
            >
              <IconRestore size={15} />
              <span className="selbar__mot">Restaurer</span>
            </button>
          ) : (
            <button
              className="selbar__btn"
              onClick={() => {
                archiverPosts([...sel.ids])
                sel.vider()
              }}
            >
              <IconArchive size={15} />
              <span className="selbar__mot">Archiver</span>
            </button>
          )}
          <button className="selbar__btn selbar__btn--danger" onClick={() => setASupprimer([...sel.ids])}>
            <IconTrash size={15} />
            <span className="selbar__mot">Supprimer</span>
          </button>
        </BarreSelection>
      )}

      {/* UNE SEULE CONFIRMATION POUR LES DEUX CHEMINS — le balayage sur
          une ligne et la sélection multiple. Supprimer cinquante notes
          ne doit pas être plus facile qu'en supprimer une ; c'est même
          le seul endroit où la question se pose vraiment. */}
      {aSupprimer && (
        <Confirmation
          titre={
            aSupprimer.length > 1
              ? `Supprimer ${aSupprimer.length} notes ?`
              : 'Supprimer cette note ?'
          }
          detail={
            aSupprimer.length > 1 ? (
              <>
                Elles partent avec leur contenu et leurs images, sur tous tes appareils. C'est le
                seul geste qu'Atlas ne sait pas défaire — <strong>archiver</strong>, lui, ne perd
                rien.
              </>
            ) : (
              <>
                <strong>{titreDe(posts.find((p) => p.id === aSupprimer[0]) ?? ({} as Post))}</strong>{' '}
                part avec son contenu et ses images, sur tous tes appareils.
              </>
            )
          }
          action="Supprimer"
          onConfirmer={() => {
            supprimerPosts(aSupprimer)
            setASupprimer(null)
            sel.vider()
          }}
          onAnnuler={() => setASupprimer(null)}
        />
      )}
    </>
  )
}

function ItemPost({
  post,
  actif,
  coche,
  espace,
  appuiLong,
  onClick,
}: {
  post: Post
  actif: boolean
  /** `undefined` hors sélection : la case n'existe même pas */
  coche?: boolean
  espace: { nom: string; hue: number } | null
  appuiLong: () => void
  onClick: () => void
}) {
  const vignette = useImageUrl(post.coverId)
  const extrait = post.titre.trim() ? post.texte : post.texte.split('\n').slice(1).join(' ')
  const long = useAppuiLong(appuiLong)

  return (
    <button
      className="item"
      aria-current={actif}
      data-coche={coche}
      onClick={onClick}
      {...long}
    >
      {coche !== undefined && (
        <span className="item__case" aria-hidden="true">
          {coche && <IconCoche size={13} />}
        </span>
      )}
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

  /* ELLE SORT DE L'ÉCRAN QUI L'OUVRE, PAR UN PORTAIL.

     Une feuille est `position: fixed` avec `z-index: 60`, contre 20
     pour le rail de navigation : sur le papier elle passe devant, et
     à l'écran elle passait derrière. Le CSS n'est pas en cause — le
     RÉFÉRENTIEL l'est. Rendue dans le panneau, elle hérite du contexte
     d'empilement que le verre de ce panneau crée (`backdrop-filter`
     en fabrique un, comme `transform` et `filter`), et son 60 ne vaut
     plus que DANS ce contexte-là. Le rail, lui, compare son 20 à
     l'échelle de la page — et gagne.

     C'est le même piège que pour la confirmation, et il se répare de
     la même façon : on rend dans `document.body`, où le z-index veut
     enfin dire ce qu'il dit. */
  return createPortal(
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
    </div>,
    document.body,
  )
}
