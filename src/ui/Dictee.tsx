import { useEffect, useRef, useState } from 'react'
import { IconMicro, IconMicroBarre } from './Icon'

/* ---------------------------------------------------------------
   LA DICTÉE.

   Le cadrage disait « pas de moteur vocal avant la V3 » (D4), et il
   avait raison sur un point : construire une reconnaissance vocale
   est hors de portée. Mais le NAVIGATEUR en a déjà une, gratuite,
   et il suffit de la demander — `SpeechRecognition`, préfixée
   `webkit` chez Apple.

   ── CE QU'IL FAUT DIRE, ET QUI N'EST PAS CONFORTABLE

   L'AUDIO NE RESTE PAS SUR L'APPAREIL. Chrome et Safari envoient ce
   qu'on dicte à leur propre service de reconnaissance. C'est le seul
   endroit d'Atlas où quelque chose sort sans qu'un compte l'ait
   demandé, et il serait malhonnête de le passer sous silence dans une
   app dont la promesse est « tout reste chez toi ». Le bouton le dit
   donc, une fois, à la première utilisation.

   ── TROIS DÉCISIONS

   1. LE BOUTON N'EXISTE PAS SI L'API N'EXISTE PAS. Pas de bouton
      grisé, pas de message d'excuse : sur un navigateur qui ne sait
      pas, il n'y a rien à voir. La dictée du clavier système reste
      disponible et fait le même travail.
   2. LE MICRO EST DEMANDÉ AU PREMIER APPUI, jamais avant — c'est la
      règle de docs/06 § 2, et sur iOS un refus est quasi définitif.
   3. SEUL LE DÉFINITIF EST ÉCRIT. La reconnaissance rend d'abord des
      hypothèses qu'elle corrige ensuite ; les coller au fil de l'eau
      ferait bégayer le champ. On affiche l'hypothèse à côté, en
      gris, et on n'écrit que ce qui est arrêté.
   --------------------------------------------------------------- */

/* Les types du DOM ne décrivent pas encore cette API : on ne déclare
   que ce qu'on utilise, plutôt que de tirer une dépendance entière. */
type Alternative = { transcript: string }
type Resultat = { isFinal: boolean; 0: Alternative; length: number }
type Evenement = { resultIndex: number; results: { length: number } & Record<number, Resultat> }

type Reconnaissance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: Evenement) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

type Fabrique = new () => Reconnaissance

function fabrique(): Fabrique | null {
  const w = window as unknown as {
    SpeechRecognition?: Fabrique
    webkitSpeechRecognition?: Fabrique
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** L'API est-elle là ? Appelée par les écrans avant d'afficher quoi que ce soit. */
export const dicteePossible = () => fabrique() !== null

const CLE_AVERTI = 'atlas.dictee.avertie'

export function Dictee({
  onTexte,
  onEtat,
}: {
  /** appelé avec chaque bout de phrase arrêté — à ajouter au champ */
  onTexte: (bout: string) => void
  /** l'hypothèse en cours, pour l'afficher en gris à côté du champ */
  onEtat?: (etat: { ecoute: boolean; hypothese: string }) => void
}) {
  const [ecoute, setEcoute] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const moteur = useRef<Reconnaissance | null>(null)

  // on coupe le micro si l'écran disparaît pendant qu'il écoute
  useEffect(() => () => moteur.current?.abort(), [])

  if (!dicteePossible()) return null

  const arreter = () => {
    moteur.current?.stop()
    moteur.current = null
    setEcoute(false)
    onEtat?.({ ecoute: false, hypothese: '' })
  }

  const demarrer = () => {
    const Fabrique = fabrique()
    if (!Fabrique) return
    setErreur(null)

    const r = new Fabrique()
    r.lang = 'fr-FR'
    r.continuous = true
    r.interimResults = true

    r.onresult = (e) => {
      let arrete = ''
      let hypothese = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) arrete += res[0].transcript
        else hypothese += res[0].transcript
      }
      if (arrete.trim()) onTexte(arrete)
      onEtat?.({ ecoute: true, hypothese })
    }

    r.onerror = (e) => {
      /* « not-allowed » veut dire refus de permission, et sur iOS il
         ne se redemande pas : on renvoie vers les réglages du système
         plutôt que de laisser croire à une panne. */
      setErreur(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Micro refusé. Il se rétablit dans les réglages du système.'
          : e.error === 'no-speech'
            ? 'Je n’ai rien entendu.'
            : 'La dictée s’est arrêtée.',
      )
      arreter()
    }

    r.onend = () => {
      moteur.current = null
      setEcoute(false)
      onEtat?.({ ecoute: false, hypothese: '' })
    }

    moteur.current = r
    setEcoute(true)
    try {
      localStorage.setItem(CLE_AVERTI, 'oui')
    } catch {
      /* sans importance */
    }
    r.start()
  }

  const jamaisAverti = (() => {
    try {
      return localStorage.getItem(CLE_AVERTI) !== 'oui'
    } catch {
      return false
    }
  })()

  return (
    <div className="dictee">
      <button
        type="button"
        className="dictee__bouton"
        data-ecoute={ecoute || undefined}
        aria-pressed={ecoute}
        aria-label={ecoute ? 'Arrêter la dictée' : 'Dicter'}
        onClick={() => (ecoute ? arreter() : demarrer())}
      >
        {ecoute ? <IconMicroBarre size={18} /> : <IconMicro size={18} />}
      </button>

      {/* DIT UNE FOIS, AVANT LE PREMIER APPUI. Après, ce serait un
          rappel inutile ; avant, c'est la seule occasion de choisir en
          connaissance de cause. */}
      {jamaisAverti && !ecoute && (
        <span className="dictee__note">
          La dictée passe par le service de reconnaissance de ton navigateur — c’est le seul
          endroit où quelque chose sort de l’appareil.
        </span>
      )}

      {erreur && (
        <span className="dictee__note dictee__note--erreur" role="alert">
          {erreur}
        </span>
      )}
    </div>
  )
}
