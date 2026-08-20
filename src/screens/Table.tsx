import { useRef, useState, type CSSProperties } from 'react'
import {
  clefEtiquette,
  etiquettesConnues,
  etiquettesDe,
  idDans,
  ligneVide,
  teinteEtiquette,
  teinteLibre,
  TEINTES,
  type Colonne,
  type Ligne,
  type TypeColonne,
} from '../store/formes'
import { oublierImage, stockerImage } from '../store/db'
import { lisible, peutAjouterImage, QUOTA_IMAGES } from '../store/quota'
import {
  IconCoche,
  IconImage,
  IconLien,
  IconPlus,
  IconTable,
  IconTrash,
} from '../ui/Icon'
import { useImageUrl } from '../ui/useImageUrl'

/* ---------------------------------------------------------------
   LA TABLE — les personnages, les lieux, les sources.

   C'est la Fiche de docs/01 § 5 : l'entité qu'on liste et qu'on
   relie. Ce n'en est PAS une base de données. La différence tient en
   trois refus, et ils sont ce qui garde la table du côté du § 8
   (« pas de bases de données relationnelles génériques, pas de
   formules, pas de 47 types de vues ») :

   · pas de formule — une cellule contient ce qu'on y écrit ;
   · pas de vue — une table, une seule façon de la regarder ;
   · pas de jointure — le lien vers une note est UN IDENTIFIANT
     (`ligne.postId`), pas une relation à maintenir.

   Ce `postId` est pourtant tout l'intérêt de la forme. Une ligne
   « Marc » reste une ligne tant que ça suffit ; le jour où Marc
   mérite mieux qu'une cellule, elle devient une note à part entière
   — avec ses fiches, ses dessins, sa place dans le flux — et la
   table en devient l'index. C'est « le lien, le vrai trésor » sans
   moteur relationnel.

   TOUTES LES VALEURS SONT DES CHAÎNES, y compris les cases à cocher
   (« oui » ou rien) et les nombres. Le type de colonne pilote la
   SAISIE et l'AFFICHAGE, jamais le stockage : changer une colonne de
   « texte » à « nombre » ne doit rien détruire, et une donnée qu'on
   ne sait plus interpréter doit rester lisible.
   --------------------------------------------------------------- */

const TYPES: { t: TypeColonne; nom: string; quoi: string }[] = [
  { t: 'texte', nom: 'Texte', quoi: 'Ce qu’on écrit librement.' },
  { t: 'nombre', nom: 'Nombre', quoi: 'Un âge, un tome, un rang.' },
  { t: 'date', nom: 'Date', quoi: 'Une vraie date de calendrier.' },
  { t: 'etiquette', nom: 'Étiquettes', quoi: 'Des mots-clés, séparés par des virgules.' },
  { t: 'case', nom: 'Case', quoi: 'Oui ou non.' },
  { t: 'image', nom: 'Image', quoi: 'Un visage, un lieu.' },
]

/** En deçà, une colonne n'affiche plus rien d'utile — même vide, on la voit. */
const LARGEUR_MIN = 72

/** Le style d'une étiquette, à partir de sa teinte. */
function styleEtiquette(mot: string, teintes?: Record<string, number>): CSSProperties {
  return { ['--h' as string]: teinteEtiquette(mot, teintes) }
}

export function Table({
  colonnes,
  lignes,
  ecrire,
  promouvoir,
  ouvrir,
}: {
  colonnes: Colonne[]
  lignes: Ligne[]
  ecrire: (patch: { colonnes?: Colonne[]; lignes?: Ligne[] }) => void
  /** crée une note portant ce nom et rend son identifiant */
  promouvoir: (nom: string) => string
  ouvrir: (postId: string) => void
}) {
  const [menuType, setMenuType] = useState<string | null>(null)
  const [ligneActive, setLigneActive] = useState<string | null>(null)

  /* LA LARGEUR EN COURS DE GLISSÉ NE PASSE PAS PAR LE MODÈLE.
     Écrire à chaque pixel parcouru enregistrerait la note, réveillerait
     la synchronisation et redessinerait toute la grille soixante fois
     par seconde. On tient donc l'aperçu ici, et on ne pose la valeur
     qu'en relâchant. */
  const [redim, setRedim] = useState<{ id: string; largeur: number } | null>(null)
  const glisse = useRef<{ x: number; largeur: number } | null>(null)
  const largeurDe = (c: Colonne) => (redim?.id === c.id ? redim.largeur : c.largeur)

  const majColonne = (id: string, patch: Partial<Colonne>) =>
    ecrire({ colonnes: colonnes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  const ajouterColonne = () =>
    ecrire({ colonnes: [...colonnes, { id: idDans('c'), nom: '', type: 'texte' }] })

  /* Retirer une colonne EFFACE AUSSI SES VALEURS. Les garder ferait
     une base qui grossit de ce qu'on croit avoir supprimé, et les
     images orphelines compteraient encore dans le quota. */
  const retirerColonne = (c: Colonne) => {
    if (c.type === 'image') {
      for (const l of lignes) if (l.cellules[c.id]) oublierImage(l.cellules[c.id])
    }
    ecrire({
      colonnes: colonnes.filter((x) => x.id !== c.id),
      lignes: lignes.map((l) => {
        const { [c.id]: _, ...reste } = l.cellules
        return { ...l, cellules: reste }
      }),
    })
    setMenuType(null)
  }

  const ajouterLigne = () => ecrire({ lignes: [...lignes, ligneVide()] })

  const majCellule = (ligneId: string, colonneId: string, valeur: string) =>
    ecrire({
      lignes: lignes.map((l) =>
        l.id === ligneId ? { ...l, cellules: { ...l.cellules, [colonneId]: valeur } } : l,
      ),
    })

  const retirerLigne = (l: Ligne) => {
    for (const c of colonnes) {
      if (c.type === 'image' && l.cellules[c.id]) oublierImage(l.cellules[c.id])
    }
    ecrire({ lignes: lignes.filter((x) => x.id !== l.id) })
    setLigneActive(null)
  }

  /* La promotion : la ligne garde sa place et gagne une note. Le nom
     vient de la PREMIÈRE COLONNE — celle qui nomme, par convention et
     parce que c'est la seule qu'on puisse deviner. */
  const promouvoirLigne = (l: Ligne) => {
    const nom = (l.cellules[colonnes[0]?.id ?? ''] ?? '').trim()
    const postId = promouvoir(nom)
    ecrire({ lignes: lignes.map((x) => (x.id === l.id ? { ...x, postId } : x)) })
  }

  return (
    <div className="table">
      <div className="table__defile">
        <table className="table__grille">
          <thead>
            <tr>
              {/* la colonne des gestes de ligne : sans en-tête, elle ne
                  nomme rien et ne doit donc rien afficher */}
              <th className="table__gouttiere" aria-label="Actions" />
              {colonnes.map((c) => (
                <th
                  key={c.id}
                  className="table__entete"
                  style={largeurDe(c) ? { width: largeurDe(c), minWidth: largeurDe(c) } : undefined}
                >
                  <input
                    className="table__nomColonne"
                    value={c.nom}
                    placeholder="Colonne"
                    onChange={(e) => majColonne(c.id, { nom: e.target.value })}
                    aria-label="Nom de la colonne"
                  />
                  <button
                    className="table__type"
                    aria-label={`Type de la colonne ${c.nom || ''}`}
                    onClick={() => setMenuType(menuType === c.id ? null : c.id)}
                  >
                    {TYPES.find((t) => t.t === c.type)?.nom ?? 'Texte'}
                  </button>

                  {menuType === c.id && (
                    <>
                      <span className="table__voile" onClick={() => setMenuType(null)} />
                      <div className="table__menu">
                        <div className="menu__section">Type de colonne</div>
                        {TYPES.map((t) => (
                          <button
                            key={t.t}
                            className="menu__item"
                            aria-pressed={c.type === t.t}
                            onClick={() => {
                              majColonne(c.id, { type: t.t })
                              setMenuType(null)
                            }}
                          >
                            <span className="menu__corps">
                              <span className="menu__nom">{t.nom}</span>
                              <span className="menu__quoi">{t.quoi}</span>
                            </span>
                          </button>
                        ))}
                        {c.type === 'etiquette' && (
                          <CouleursEtiquettes
                            colonne={c}
                            lignes={lignes}
                            poser={(teintes) => majColonne(c.id, { teintes })}
                          />
                        )}

                        <div className="menu__sep" />
                        <button
                          className="menu__item menu__item--danger"
                          onClick={() => retirerColonne(c)}
                        >
                          <span className="menu__icone">
                            <IconTrash size={15} />
                          </span>
                          <span className="menu__corps">
                            <span className="menu__nom">Retirer la colonne</span>
                            <span className="menu__quoi">Ses valeurs partent avec elle.</span>
                          </span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* LA POIGNÉE DE LARGEUR — au clavier et au doigt, elle
                      n'existe pas : la CSS ne la montre que sous un
                      pointeur fin. Sur téléphone, une table se lit en
                      défilant, et une zone de deux pixels au bord d'une
                      colonne serait un piège, pas un réglage.

                      Un double-clic REND LA COLONNE À LA MISE EN PAGE
                      AUTOMATIQUE : c'est la seule sortie possible d'une
                      largeur qu'on a rendue trop étroite sans le vouloir. */}
                  <span
                    className="table__redim"
                    aria-hidden="true"
                    onPointerDown={(e) => {
                      const th = e.currentTarget.closest('th') as HTMLElement | null
                      if (!th) return
                      glisse.current = {
                        x: e.clientX,
                        largeur: c.largeur ?? Math.round(th.getBoundingClientRect().width),
                      }
                      /* La capture garde le glissé vivant quand le pointeur
                         sort de la poignée — sept pixels de large, on en
                         sort au premier mouvement un peu vif. Elle peut
                         être refusée (pointeur déjà relâché) : ce n'est
                         pas une raison d'abandonner le redimensionnement. */
                      try {
                        e.currentTarget.setPointerCapture(e.pointerId)
                      } catch {
                        /* sans capture, le glissé marche tant qu'on reste dessus */
                      }
                      setRedim({ id: c.id, largeur: glisse.current.largeur })
                    }}
                    onPointerMove={(e) => {
                      const d = glisse.current
                      if (!d) return
                      setRedim({
                        id: c.id,
                        largeur: Math.max(LARGEUR_MIN, Math.round(d.largeur + e.clientX - d.x)),
                      })
                    }}
                    onPointerUp={() => {
                      if (glisse.current && redim) majColonne(c.id, { largeur: redim.largeur })
                      glisse.current = null
                      setRedim(null)
                    }}
                    onDoubleClick={() => majColonne(c.id, { largeur: undefined })}
                  />
                </th>
              ))}
              <th className="table__ajoutColonne">
                <button onClick={ajouterColonne} aria-label="Ajouter une colonne">
                  <IconPlus size={15} />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} data-actif={ligneActive === l.id || undefined}>
                <td className="table__gouttiere">
                  <button
                    className="table__poignee"
                    aria-label="Gestes de la ligne"
                    onClick={() => setLigneActive(ligneActive === l.id ? null : l.id)}
                  >
                    <span aria-hidden="true">⋮</span>
                  </button>

                  {ligneActive === l.id && (
                    <>
                      <span className="table__voile" onClick={() => setLigneActive(null)} />
                      <div className="table__menu">
                        {l.postId ? (
                          <button
                            className="menu__item"
                            onClick={() => {
                              setLigneActive(null)
                              ouvrir(l.postId!)
                            }}
                          >
                            <span className="menu__icone">
                              <IconLien size={15} />
                            </span>
                            <span className="menu__corps">
                              <span className="menu__nom">Ouvrir sa note</span>
                              <span className="menu__quoi">Cette ligne en a une.</span>
                            </span>
                          </button>
                        ) : (
                          <button
                            className="menu__item"
                            onClick={() => {
                              promouvoirLigne(l)
                              setLigneActive(null)
                            }}
                          >
                            <span className="menu__icone">
                              <IconLien size={15} />
                            </span>
                            <span className="menu__corps">
                              <span className="menu__nom">En faire une note</span>
                              <span className="menu__quoi">
                                Quand la ligne ne suffit plus à le dire.
                              </span>
                            </span>
                          </button>
                        )}
                        <div className="menu__sep" />
                        <button
                          className="menu__item menu__item--danger"
                          onClick={() => retirerLigne(l)}
                        >
                          <span className="menu__icone">
                            <IconTrash size={15} />
                          </span>
                          <span className="menu__corps">
                            <span className="menu__nom">Retirer la ligne</span>
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </td>

                {colonnes.map((c) => (
                  <td
                    key={c.id}
                    className="table__cellule"
                    data-type={c.type}
                    /* LA LARGEUR SE POSE AUSSI SUR LES CELLULES, sinon
                       elle ne sert à rien. Dans un tableau, une colonne
                       fait la largeur de son contenu le plus exigeant :
                       le plancher de 168 px des cellules l'emportait sur
                       l'en-tête, et une colonne tirée à 100 px revenait
                       sagement à 168 sans rien dire. On ne voyait pas un
                       refus — on voyait un réglage qui ne prend pas. */
                    style={
                      largeurDe(c) ? { width: largeurDe(c), minWidth: largeurDe(c) } : undefined
                    }
                  >
                    <Cellule
                      type={c.type}
                      valeur={l.cellules[c.id] ?? ''}
                      poser={(v) => majCellule(l.id, c.id, v)}
                      colonne={c}
                      lignes={lignes}
                      poserTeintes={(teintes) => majColonne(c.id, { teintes })}
                    />
                  </td>
                ))}

                <td className="table__cellule table__cellule--fin">
                  {l.postId && (
                    <button
                      className="table__lien"
                      aria-label="Ouvrir la note de cette ligne"
                      onClick={() => ouvrir(l.postId!)}
                    >
                      <IconLien size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="table__ajoutLigne" onClick={ajouterLigne}>
          <IconPlus size={15} />
          Ajouter une ligne
        </button>

        {!colonnes.length && (
          <div className="table__vide">
            <IconTable size={26} />
            <p>Une table sans colonne.</p>
            <button className="btn btn--accent" onClick={ajouterColonne}>
              Ajouter une colonne
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================= une cellule, selon son type ================= */

function Cellule({
  type,
  valeur,
  poser,
  colonne,
  lignes,
  poserTeintes,
}: {
  type: TypeColonne
  valeur: string
  poser: (v: string) => void
  colonne: Colonne
  lignes: Ligne[]
  poserTeintes: (teintes: Record<string, number>) => void
}) {
  switch (type) {
    case 'case':
      return (
        <button
          className="table__case"
          role="checkbox"
          aria-checked={valeur === 'oui'}
          aria-label="Oui ou non"
          onClick={() => poser(valeur === 'oui' ? '' : 'oui')}
        >
          {valeur === 'oui' && <IconCoche size={13} />}
        </button>
      )

    case 'nombre':
      return (
        <input
          className="table__champ table__champ--nombre"
          value={valeur}
          inputMode="decimal"
          onChange={(e) => poser(e.target.value)}
        />
      )

    case 'date':
      return (
        <input
          className="table__champ"
          type="date"
          value={valeur}
          onChange={(e) => poser(e.target.value)}
        />
      )

    case 'etiquette':
      return (
        <Etiquettes
          valeur={valeur}
          poser={poser}
          colonne={colonne}
          lignes={lignes}
          poserTeintes={poserTeintes}
        />
      )

    case 'image':
      return <CelluleImage valeur={valeur} poser={poser} />

    default:
      return (
        <input className="table__champ" value={valeur} onChange={(e) => poser(e.target.value)} />
      )
  }
}

/**
 * Les étiquettes se STOCKENT en une chaîne séparée par des virgules.
 *
 * Un tableau serait plus propre en mémoire et plus pénible partout
 * ailleurs : l'export markdown, la recherche et le changement de type
 * de colonne lisent tous une chaîne. La virgule est ce que les gens
 * tapent de toute façon.
 *
 * ── LA COLONNE EST UN VOCABULAIRE, PAS UN CHAMP LIBRE
 *
 * La saisie était un simple champ texte : on y retapait « antagoniste »
 * à chaque ligne, en se trompant une fois sur cinq. Une colonne
 * d'étiquettes ne vaut que si les mêmes mots reviennent — c'est ce qui
 * permet de la lire d'un coup d'œil et d'y voir des groupes. On
 * REPROPOSE donc ce que la colonne contient déjà, avec sa couleur, et
 * taper reste possible : la liste guide, elle n'enferme pas.
 */
function Etiquettes({
  valeur,
  poser,
  colonne,
  lignes,
  poserTeintes,
}: {
  valeur: string
  poser: (v: string) => void
  colonne: Colonne
  lignes: Ligne[]
  poserTeintes: (teintes: Record<string, number>) => void
}) {
  const [saisie, setSaisie] = useState(false)
  const [brouillon, setBrouillon] = useState('')
  const mots = etiquettesDe(valeur)
  const vocabulaire = etiquettesConnues(colonne.id, lignes)

  const fermer = () => {
    setSaisie(false)
    setBrouillon('')
  }

  /* Ajouter ne DOUBLONNE JAMAIS, casse comprise : « Héros » posé sur
     une ligne qui porte déjà « héros » ne fait rien. Deux graphies du
     même mot dans une même cellule ne veulent rien dire. */
  const ajouter = (mot: string) => {
    const net = mot.trim()
    if (!net) return
    if (!mots.some((m) => clefEtiquette(m) === clefEtiquette(net))) {
      poser([...mots, net].join(', '))

      /* UNE ÉTIQUETTE NEUVE RÉSERVE SA COULEUR EN NAISSANT.
         C'est le seul moment où on peut le faire sans mentir : plus
         tard, la même étiquette existe ailleurs dans la colonne, et
         lui changer sa teinte repeindrait des lignes qu'on n'a pas
         touchées. */
      if (!vocabulaire.some((m) => clefEtiquette(m) === clefEtiquette(net))) {
        const libre = teinteLibre(net, vocabulaire, colonne.teintes)
        if (libre !== null) {
          poserTeintes({ ...(colonne.teintes ?? {}), [clefEtiquette(net)]: libre })
        }
      }
    }
    setBrouillon('')
  }

  const retirer = (mot: string) => poser(mots.filter((m) => m !== mot).join(', '))

  if (!saisie) {
    return (
      <button className="table__etiquettes" onClick={() => setSaisie(true)}>
        {mots.length ? (
          mots.map((m, i) => (
            <span key={i} className="table__etiquette" style={styleEtiquette(m, colonne.teintes)}>
              {m}
            </span>
          ))
        ) : (
          <span className="table__creux">—</span>
        )}
      </button>
    )
  }

  const pris = new Set(mots.map(clefEtiquette))
  const filtre = clefEtiquette(brouillon)
  const propositions = vocabulaire.filter(
    (m) => !pris.has(clefEtiquette(m)) && (!filtre || clefEtiquette(m).includes(filtre)),
  )
  /* « Créer » ne s'affiche que si le mot n'est nulle part dans la
     colonne : sinon la proposition suffit, et deux chemins pour la
     même chose font hésiter. */
  const inedit = filtre.length > 0 && !vocabulaire.some((m) => clefEtiquette(m) === filtre)

  return (
    <>
      <span className="table__voile" onClick={fermer} />
      <div className="etiq">
        <div className="etiq__champ">
          {mots.map((m, i) => (
            <span key={i} className="table__etiquette" style={styleEtiquette(m, colonne.teintes)}>
              {m}
              <button
                className="etiq__retrait"
                aria-label={`Retirer ${m}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => retirer(m)}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="etiq__saisie"
            autoFocus
            value={brouillon}
            placeholder={mots.length ? '' : 'Ajouter…'}
            aria-label="Ajouter une étiquette"
            onChange={(e) => {
              const v = e.target.value
              // la virgule VALIDE le mot, elle ne s'écrit pas
              if (v.endsWith(',')) ajouter(v.slice(0, -1))
              else setBrouillon(v.replace(/,/g, ''))
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ajouter(brouillon)
              }
              if (e.key === 'Escape') fermer()
              /* Effacer sur un champ vide retire la dernière étiquette :
                 c'est le geste qu'on fait sans y penser, et sans lui il
                 faut viser une croix de dix pixels. */
              if (e.key === 'Backspace' && !brouillon && mots.length) {
                retirer(mots[mots.length - 1])
              }
            }}
          />
        </div>

        {(propositions.length > 0 || inedit) && (
          <div className="etiq__liste">
            {propositions.map((m) => (
              <button
                key={m}
                className="etiq__proposition"
                /* Le pointeur ne doit pas voler le focus du champ : sans
                   ça, le clic déclenche un blur qui ferme l'éditeur avant
                   que le clic n'arrive. */
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => ajouter(m)}
              >
                <span className="etiq__pastille" style={styleEtiquette(m, colonne.teintes)} />
                {m}
              </button>
            ))}
            {inedit && (
              <button
                className="etiq__proposition etiq__proposition--neuve"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => ajouter(brouillon)}
              >
                <IconPlus size={13} />
                Créer « {brouillon.trim()} »
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Le réglage des couleurs, dans le menu de la colonne.
 *
 * IL VIT AVEC LA COLONNE, PAS AVEC LA CELLULE. Une étiquette n'a pas
 * une couleur par ligne : « antagoniste » est rouge dans toute la
 * table, ou nulle part. Mettre le choix dans une cellule laisserait
 * croire le contraire, et donnerait envie de le refaire vingt fois.
 */
function CouleursEtiquettes({
  colonne,
  lignes,
  poser,
}: {
  colonne: Colonne
  lignes: Ligne[]
  poser: (teintes: Record<string, number>) => void
}) {
  const [ouverte, setOuverte] = useState<string | null>(null)
  const connues = etiquettesConnues(colonne.id, lignes)
  if (!connues.length) return null

  return (
    <>
      <div className="menu__sep" />
      <div className="menu__section">Couleur des étiquettes</div>
      <div className="etiq__reglage">
        {connues.map((m) => (
          <div key={m} className="etiq__rangee">
            <button
              className="table__etiquette etiq__cible"
              style={styleEtiquette(m, colonne.teintes)}
              aria-expanded={ouverte === m}
              onClick={() => setOuverte(ouverte === m ? null : m)}
            >
              {m}
            </button>

            {ouverte === m && (
              <div className="etiq__palette">
                {TEINTES.map((h) => (
                  <button
                    key={h}
                    className="etiq__choix"
                    style={{ ['--h' as string]: h }}
                    aria-label={`Teinte ${h}`}
                    aria-pressed={teinteEtiquette(m, colonne.teintes) === h}
                    onClick={() => poser({ ...(colonne.teintes ?? {}), [clefEtiquette(m)]: h })}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function CelluleImage({ valeur, poser }: { valeur: string; poser: (v: string) => void }) {
  const url = useImageUrl(valeur || null)
  const fichier = useRef<HTMLInputElement>(null)
  const [envoi, setEnvoi] = useState(false)

  const importer = async (f: File | undefined) => {
    if (!f) return
    // le plafond se dit AVANT le travail de réduction, pas après
    if (!peutAjouterImage(f.size)) {
      alert(
        `Plafond d'images atteint (${lisible(QUOTA_IMAGES)}). Écrire, en revanche, n'est jamais bloqué.`,
      )
      return
    }
    setEnvoi(true)
    try {
      if (valeur) oublierImage(valeur)
      poser(await stockerImage(f))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <>
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
      <button
        className="table__vignette"
        onClick={() => fichier.current?.click()}
        disabled={envoi}
        aria-label={valeur ? 'Remplacer l’image' : 'Choisir une image'}
      >
        {url ? <img src={url} alt="" /> : <IconImage size={15} />}
      </button>
      {valeur && (
        <button
          className="table__vignetteRetrait"
          aria-label="Retirer l’image"
          onClick={() => {
            oublierImage(valeur)
            poser('')
          }}
        >
          <IconTrash size={12} />
        </button>
      )}
    </>
  )
}
