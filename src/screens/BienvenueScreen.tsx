import { useEffect, useState } from 'react'
import { useBienvenue } from '../store/bienvenue'
import { useCompte } from '../store/compte'
import { Calque } from '../ui/Calque'
import { OeilAtlas } from '../ui/OeilAtlas'

/* ---------------------------------------------------------------
   Le premier lancement, en deux temps.

   ── 1. L'OUVERTURE

   L'œil, le nom de l'app, et une phrase qui S'ÉCRIT. Rien d'autre,
   pas un bouton.

   Ce n'est pas de la décoration. Atlas est une entité (docs/06 § 3) ;
   la première chose qu'on voit de lui ne doit pas être un formulaire
   ni une liste de capacités, mais quelqu'un qui prend la parole. Une
   phrase posée d'un bloc est un titre ; la même phrase qui s'écrit
   est une adresse — on attend la fin, et c'est cette attente d'une
   seconde et demie qui fait la différence entre un logo et une
   présence.

   Elle se saute d'un appui : la deuxième fois, on n'a plus envie
   d'attendre, et une animation qu'on ne peut pas couper devient
   pénible exactement au moment où elle a cessé d'être belle.

   ── 2. CE QUE JE SAIS FAIRE

   Trois points sur l'app elle-même. Cet écran listait des
   AUTORISATIONS et leur état ; il PRÉSENTE maintenant, et il ne
   réclame toujours rien. Chaque permission reste demandée au moment
   où elle sert (docs/06 § 2) — jamais ici.
   --------------------------------------------------------------- */

/* CE QU'ATLAS FAIT, PAS CE QU'IL ATTEND DES PERMISSIONS.

   Cet écran listait trois AUTORISATIONS avec leur état — notifications
   « à installer », dictée « bientôt », captures d'écran
   « indisponible ». C'était honnête, et c'était la mauvaise question :
   quelqu'un qui ouvre Atlas pour la première fois ne demande pas de
   quoi l'app aura besoin, il demande à quoi elle sert. Deux tiers de
   la liste parlaient d'ailleurs de choses qui n'existaient pas.

   Trois points, donc, et ce sont les trois vraies promesses : la
   vitesse de capture, la liberté de forme, et le fait que rien ne
   t'échappe. */
const POINTS = [
  {
    t: 'Capturer en dix secondes',
    e: 'le cœur',
    d: 'Un champ, un curseur, rien à décider. Le rangement viendra le jour où un projet en aura besoin.',
  },
  {
    t: 'Une note, autant de formes',
    e: 'six',
    d: 'Fiche, carte mentale, dessin, planche, table, chronologie — en onglets, ajoutés quand tu en as besoin.',
  },
  {
    t: 'Tout reste à toi',
    e: 'hors ligne',
    d: 'Ça marche en avion, ça se synchronise si tu veux, et ça s’exporte entièrement en markdown lisible sans moi.',
  },
]

/** Le rythme de la frappe. Assez lent pour se lire, assez vif pour ne pas lasser. */
const LETTRE = 52
/** Le temps d'arrêt une fois la phrase écrite, avant de laisser la place. */
const REPOS = 1100

export function BienvenueScreen() {
  const terminer = useBienvenue((s) => s.terminer)
  const session = useCompte((s) => s.session)
  const [etape, setEtape] = useState<'ouverture' | 'capacites'>('ouverture')

  if (etape === 'ouverture') {
    return <Ouverture nom={session?.nom ?? null} suite={() => setEtape('capacites')} />
  }

  return (
    <div className="connexion">
      <Calque />

      <div className="connexion__carte bienvenue glass rise">
        <span className="oeil--marque">
          <OeilAtlas size={74} />
        </span>

        <div className="connexion__marque">
          <h1 className="connexion__titre">Bonjour, je suis Atlas</h1>
          <p className="connexion__sous">
            Un endroit pour déposer tes idées, les faire mûrir, et les fabriquer.
          </p>
        </div>

        <div className="eyebrow" style={{ marginTop: 4 }}>
          Ce que je sais faire
        </div>

        <ul className="capacites">
          {POINTS.map((c) => (
            <li className="capacite" key={c.t}>
              <div className="capacite__ligne">
                <span className="capacite__titre">{c.t}</span>
                <span className="capacite__etat" data-etat={c.e}>
                  {c.e}
                </span>
              </div>
              <p className="capacite__texte">{c.d}</p>
            </li>
          ))}
        </ul>

        <p className="sheet__note" style={{ marginTop: 12 }}>
          Je ne demanderai jamais une autorisation avant d'en avoir besoin, et je dirai toujours
          ce que je ne sais pas faire.
        </p>

        <button className="btn btn--accent btn--large" style={{ marginTop: 14 }} onClick={terminer}>
          Commencer
        </button>
      </div>
    </div>
  )
}

/* ================= l'ouverture ================= */

function Ouverture({ nom, suite }: { nom: string | null; suite: () => void }) {
  /* « Bienvenue » tout court quand personne ne s'est encore présenté —
     et c'est le cas le plus fréquent, puisque cet écran précède le
     compte. Le prénom n'apparaît qu'en revoyant la bienvenue depuis le
     profil, ou sur un appareil déjà connecté. */
  const phrase = nom?.trim() ? `Bienvenue ${nom.trim()}` : 'Bienvenue'

  /* Le réglage système fait foi : « Réduire les animations » veut dire
     qu'on ne veut pas attendre qu'un texte se tape. La phrase est alors
     entière dès la première image. */
  const sobre =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const [n, setN] = useState(sobre ? phrase.length : 0)

  useEffect(() => {
    if (sobre) return
    if (n >= phrase.length) return
    const t = window.setTimeout(() => setN(n + 1), LETTRE)
    return () => window.clearTimeout(t)
  }, [n, phrase.length, sobre])

  // une fois la phrase posée, on laisse un temps puis on passe la main
  useEffect(() => {
    if (n < phrase.length) return
    const t = window.setTimeout(suite, sobre ? 400 : REPOS)
    return () => window.clearTimeout(t)
  }, [n, phrase.length, sobre, suite])

  return (
    <div
      className="connexion ouverture"
      onClick={suite}
      role="button"
      tabIndex={0}
      aria-label="Entrer dans Atlas"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') suite()
      }}
    >
      <Calque />

      <div className="ouverture__corps">
        <OeilAtlas size={96} />
        <div className="ouverture__nom">Atlas</div>

        {/* La phrase est annoncée EN ENTIER aux lecteurs d'écran, pas
            lettre par lettre : une synthèse vocale qui répète
            « B, Bi, Bie… » est une torture, et l'effet visuel n'a
            aucune raison de la concerner. */}
        <p className="ouverture__phrase" aria-label={phrase}>
          <span aria-hidden="true">{phrase.slice(0, n)}</span>
          {n < phrase.length && <span className="ouverture__curseur" aria-hidden="true" />}
        </p>
      </div>
    </div>
  )
}
