import { motsDe, SCRIPTS } from './scripts'
import { versionCourte } from './version'

/* ---------------------------------------------------------------
   LA BIBLIOTHÈQUE DE CONVERSATION.

   Ce qu'Atlas sait dire sans modèle : qui il est, ce qu'il ne sait
   pas faire, où vivent tes données, comment marche telle partie de
   l'app. Une trentaine de réponses écrites à la main.

   ── LA RÈGLE QUI TIENT TOUT

   ATLAS NE DIT QUE CE QU'IL SAIT. Aucune réponse ici n'invente, ne
   flatte, ni ne fait semblant de réfléchir. Quand on lui demande
   quelque chose qu'il ne sait pas faire, il répond ce qu'il ne sait
   pas faire — et ce qui changerait en mode IA.

   C'est le contraire de ce que fait un assistant scripté ordinaire,
   qui répond « bien sûr ! » à tout et déçoit à la troisième phrase.
   Une bibliothèque honnête vieillit bien ; un faux dialogue non.

   ── DEUX PASSES, ET L'ORDRE COMPTE

   · LES CIVILITÉS d'abord — « bonjour », « merci », « qui es-tu ».
     Courtes, sans ambiguïté, elles doivent gagner avant que la
     recherche de logiques ne s'en mêle.
   · LES SUJETS ensuite, APRÈS les logiques — « comment marche la
     synchro ». Si une demande peut être une action, c'est l'action
     qui gagne : on préfère faire qu'expliquer.
   --------------------------------------------------------------- */

export type Reponse = {
  texte: string
  /** ce qu'on peut demander ensuite — des puces, pas un menu */
  suites?: string[]
}

type Entree = {
  id: string
  /** les mots qui déclenchent. Un seul suffit. */
  cles: string
  /**
   * Une tournure entière, quand les mots ne suffisent pas.
   *
   * « Qui es-tu ? » ne contient AUCUN mot d'au moins quatre lettres :
   * la recherche par mots, qui écarte les mots outils, n'y voit rien
   * du tout. Les phrases faites de petits mots ont donc besoin d'être
   * reconnues telles quelles — et il n'y en a qu'une poignée.
   */
  motif?: RegExp
  /** vrai pour les civilités : elles passent avant les logiques */
  civilite?: boolean
  repond: () => Reponse
}

const heure = () => new Date().getHours()

const BIBLIOTHEQUE: Entree[] = [
  /* ---------- civilités ---------- */
  {
    id: 'bonjour',
    cles: 'bonjour salut coucou bonsoir hello hey',
    civilite: true,
    repond: () => ({
      texte:
        heure() < 6
          ? 'Il est tard. Ou tôt — je ne juge pas.'
          : heure() < 12
            ? 'Bonjour. Qu’est-ce qu’on fait de tes notes aujourd’hui ?'
            : heure() < 18
              ? 'Bonjour. Je suis là.'
              : 'Bonsoir. C’est souvent le bon moment pour trier.',
      suites: ['Le briefing', 'Range mes notes'],
    }),
  },
  {
    id: 'ca-va',
    cles: 'humeur forme',
    motif: /(ca|ça) va|comment vas|tu vas bien/i,
    civilite: true,
    repond: () => ({
      texte:
        'Je n’ai pas d’humeur — je suis une trentaine de règles et un œil qui bouge. Toi, en revanche, tu as des notes qui traînent.',
      suites: ['Le briefing'],
    }),
  },
  {
    id: 'merci',
    cles: 'merci remercie super genial parfait nickel',
    civilite: true,
    repond: () => ({ texte: 'De rien. Je n’ai fait qu’appliquer une règle.' }),
  },
  {
    id: 'aurevoir',
    cles: 'revoir bye ciao adieu bonne nuit',
    civilite: true,
    repond: () => ({ texte: 'À tout à l’heure. Je garde tout.' }),
  },
  {
    id: 'qui',
    cles: 'atlas presente identite appelle',
    motif: /qui (es|est)|c.est qui|tu es qui/i,
    civilite: true,
    repond: () => ({
      texte:
        'Je suis Atlas — l’endroit où tu déposes tes idées, et celui qui les range avec toi. Pour l’instant je ne pense pas : j’applique des règles, et je le dis quand je ne comprends pas.',
      suites: ['Que sais-tu faire ?', 'Tes limites'],
    }),
  },
  {
    id: 'pardon',
    cles: 'nul bete idiot inutile stupide',
    civilite: true,
    repond: () => ({
      texte:
        'C’est justement pour ça que le mode est affiché en haut. En classique, je ne sais que ce qu’on m’a écrit — et je préfère te le dire que broder.',
      suites: ['Tes limites', 'Que sais-tu faire ?'],
    }),
  },

  /* ---------- ce qu'il ne sait pas ---------- */
  {
    id: 'limites',
    cles: 'limites peux impossible incapable',
    repond: () => ({
      texte:
        'Je ne sais ni écrire à ta place, ni résumer, ni répondre à une question ouverte, ni comprendre une demande qu’on n’a pas prévue. C’est exactement ce que le mode IA changera — au prix d’un appel payant par phrase.',
      suites: ['Que sais-tu faire ?', 'Le mode IA'],
    }),
  },
  {
    id: 'ecrire',
    cles: 'ecris redige poeme histoire texte invente raconte blague resume',
    repond: () => ({
      texte:
        'Je ne sais pas écrire — ni un poème, ni un résumé, ni une blague. En classique je n’ai aucun générateur de texte, juste des règles. Le mode IA saura le faire ; il n’est pas encore branché.',
      suites: ['Le mode IA', 'Que sais-tu faire ?'],
    }),
  },
  {
    id: 'mode-ia',
    cles: 'mode intelligence artificielle modele gpt claude brancher',
    repond: () => ({
      texte:
        'Deux modes, et le bouton en haut dit lequel tourne. CLASSIQUE : des règles, gratuit, hors ligne, jamais d’invention. IA : un modèle comprend ce qui n’a pas été prévu, et chaque phrase coûte. Aucun service n’est branché aujourd’hui — la place est prête, la clé manque.',
      suites: ['Que sais-tu faire ?'],
    }),
  },

  /* ---------- l'app ---------- */
  {
    id: 'donnees',
    cles: 'donnees prive confidentiel serveur nuage stocke vivent',
    repond: () => ({
      texte:
        'Tout est d’abord sur cet appareil, dans le navigateur — l’app marche en avion. Avec un compte, une copie part chez l’hébergeur pour que tes autres appareils la retrouvent. Et l’export complet existe depuis le premier jour : si Atlas disparaît, tes notes restent lisibles sans lui.',
      suites: ['La sauvegarde', 'La synchronisation'],
    }),
  },
  {
    id: 'sauvegarde-comment',
    cles: 'sauvegarde export archive zip',
    repond: () => ({
      texte:
        'Réglages → Sauvegarde. Une archive .zip avec le contenu en markdown lisible sans Atlas, les images d’origine, et un fichier de données complet. C’est l’assurance-vie du projet, pas un confort.',
      suites: ['Ma sauvegarde'],
    }),
  },
  {
    id: 'synchro-comment',
    cles: 'synchronisation synchro appareils telephone ordinateur',
    repond: () => ({
      texte:
        'L’écran lit toujours la base locale : l’app reste instantanée, même sans réseau. Les modifications partent derrière et rattrapent au retour du signal. En cas de conflit, la version la plus récente gagne.',
      suites: ['La file d’envoi'],
    }),
  },
  {
    id: 'capture-comment',
    cles: 'capture capturer eclair idee rapide',
    repond: () => ({
      texte:
        'L’écran de capture n’a qu’un champ : tu tapes, tu valides, tu arrives sur la note. Aucun choix à faire au moment où l’idée tombe — c’est la promesse des dix secondes.',
    }),
  },
  {
    id: 'formes-comment',
    cles: 'forme onglet fiche carte dessin planche chronologie table mentale',
    repond: () => ({
      texte:
        'Une note porte autant de formes qu’elle veut, en onglets : fiche, carte mentale, dessin, planche, table, chronologie. Le « + » à droite en ajoute une. Le type d’une note est une conséquence de ce que tu en fais, jamais une case à cocher au départ.',
    }),
  },
  {
    id: 'espaces-comment',
    cles: 'espace dossier classement ranger organisation',
    repond: () => ({
      texte:
        'Un espace est un grand contenant thématique — Le Bouquin, La Chaîne, Perso. La plupart des notes n’en auront jamais, et c’est normal : on range le jour où un projet en a besoin. Appui long sur les cartes pour en choisir plusieurs.',
      suites: ['Range mes notes'],
    }),
  },
  {
    id: 'archives-comment',
    cles: 'archive archiver archivee',
    repond: () => ({
      texte:
        'Archiver sort une note du flux sans rien perdre — elle reste consultable, et se restaure d’un geste. Le bouton est en bas du flux, même quand il n’y a rien dedans.',
      suites: ['Ce qui dort'],
    }),
  },
  {
    id: 'balayage-comment',
    cles: 'balayage balayer swipe glisser geste doigt',
    repond: () => ({
      texte:
        'Sur une ligne du flux : vers la droite pour archiver ou supprimer — les deux sont proposés, à toi de choisir ce que ça coûte. Vers la gauche pour classer. Et l’appui long ouvre la sélection multiple.',
    }),
  },
  {
    id: 'selection-comment',
    cles: 'selection multiple plusieurs cocher lot',
    repond: () => ({
      texte:
        'Appui long sur une ligne, dans le flux, les archives ou les espaces. Les cases apparaissent, la barre du bas porte les actions. Toute suppression en lot passe par une confirmation.',
    }),
  },
  {
    id: 'quota-comment',
    cles: 'quota place stockage plafond octets gratuit payant',
    repond: () => ({
      texte:
        'Formule gratuite : 50 Mo d’images et 20 000 notes. Ce ne sont pas des chiffres choisis mais un usage intense mesuré, doublé. Écrire n’est jamais bloqué — seules les images ont une vraie limite.',
      suites: ['La place occupée', 'Les images orphelines'],
    }),
  },
  {
    id: 'version-comment',
    cles: 'version mise jour maj build',
    repond: () => ({
      texte: `Tu es sur ${versionCourte()}. Le repère complet est dans Réglages → Version. Si l’app semble vieille, recharge : le service worker garde parfois une version de retard.`,
    }),
  },
  {
    id: 'recherche-comment',
    cles: 'recherche chercher trouver retrouver',
    repond: () => ({
      texte:
        'La barre en haut du flux cherche dans TOUT le contenu, pas seulement les titres — le texte des fiches, les nœuds des cartes, les cellules des tables. Pas encore par le sens : ça, c’est le mode IA.',
      suites: ['Les mots rares'],
    }),
  },
  {
    id: 'annuler-comment',
    cles: 'annuler defaire retour erreur regret',
    repond: () => ({
      texte:
        'Tout ce que je range ou archive s’annule d’un appui, juste après. Ce qui supprime, non — c’est pour ça que la suppression passe toujours par une question avant.',
    }),
  },
  {
    id: 'combien',
    cles: 'combien logiques regles nombre',
    repond: () => ({
      texte: `${SCRIPTS.length} logiques, en sept familles. Toutes déterministes, toutes explicables en une phrase — et la règle exacte de chacune est à un appui.`,
      suites: ['Que sais-tu faire ?'],
    }),
  },
]

/* ================= la recherche ================= */

function trouver(demande: string, civilites: boolean): Reponse | null {
  const mots = motsDe(demande)
  /* Une civilité tient en un ou deux mots. Au-delà, « bonjour, tu peux
     me ranger les notes du Bouquin ? » n'est plus un bonjour : c'est une
     demande, et c'est elle qu'il faut servir. */
  const courte = mots.length <= 3

  // les tournures entières d'abord : elles sont exactes, donc sûres
  for (const e of BIBLIOTHEQUE) {
    if (Boolean(e.civilite) !== civilites) continue
    if (e.motif?.test(demande)) return e.repond()
  }

  if (civilites && !courte) return null

  let meilleur: { e: Entree; score: number } | null = null
  for (const e of BIBLIOTHEQUE) {
    if (Boolean(e.civilite) !== civilites) continue
    const cles = e.cles.split(/\s+/)
    const score = mots.filter((m) => cles.some((c) => memeRacine(m, c))).length
    if (score > 0 && (!meilleur || score > meilleur.score)) meilleur = { e, score }
  }
  return meilleur ? meilleur.e.repond() : null
}

/**
 * La demande est-elle une QUESTION SUR LE FONCTIONNEMENT ?
 *
 * « Comment marche la synchro » contient « synchro », donc une logique
 * l'attrape avant que la bibliothèque n'ait son tour — et Atlas
 * répondait par la file d'envoi à quelqu'un qui demandait une
 * explication. La règle « agir avant expliquer » est bonne, sauf
 * quand la phrase dit explicitement qu'elle veut une explication.
 */
export const veutUneExplication = (demande: string) =>
  /^\s*(comment|pourquoi|c.est quoi|qu.est.ce que|explique)/i.test(demande)

function memeRacine(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length >= 4 && b.startsWith(a)) return true
  if (b.length >= 4 && a.startsWith(b)) return true
  return a.length >= 6 && b.length >= 6 && a.slice(0, 5) === b.slice(0, 5)
}

/** Les politesses — testées AVANT les logiques. */
export const civilite = (demande: string) => trouver(demande, true)

/** Les explications — testées APRÈS, pour qu'agir passe avant expliquer. */
export const sujet = (demande: string) => trouver(demande, false)

/** Ce qu'Atlas répond quand il ne trouve rien, selon le mode. */
export function incompris(mode: 'classique' | 'ia', iaDisponible: boolean): Reponse {
  if (mode === 'ia' && !iaDisponible) {
    return {
      texte:
        'Le mode IA est choisi, mais aucun service n’est branché : je réponds donc avec mes règles, et celle-ci ne dit rien. Je préfère te le dire que deviner.',
      suites: ['Que sais-tu faire ?', 'Le mode IA'],
    }
  }
  return {
    texte:
      'Je ne comprends pas cette demande — et je préfère te le dire que deviner. Voilà tout ce que je sais faire :',
  }
}
