import { useEffect, useRef, useState } from 'react'
import {
  chercherFamille,
  chercherScript,
  FAMILLES,
  SCRIPTS,
  scriptParId,
  scriptsDe,
  type Annulation,
  type Famille,
  type Resultat,
  type Script,
} from '../store/scripts'
import { Confirmation } from './Confirmation'
import { IconChevron, IconClose, IconCoche, IconRestore } from './Icon'
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
  | { k: 'dit'; texte: string }
  | { k: 'capacites' }
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
]

const AIDE = /^(\?+|aide|help|que sais.?tu|quoi|capacit|comment|sais.?tu)/i

export function Causerie({ fermer }: { fermer: () => void }) {
  const [tours, setTours] = useState<Tour[]>(() => [
    { k: 'dit', texte: 'Je ne sais pas encore penser, mais je sais faire. Voilà où tu en es.' },
    ...lancer('briefing'),
  ])
  const [texte, setTexte] = useState('')
  const [aConfirmer, setAConfirmer] = useState<{ tour: number; ids: string[] } | null>(null)
  const champ = useRef<HTMLInputElement>(null)
  const fin = useRef<HTMLDivElement>(null)

  useEffect(() => champ.current?.focus(), [])
  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [tours])

  const ajouter = (...t: Tour[]) => setTours((avant) => [...avant, ...t])

  /* --- ce qu'on tape --- */

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

    /* Un seul mot qui nomme une famille : on déplie la famille plutôt
       que de lancer le premier script qui y ressemble. « Nettoie »
       veut dire « montre-moi le nettoyage », pas « nettoie tout ». */
    const famille = chercherFamille(d)
    if (famille) return ajouter({ k: 'famille', famille })

    const s = chercherScript(d)
    if (!s) {
      return ajouter(
        {
          k: 'dit',
          texte:
            'Je ne comprends pas cette demande — et je préfère te le dire que deviner. Voilà tout ce que je sais faire :',
        },
        { k: 'capacites' },
      )
    }
    ajouter(...lancer(s.id))
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
    <div className="causerie rise" role="dialog" aria-label="Atlas">
      <div className="causerie__tete">
        <button className="causerie__oeil" onClick={fermer} aria-label="Fermer Atlas">
          <OeilAtlas size={22} mode="cause" flux />
        </button>
        <span className="causerie__nom">Atlas</span>
        <span className="causerie__etat">{SCRIPTS.length} logiques · sans IA</span>
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
            ouvrir={(id) => ajouter(...lancer(id))}
            regle={(id) => ajouter({ k: 'regle', scriptId: id })}
            cocher={(id) => cocher(i, id)}
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
          <button key={r.mot} className="causerie__puce" onClick={() => repondre(r.envoi)}>
            {r.mot}
          </button>
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
  ouvrir,
  regle,
  cocher,
  agir,
  defaire,
}: {
  tour: Tour
  demander: (d: string) => void
  ouvrir: (scriptId: string) => void
  regle: (scriptId: string) => void
  cocher: (id: string) => void
  agir: (ids: string[], danger: boolean) => void
  defaire: () => void
}) {
  switch (tour.k) {
    case 'moi':
    case 'dit':
      return (
        <p className="tour" data-de={tour.k === 'moi' ? 'moi' : 'atlas'}>
          {tour.texte}
        </p>
      )

    case 'capacites':
      return (
        <div className="carte-atlas">
          <div className="carte-atlas__titre">Ce que je sais faire</div>
          <p className="carte-atlas__pourquoi">
            Rien d’intelligent : {SCRIPTS.length} règles, toutes explicables en une phrase. Appuie
            sur une famille pour la déplier.
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
        </div>
      )

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
  agir,
}: {
  scriptId: string
  res: Resultat
  pris: string[]
  fait?: string
  regle: (id: string) => void
  cocher: (id: string) => void
  agir: (ids: string[], danger: boolean) => void
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
function lancer(scriptId: string): Tour[] {
  const s = scriptParId(scriptId)
  if (!s) return [{ k: 'dit', texte: 'Cette logique n’existe pas.' }]
  const res = s.chercher()
  const pris =
    res.sorte === 'proposition' ? res.elements.filter((e) => e.pris).map((e) => e.id) : []
  return [{ k: 'resultat', scriptId, res, pris }]
}

function bandeauAnnulation(a: Annulation): Tour {
  return { k: 'annulation', libelle: a.libelle, defaire: a.defaire }
}

