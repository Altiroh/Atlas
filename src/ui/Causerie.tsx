import { useEffect, useRef, useState } from 'react'
import {
  chercherConsigne,
  chercherFamille,
  chercherScriptEtScore,
  FAMILLES,
  SCRIPTS,
  scriptParId,
  scriptsDe,
  type Annulation,
  type Famille,
  type Resultat,
  type Script,
} from '../store/scripts'
import {
  civilite,
  incompris,
  NOMBRE_DE_SUJETS,
  parQuestion,
  sujet,
  sujetsDe,
  THEMES,
  type Reponse,
  type Theme,
} from '../store/conversation'
import { Confirmation } from './Confirmation'
import {
  IconChevron,
  IconClose,
  IconCoche,
  IconPleinEcran,
  IconReduire,
  IconRestore,
} from './Icon'
import { OeilAtlas } from './OeilAtlas'

/* ---------------------------------------------------------------
   LA CONVERSATION AVEC ATLAS.

   Atlas ne sait pas encore penser — mais il sait FAIRE, et c'est
   déjà une conversation. Une trentaine de logiques déterministes
   (voir `store/scripts.ts`), qu'on lui demande en toutes lettres.

   ── CE QU'ELLE N'EST PAS

   Ce n'est PAS un faux dialogue. Atlas ne répond jamais « bien sûr,
   je m'en occupe ! » : il rend un résultat, ou il dit qu'il ne
   comprend pas et montre ce qu'il sait faire. Une fausse
   compréhension coûte plus cher qu'un « je ne sais pas » — c'est
   elle qui apprend à ne plus faire confiance.

   ── LES QUATRE RÈGLES DE LA PROPOSITION

   1. Elle MONTRE les éléments, décochables un par un. Jamais un
      bloc à accepter les yeux fermés.
   2. Elle DIT POURQUOI, et la règle exacte est à un appui de là.
   3. Elle S'ANNULE, sauf ce qui supprime — qui passe par une
      confirmation avant.
   4. Elle NE S'INVITE PAS. Rien ne se déclenche seul. Le briefing
      d'ouverture est la seule exception, et c'est le contrat de D1 :
      « une seule sollicitation à la fois » (§ 7).
   --------------------------------------------------------------- */

type Tour =
  | { k: 'moi'; texte: string }
  | { k: 'dit'; texte: string; suites?: string[] }
  | { k: 'capacites' }
  | { k: 'sommaire' }
  | { k: 'theme'; theme: Theme | 'tout' }
  | { k: 'famille'; famille: Famille }
  | { k: 'regle'; scriptId: string }
  | { k: 'resultat'; scriptId: string; res: Resultat; pris: string[]; fait?: string }
  | { k: 'annulation'; libelle: string; defaire: () => void; utilisee?: boolean }

/** Les quatre demandes qu'on fait tout le temps, à portée d'appui. */
const RACCOURCIS = [
  { mot: 'Que sais-tu faire ?', envoi: '?' },
  { mot: 'Où j’en suis', envoi: 'briefing' },
  { mot: 'Range', envoi: 'ranger' },
  { mot: 'Nettoie', envoi: 'nettoyer' },
  { mot: 'De quoi peux-tu parler ?', envoi: 'de quoi peux-tu parler' },
]

/* Volontairement ÉTROIT. Il contenait « comment » et « quoi » : toute
   question de la forme « comment marche la synchro » tombait donc sur
   la liste des capacités, alors que la bibliothèque avait la réponse. */
const AIDE = /^(\?+\s*$|aide$|help$|que sais.?tu|tes capacit|capacites$)/i

/* Le sommaire des paroles, par opposition à celui des actions. */
const SOMMAIRE = /de quoi (peux|peut|sais)|quels sujets|sommaire|de quoi parler/i

export function Causerie({ fermer }: { fermer: () => void }) {
  const [tours, setTours] = useState<Tour[]>(() => [
    {
      k: 'dit',
      texte:
        'Je n’ai pas d’intelligence — j’ai des règles, et je les connais par cœur. Voilà où tu en es.',
      suites: ['De quoi peux-tu parler ?'],
    },
    ...lancer('briefing'),
  ])
  const [texte, setTexte] = useState('')
  /* LA PLEINE PAGE.

     Le panneau de droite convient à une question — on garde sa note
     sous les yeux, on demande, on referme. Il ne convient plus dès
     qu'Atlas rend une carte à travailler : quarante-deux pour cent de
     la largeur pour une liste de douze notes à cocher, chacune avec
     son détail, c'est une colonne où tout se replie sur deux lignes.

     La pleine page n'est donc pas un confort d'affichage, c'est le
     mode de travail : plus de rail, plus d'onglets, plus de note
     derrière — la conversation et rien d'autre. On y entre et on en
     sort d'un même bouton, et l'état ne survit pas à la fermeture :
     rouvrir Atlas pour une question doit redonner la petite fenêtre. */
  const [plein, setPlein] = useState(false)
  const [aConfirmer, setAConfirmer] = useState<{ tour: number; ids: string[] } | null>(null)
  const champ = useRef<HTMLInputElement>(null)
  const fin = useRef<HTMLDivElement>(null)

  useEffect(() => champ.current?.focus(), [])
  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [tours])

  const ajouter = (...t: Tour[]) => setTours((avant) => [...avant, ...t])

  /* --- ce qu'on tape --- */

  /* L'ORDRE DE RÉSOLUTION, et chaque cran a sa raison :
       1. les commandes — aide, annuler ;
       2. les CIVILITÉS — « bonjour » doit gagner avant qu'une
          recherche de logique ne s'en empare ;
       3. une famille nommée en un mot ;
       4. une logique — parce qu'AGIR PASSE AVANT EXPLIQUER ;
       5. les SUJETS de la bibliothèque — « comment marche la
          synchro » n'a de sens que si rien ne peut être fait ;
       6. l'aveu d'incompréhension, jamais une devinette. */
  const repondre = (demande: string) => {
    const d = demande.trim()
    if (!d) return
    ajouter({ k: 'moi', texte: d })

    if (AIDE.test(d)) return ajouter({ k: 'capacites' })

    if (/^annul/i.test(d)) {
      const dernier = [...tours].reverse().find((t) => t.k === 'annulation' && !t.utilisee)
      if (!dernier) return ajouter({ k: 'dit', texte: 'Rien à annuler.' })
      return defaire(tours.lastIndexOf(dernier))
    }

    /* Le sommaire des sujets — l'équivalent, côté paroles, de la
       liste des capacités côté actions. Sans lui, la bibliothèque
       existe mais ne se découvre pas : on ne devine pas qu'Atlas sait
       expliquer les raccourcis markdown. */
    if (SOMMAIRE.test(d)) return ajouter({ k: 'sommaire' })

    /* UNE QUESTION DU SOMMAIRE RÉPOND D'ELLE-MÊME. On vient de la
       proposer mot pour mot : la faire repasser par la recherche
       floue, c'est rejouer une devinette dont on a déjà la réponse.
       C'est ce qui envoyait « La synchronisation » sur « Les images
       manquantes ». */
    const exacte = parQuestion(d)
    if (exacte) return ajouter(bulle(exacte))

    const politesse = civilite(d)
    if (politesse) return ajouter(bulle(politesse))

    /* UNE CONSIGNE PASSE AVANT TOUT LE RESTE.

       « Crée un espace Roman noir » ne laisse aucun doute sur
       l'intention, et le nom à donner est DANS la phrase. La recherche
       floue, elle, n'y verrait que le mot « espace » et lancerait « Un
       espace à naître » — qui scrute la base au lieu de faire ce qu'on
       demande. Deviner quand on a été explicite est la pire des
       réponses ; c'est exactement ce qui faisait dire à Atlas qu'il ne
       savait pas créer d'espace. */
    const consigne = chercherConsigne(d)
    if (consigne) return ajouter(...lancer(consigne.id, d))

    /* Un seul mot qui nomme une famille : on déplie la famille plutôt
       que de lancer le premier script qui y ressemble. « Nettoie »
       veut dire « montre-moi le nettoyage », pas « nettoie tout ». */
    const famille = chercherFamille(d)
    if (famille) return ajouter({ k: 'famille', famille })

    /* AGIR PASSE AVANT EXPLIQUER — MAIS À SCORE ÉGAL SEULEMENT.

       Le premier jet lançait la logique dès qu'elle trouvait un seul
       mot-clé, et la bibliothèque ne passait qu'après. Résultat :
       « j'ai oublié mon mot de passe » lançait « Ce qui dort » à cause
       d'« oublié », et « ça marche hors ligne ? » « Les liens brisés »
       à cause de « ligne ». Un mot commun sur deux ne vaut pas deux
       mots communs sur deux — on compare donc les deux scores, et
       l'action ne l'emporte qu'à égalité. */
    const parole = sujet(d)
    const action = chercherScriptEtScore(d)

    if (parole && (!action || parole.score > action.score)) return ajouter(bulle(parole.r))
    if (action) return ajouter(...lancer(action.s.id))
    if (parole) return ajouter(bulle(parole.r))

    /* L'aveu porte maintenant des pistes plutôt qu'une liste de
       capacités : quelqu'un qui a posé une question veut une réponse
       approchante, pas un catalogue d'actions. */
    ajouter(bulle(incompris(d)))
  }

  /* --- exécuter une proposition --- */

  const executer = (index: number, ids: string[]) => {
    const t = tours[index]
    if (t?.k !== 'resultat' || t.res.sorte !== 'proposition') return
    const annulation = t.res.faire(ids)
    setTours((avant) => {
      const suite = [...avant]
      suite[index] = { ...t, fait: `${ids.length} traité${ids.length > 1 ? 's' : ''}` }
      return suite
    })
    if (annulation) ajouter(bandeauAnnulation(annulation))
    else ajouter({ k: 'dit', texte: 'C’est fait. Celui-là ne se défait pas.' })
  }

  const defaire = (index: number) => {
    const t = tours[index]
    if (t?.k !== 'annulation' || t.utilisee) return
    t.defaire()
    setTours((avant) => {
      const suite = [...avant]
      suite[index] = { ...t, utilisee: true }
      return suite
    })
    ajouter({ k: 'dit', texte: 'Remis comme avant.' })
  }

  /**
   * ÉCARTER UNE PROPOSITION, EXPLICITEMENT.
   *
   * Une carte n'avait qu'un bouton : celui qui fait. Pour la refuser il
   * fallait ne rien faire — c'est-à-dire la laisser ouverte au milieu
   * du fil, avec son bouton d'action encore armé, en espérant ne pas le
   * toucher plus tard. Une proposition qu'on ne peut qu'accepter n'est
   * pas une proposition.
   *
   * « Laisser » ne touche à rien : il note qu'on a répondu non, ferme
   * la carte, et rend le fil lisible — on voit ce qu'on a écarté,
   * autant que ce qu'on a validé.
   */
  const ecarter = (index: number) =>
    setTours((avant) =>
      avant.map((t, i) => (i !== index || t.k !== 'resultat' ? t : { ...t, fait: 'Laissée' })),
    )

  const cocher = (index: number, id: string) =>
    setTours((avant) =>
      avant.map((t, i) =>
        i !== index || t.k !== 'resultat'
          ? t
          : { ...t, pris: t.pris.includes(id) ? t.pris.filter((x) => x !== id) : [...t.pris, id] },
      ),
    )

  const enAttente = aConfirmer && (tours[aConfirmer.tour] as Extract<Tour, { k: 'resultat' }>)
  const propositionEnAttente =
    enAttente?.res.sorte === 'proposition' ? enAttente.res : null

  return (
    <div className="causerie rise" data-plein={plein || undefined} role="dialog" aria-label="Atlas">
      <div className="causerie__tete">
        <button className="causerie__oeil" onClick={fermer} aria-label="Fermer Atlas">
          <OeilAtlas size={22} mode="cause" flux />
        </button>
        <span className="causerie__nom">Atlas</span>

        {/* PLUS AUCUNE MENTION D'IA À L'ÉCRAN.

            Il y avait un interrupteur Règles / IA, puis un état
            « sans IA » quand rien n'était branché. Les deux
            promettaient une suite qui n'arrive pas : les paliers
            gratuits se paient sur le contenu qu'on leur donne, et le
            contenu ici, c'est un second cerveau.

            Annoncer une absence, c'est encore parler de ce qui
            manque. L'en-tête dit donc ce qu'Atlas SAIT, et rien
            d'autre. La couture (`store/cerveau.ts`) reste en place,
            dormante : le jour où un service payant en vaudra la
            peine, il n'y aura qu'à la brancher. */}
        <span className="causerie__etat">
          {SCRIPTS.length} logiques · {NOMBRE_DE_SUJETS} sujets
        </span>

        <button
          className="btn btn--icon"
          onClick={() => setPlein(!plein)}
          aria-label={plein ? 'Réduire la conversation' : 'Ouvrir en pleine page'}
          aria-pressed={plein}
        >
          {plein ? <IconReduire size={17} /> : <IconPleinEcran size={17} />}
        </button>
        <button className="btn btn--icon" onClick={fermer} aria-label="Fermer">
          <IconClose size={17} />
        </button>
      </div>

      <div className="causerie__fil">
        {tours.map((t, i) => (
          <TourRendu
            key={i}
            tour={t}
            demander={repondre}
            demanderTheme={(theme) => ajouter({ k: 'theme', theme })}
            ouvrir={(id) => ajouter(...lancer(id))}
            regle={(id) => ajouter({ k: 'regle', scriptId: id })}
            cocher={(id) => cocher(i, id)}
            ecarter={() => ecarter(i)}
            agir={(ids, danger) =>
              danger ? setAConfirmer({ tour: i, ids }) : executer(i, ids)
            }
            defaire={() => defaire(i)}
          />
        ))}
        <div ref={fin} />
      </div>

      <div className="causerie__raccourcis">
        {RACCOURCIS.map((r) => (
          <Puce key={r.mot} mot={r.mot} onClick={() => repondre(r.envoi)} />
        ))}
      </div>

      <form
        className="causerie__pied"
        onSubmit={(e) => {
          e.preventDefault()
          repondre(texte)
          setTexte('')
        }}
      >
        <input
          ref={champ}
          className="causerie__champ"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Range mes notes, nettoie, où j’en suis…"
          aria-label="Message à Atlas"
        />
        <button className="btn btn--accent" type="submit" disabled={!texte.trim()}>
          Envoyer
        </button>
      </form>

      {/* Ce qui supprime ne s'annule pas : la question se pose AVANT,
          et par le même bandeau que partout ailleurs dans l'app. */}
      {aConfirmer && propositionEnAttente && (
        <Confirmation
          titre={propositionEnAttente.verbe(aConfirmer.ids.length) + ' ?'}
          detail={
            <>
              {propositionEnAttente.pourquoi} <strong>Ce geste ne se défait pas.</strong>
            </>
          }
          action="Confirmer"
          onConfirmer={() => {
            executer(aConfirmer.tour, aConfirmer.ids)
            setAConfirmer(null)
          }}
          onAnnuler={() => setAConfirmer(null)}
        />
      )}
    </div>
  )
}

/* ================= un tour ================= */

function TourRendu({
  tour,
  demander,
  demanderTheme,
  ouvrir,
  regle,
  cocher,
  ecarter,
  agir,
  defaire,
}: {
  tour: Tour
  demander: (d: string) => void
  demanderTheme: (t: Theme | 'tout') => void
  ouvrir: (scriptId: string) => void
  regle: (scriptId: string) => void
  cocher: (id: string) => void
  agir: (ids: string[], danger: boolean) => void
  ecarter: () => void
  defaire: () => void
}) {
  switch (tour.k) {
    case 'moi':
      return (
        <p className="tour" data-de="moi">
          {tour.texte}
        </p>
      )

    case 'dit':
      return (
        <div className="ditbloc">
          <p className="tour" data-de="atlas">
            {tour.texte}
          </p>
          {/* LES SUITES SONT LA CONVERSATION. Sans elles, une réponse
              honnête est un cul-de-sac : « je ne sais pas écrire » et
              rien d'autre. Avec elles, elle mène quelque part. */}
          {tour.suites?.length ? (
            <div className="suites">
              {tour.suites.map((s) => (
                <Puce key={s} mot={s} onClick={() => demander(s)} />
              ))}
            </div>
          ) : null}
        </div>
      )

    case 'capacites':
      return (
        <div className="carte-atlas">
          <div className="carte-atlas__titre">Ce que je sais faire</div>
          <p className="carte-atlas__pourquoi">
            {SCRIPTS.length} règles, toutes explicables en une phrase. Appuie sur une famille pour
            la déplier.
          </p>
          <div className="familles">
            {FAMILLES.map((f) => (
              <button key={f.id} className="famille" onClick={() => demander(f.nom)}>
                <span className="famille__nom">{f.nom}</span>
                <span className="famille__quoi">{f.quoi}</span>
                <span className="famille__n">{scriptsDe(f.id).length}</span>
              </button>
            ))}
          </div>
          <p className="carte-atlas__note">
            Et je sais aussi <em>parler</em> de l’app — demande-moi de quoi je peux parler.
          </p>
        </div>
      )

    /* LE PENDANT PAROLES DE LA LISTE D'ACTIONS.

       THÈME PAR THÈME, PAS TOUT D'UN COUP. Les quatre-vingt-dix-sept
       questions déversées d'un bloc, c'était un mur : on ne lit pas
       un mur, on le referme. Six thèmes tiennent dans un regard, et
       chacun s'ouvre sur ce qu'il contient.

       « Tout afficher » reste là pour qui cherche un mot précis et
       préfère balayer la liste entière — c'est un choix, pas la
       porte d'entrée. */
    case 'sommaire':
      return (
        <div className="carte-atlas">
          <div className="carte-atlas__titre">De quoi je peux parler</div>
          <p className="carte-atlas__pourquoi">
            {NOMBRE_DE_SUJETS} sujets, écrits à la main. Je ne dis que ce que je sais — mais ce que
            je sais, je le sais vraiment.
          </p>
          <div className="familles">
            {THEMES.map((t) => (
              <button key={t.id} className="famille" onClick={() => demanderTheme(t.id)}>
                <span className="famille__nom">{t.nom}</span>
                <span className="famille__quoi">{t.quoi}</span>
                <span className="famille__n">{sujetsDe(t.id).length}</span>
              </button>
            ))}
          </div>
          <div className="carte-atlas__pied">
            <button className="lien" onClick={() => demanderTheme('tout')}>
              tout afficher d’un coup
            </button>
          </div>
        </div>
      )

    /* Un thème déplié — ou tous, quand on a demandé la liste entière. */
    case 'theme': {
      const themes = tour.theme === 'tout' ? THEMES : THEMES.filter((t) => t.id === tour.theme)
      return (
        <div className="carte-atlas">
          <div className="carte-atlas__titre">
            {tour.theme === 'tout' ? `Tous mes sujets` : themes[0].nom}
          </div>
          {themes.map((t) => (
            <div className="theme" key={t.id}>
              <div className="theme__tete">
                <span className="theme__nom">{t.nom}</span>
                <span className="theme__quoi">{t.quoi}</span>
              </div>
              <div className="suites">
                {sujetsDe(t.id).map((q) => (
                  <button key={q} className="causerie__puce" onClick={() => demander(q)}>
                    <IconChevron size={12} style={{ transform: 'rotate(180deg)' }} />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }

    case 'famille': {
      const f = FAMILLES.find((x) => x.id === tour.famille)!
      return (
        <div className="carte-atlas">
          <div className="carte-atlas__titre">{f.nom}</div>
          <p className="carte-atlas__pourquoi">{f.quoi}</p>
          <div className="menu">
            {scriptsDe(tour.famille).map((s) => (
              <ScriptLigne key={s.id} s={s} ouvrir={ouvrir} regle={regle} />
            ))}
          </div>
        </div>
      )
    }

    case 'regle': {
      const s = scriptParId(tour.scriptId)!
      return (
        <div className="carte-atlas carte-atlas--regle">
          <div className="carte-atlas__titre">La règle exacte</div>
          <p className="carte-atlas__pourquoi">{s.regle}</p>
        </div>
      )
    }

    case 'annulation':
      return (
        <div className="carte-atlas carte-atlas--annule" data-utilisee={tour.utilisee}>
          <IconRestore size={16} />
          {tour.utilisee ? (
            <span>{tour.libelle}</span>
          ) : (
            <>
              <span>C’est fait.</span>
              <button className="lien" onClick={defaire}>
                Annuler
              </button>
            </>
          )}
        </div>
      )

    case 'resultat':
      return (
        <ResultatRendu
          scriptId={tour.scriptId}
          res={tour.res}
          pris={tour.pris}
          fait={tour.fait}
          regle={regle}
          cocher={cocher}
          ecarter={ecarter}
          agir={agir}
        />
      )
  }
}

function ScriptLigne({
  s,
  ouvrir,
  regle,
}: {
  s: Script
  ouvrir: (id: string) => void
  regle: (id: string) => void
}) {
  return (
    <div className="script">
      <button className="script__corps" onClick={() => ouvrir(s.id)}>
        <span className="script__nom">{s.nom}</span>
        <span className="script__quoi">{s.quoi}</span>
      </button>
      <button
        className="script__regle"
        onClick={() => regle(s.id)}
        aria-label={`La règle de ${s.nom}`}
        title="Sur quelle règle ?"
      >
        ?
      </button>
    </div>
  )
}

function ResultatRendu({
  scriptId,
  res,
  pris,
  fait,
  regle,
  cocher,
  ecarter,
  agir,
}: {
  scriptId: string
  res: Resultat
  pris: string[]
  fait?: string
  regle: (id: string) => void
  cocher: (id: string) => void
  agir: (ids: string[], danger: boolean) => void
  ecarter: () => void
}) {
  const s = scriptParId(scriptId)

  if (res.sorte === 'rien') {
    return (
      <div className="carte-atlas carte-atlas--rien">
        <span>{res.mot}</span>
        {s && (
          <button className="lien" onClick={() => regle(s.id)}>
            sur quelle règle ?
          </button>
        )}
      </div>
    )
  }

  const proposition = res.sorte === 'proposition'

  return (
    <div className="carte-atlas" data-fait={fait ? true : undefined}>
      <div className="carte-atlas__titre">{res.titre}</div>
      {res.pourquoi && <p className="carte-atlas__pourquoi">{res.pourquoi}</p>}

      {res.elements.length > 0 && (
        <ul className="elements">
          {res.elements.map((e) => (
            <li key={e.id}>
              {proposition && !fait ? (
                <button
                  className="element"
                  data-pris={pris.includes(e.id)}
                  onClick={() => cocher(e.id)}
                >
                  <span className="element__case">{pris.includes(e.id) && <IconCoche size={12} />}</span>
                  <span className="element__corps">
                    <span className="element__nom">{e.libelle}</span>
                    {e.detail && <span className="element__detail">{e.detail}</span>}
                  </span>
                </button>
              ) : (
                <span className="element element--fixe">
                  <span className="element__corps">
                    <span className="element__nom">{e.libelle}</span>
                    {e.detail && <span className="element__detail">{e.detail}</span>}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {res.sorte === 'constat' && res.note && <p className="carte-atlas__note">{res.note}</p>}

      <div className="carte-atlas__pied">
        {s && (
          <button className="lien" onClick={() => regle(s.id)}>
            sur quelle règle ?
          </button>
        )}
        {/* LAISSER, PUIS FAIRE — dans cet ordre.

            Le refus est à GAUCHE et sans couleur, l'action à droite et
            pleine : la main qui hésite doit trouver la sortie avant de
            trouver l'entrée, pas l'inverse. C'est encore plus vrai
            quand l'action est une suppression. */}
        {proposition && !fait && (
          <button className="btn btn--ghost" onClick={ecarter}>
            Laisser
          </button>
        )}
        {proposition && !fait && (
          <button
            className={res.danger ? 'btn btn--detruire' : 'btn btn--accent'}
            disabled={!pris.length}
            onClick={() => agir(pris, Boolean(res.danger))}
          >
            {res.verbe(pris.length)}
            <IconChevron size={14} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
        {fait && <span className="carte-atlas__fait">{fait}</span>}
      </div>
    </div>
  )
}

/* ================= utilitaires ================= */

/** Lance un script et fabrique le tour qui montre son résultat. */
/**
 * La demande passe au script, et c'est ce qui permet les CONSIGNES.
 *
 * Les autres logiques n'en ont pas besoin : elles scrutent la base, la
 * phrase qui les a appelées ne leur apprend rien. Une consigne, si —
 * « crée un espace Roman noir » n'a de sens qu'avec « Roman noir ».
 */
function lancer(scriptId: string, demande?: string): Tour[] {
  const s = scriptParId(scriptId)
  if (!s) return [{ k: 'dit', texte: 'Cette logique n’existe pas.' }]
  const res = s.chercher(demande)
  const pris =
    res.sorte === 'proposition' ? res.elements.filter((e) => e.pris).map((e) => e.id) : []
  return [{ k: 'resultat', scriptId, res, pris }]
}

function bandeauAnnulation(a: Annulation): Tour {
  return { k: 'annulation', libelle: a.libelle, defaire: a.defaire }
}

/** Une réponse de la bibliothèque devient une bulle, avec ses suites. */
function bulle(r: Reponse): Tour {
  return { k: 'dit', texte: r.texte, suites: r.suites }
}

/**
 * Une demande toute prête.
 *
 * ELLE PORTE UN CHEVRON, et ce n'est pas une décoration. Posées sous
 * une bulle d'Atlas, ces puces se lisaient comme la suite de ce qu'il
 * venait de dire — gris sur gris, alignées à gauche comme sa phrase.
 * On croyait qu'il annonçait « Le briefing » ; en réalité il proposait
 * qu'on le lui demande.
 *
 * Le chevron pointe vers l'avant : il dit « en appuyant, tu dis ça ».
 * Avec la teinte d'accent, la puce cesse d'être du texte et redevient
 * un bouton — et c'est bien de la parole de l'utilisateur qu'il
 * s'agit, comme ses bulles à lui.
 */
function Puce({ mot, onClick }: { mot: string; onClick: () => void }) {
  return (
    <button className="causerie__puce" onClick={onClick}>
      <IconChevron size={12} style={{ transform: 'rotate(180deg)' }} />
      {mot}
    </button>
  )
}

