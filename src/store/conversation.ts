import { motsDe, SCRIPTS } from './scripts'
import { versionCourte } from './version'

/* ---------------------------------------------------------------
   LA BIBLIOTHÈQUE DE CONVERSATION.

   Tout ce qu'Atlas sait dire de lui-même et de l'app. Une
   cinquantaine de réponses écrites à la main, rangées par thème et
   consultables comme un sommaire.

   ── LA RÈGLE QUI TIENT TOUT

   ATLAS NE DIT QUE CE QU'IL SAIT. Aucune réponse ici n'invente, ne
   flatte, ni ne fait semblant de réfléchir. Quand on lui demande
   quelque chose qu'il ne sait pas faire, il répond ce qu'il ne sait
   pas faire — et propose ce qui s'en approche.

   C'est le contraire de ce que fait un assistant scripté ordinaire,
   qui répond « bien sûr ! » à tout et déçoit à la troisième phrase.
   Une bibliothèque honnête vieillit bien ; un faux dialogue non.

   ── POURQUOI C'EST ICI QUE ÇA SE JOUE

   Il n'y a pas de modèle derrière Atlas, et il n'y en aura pas tant
   qu'un service gratuit voudra se payer sur le contenu des notes.
   Ce qu'il sait répondre, c'est donc exactement ce qui est écrit
   dans ce fichier — et enrichir ce fichier est la seule façon de le
   rendre plus utile. C'est lent, c'est manuel, et c'est vrai à cent
   pour cent.

   ── TROIS PASSES, ET L'ORDRE COMPTE

   · LES CIVILITÉS d'abord — « bonjour », « merci », « qui es-tu ».
     Courtes, sans ambiguïté, elles doivent gagner avant que la
     recherche de logiques ne s'en mêle.
   · LES SUJETS ensuite, APRÈS les logiques : si une demande peut
     être une action, c'est l'action qui gagne. Sauf quand la phrase
     commence par « comment » ou « pourquoi », qui réclament une
     explication.
   · LES PROCHES en dernier recours — quand rien ne correspond, on
     propose les trois sujets les moins éloignés plutôt que de
     laisser sur un « je ne sais pas » sec.
   --------------------------------------------------------------- */

export type Reponse = {
  texte: string
  /** ce qu'on peut demander ensuite — des puces, pas un menu */
  suites?: string[]
}

export type Theme = 'atlas' | 'capturer' | 'ranger' | 'ecrire' | 'garder' | 'reglages'

export const THEMES: { id: Theme; nom: string; quoi: string }[] = [
  { id: 'atlas', nom: 'Moi', quoi: 'Qui je suis, ce que je sais et ne sais pas faire.' },
  { id: 'capturer', nom: 'Capturer', quoi: 'Le flux, la recherche, les archives.' },
  { id: 'ranger', nom: 'Ranger', quoi: 'Les espaces, le tri, la sélection.' },
  { id: 'ecrire', nom: 'Écrire', quoi: 'Les formes, les blocs, le markdown.' },
  { id: 'garder', nom: 'Garder', quoi: 'Tes données, la synchro, la sauvegarde.' },
  { id: 'reglages', nom: 'Régler', quoi: 'L’apparence, l’installation, la version.' },
]

type Entree = {
  id: string
  theme: Theme
  /** la question telle qu'on la poserait — sert de libellé dans le sommaire */
  question: string
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
  /* ============ civilités ============ */
  {
    id: 'bonjour',
    theme: 'atlas',
    question: 'Bonjour',
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
    theme: 'atlas',
    question: 'Comment vas-tu ?',
    cles: 'humeur',
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
    theme: 'atlas',
    question: 'Merci',
    cles: 'merci remercie super genial parfait nickel bravo',
    civilite: true,
    repond: () => ({ texte: 'De rien. Je n’ai fait qu’appliquer une règle.' }),
  },
  {
    id: 'aurevoir',
    theme: 'atlas',
    question: 'Au revoir',
    cles: 'revoir bye ciao adieu bonne nuit',
    civilite: true,
    repond: () => ({ texte: 'À tout à l’heure. Je garde tout.' }),
  },
  {
    id: 'pardon',
    theme: 'atlas',
    question: 'Tu ne sers à rien',
    cles: 'idiot inutile stupide',
    motif: /\b(nul|bête|bete)\b|sers à rien|sert a rien/i,
    civilite: true,
    repond: () => ({
      texte:
        'Possible. Je ne sais que ce qu’on m’a écrit, et je préfère te le dire que broder. Si une réponse te manque, c’est une ligne à ajouter — pas une intelligence à attendre.',
      suites: ['Tes limites', 'De quoi peux-tu parler ?'],
    }),
  },

  /* ============ Atlas lui-même ============ */
  {
    id: 'qui',
    theme: 'atlas',
    question: 'Qui es-tu ?',
    cles: 'presente identite appelle',
    motif: /qui (es|est)|c.est qui|tu es qui/i,
    civilite: true,
    repond: () => ({
      texte:
        'Je suis Atlas — l’endroit où tu déposes tes idées, et celui qui les range avec toi. Je ne pense pas : j’applique des règles, et je le dis quand je ne comprends pas.',
      suites: ['Que sais-tu faire ?', 'De quoi peux-tu parler ?', 'Tes limites'],
    }),
  },
  {
    id: 'es-tu-une-ia',
    theme: 'atlas',
    question: 'Es-tu une intelligence artificielle ?',
    cles: 'intelligence artificielle robot chatbot',
    motif: /ia|intelligence artificielle|es.?tu (une|un) /i,
    repond: () => ({
      texte:
        'Non. Aucun modèle derrière moi — que des règles écrites à la main. Ça veut dire que je ne me trompe jamais avec assurance, et que je ne comprends que ce qui a été prévu. Les deux vont ensemble.',
      suites: ['Pourquoi pas d’IA ?', 'Tes limites'],
    }),
  },
  {
    id: 'pourquoi-pas-ia',
    theme: 'atlas',
    question: 'Pourquoi pas d’IA ?',
    cles: 'pourquoi brancher payant gratuit cout',
    repond: () => ({
      texte:
        'Les services gratuits se paient sur ce qu’on leur donne : leurs conditions disent que le contenu peut servir à entraîner leurs modèles. Or ici, le contenu, c’est ton second cerveau. Le jour où ça se branchera, ce sera sur un service payant et discret — pas avant.',
      suites: ['Où vivent mes données ?'],
    }),
  },
  {
    id: 'limites',
    theme: 'atlas',
    question: 'Tes limites',
    cles: 'limites impossible incapable manque',
    repond: () => ({
      texte:
        'Je ne sais ni écrire à ta place, ni résumer, ni répondre à une question ouverte, ni deviner ce qui n’a pas été prévu. En échange, je ne raconte jamais n’importe quoi, je marche hors ligne, et je ne coûte rien.',
      suites: ['Que sais-tu faire ?', 'De quoi peux-tu parler ?'],
    }),
  },
  {
    id: 'ecrire-pour-moi',
    theme: 'atlas',
    question: 'Écris-moi quelque chose',
    cles: 'ecris redige poeme histoire invente raconte blague resume traduis corrige',
    repond: () => ({
      texte:
        'Je ne sais pas écrire — ni un poème, ni un résumé, ni une blague. Aucun générateur de texte ici, juste des règles. Ce que je sais faire, c’est ranger ce que TU as écrit.',
      suites: ['Que sais-tu faire ?'],
    }),
  },
  {
    id: 'me-connais-tu',
    theme: 'atlas',
    question: 'Tu me connais ?',
    cles: 'connais souviens memoire profil',
    repond: () => ({
      texte:
        'Je connais tes notes, tes espaces et ton prénom — rien d’autre, et rien qui sorte de cet appareil. Je ne garde pas non plus nos conversations : chaque fois que tu m’ouvres, je repars du contenu, pas d’un souvenir.',
      suites: ['Où vivent mes données ?'],
    }),
  },
  {
    id: 'nom-atlas',
    theme: 'atlas',
    question: 'Pourquoi « Atlas » ?',
    cles: 'nom appelle baptise',
    motif: /pourquoi.*(atlas|ce nom)|d.ou vient (le|ton) nom|nom atlas/i,
    repond: () => ({
      texte:
        'Un atlas, c’est ce qui met de l’ordre dans un territoire trop grand pour être tenu en tête. C’est exactement le travail : tes idées existent, il leur manquait une carte.',
    }),
  },
  {
    id: 'sommaire',
    theme: 'atlas',
    question: 'De quoi peux-tu parler ?',
    cles: 'sujets parler discuter sommaire',
    repond: () => ({
      texte: 'Voilà tout ce sur quoi je sais répondre. Appuie sur un thème pour l’ouvrir.',
    }),
  },
  {
    id: 'bug',
    theme: 'atlas',
    question: 'Il y a un bug',
    cles: 'bug bogue probleme casse erreur plante',
    repond: () => ({
      texte:
        'Je ne sais pas les signaler moi-même. Deux réflexes utiles : recharger l’app — le service worker garde parfois une version de retard — et vérifier le numéro dans Réglages avant d’en parler.',
      suites: ['La version', 'Ma sauvegarde'],
    }),
  },

  /* ============ capturer ============ */
  {
    id: 'capture-comment',
    theme: 'capturer',
    question: 'Comment capturer une idée ?',
    cles: 'capture capturer eclair rapide noter',
    repond: () => ({
      texte:
        'L’écran de capture n’a qu’un champ. Tu tapes, Entrée valide, et tu arrives sur la note. Aucun choix au moment où l’idée tombe — c’est la promesse des dix secondes. Maj+Entrée passe à la ligne.',
      suites: ['À quoi sert le flux ?'],
    }),
  },
  {
    id: 'flux-comment',
    theme: 'capturer',
    question: 'À quoi sert le flux ?',
    cles: 'flux liste inbox accueil journal',
    repond: () => ({
      texte:
        'Le flux, c’est tout ce que tu as capturé, groupé par jour. Ce n’est PAS une boîte de réception : il n’y a pas de compteur de retard, pas de zéro à atteindre. Une note qui reste libre n’est pas un échec.',
      suites: ['Comment chercher ?', 'Les archives'],
    }),
  },
  {
    id: 'recherche-comment',
    theme: 'capturer',
    question: 'Comment chercher ?',
    cles: 'recherche chercher trouver retrouver',
    repond: () => ({
      texte:
        'La barre en haut du flux cherche dans TOUT le contenu, pas seulement les titres — le texte des fiches, les nœuds des cartes, les cellules des tables, les étiquettes des planches. Par les mots exacts, pas encore par le sens.',
      suites: ['Les mots rares'],
    }),
  },
  {
    id: 'archives-comment',
    theme: 'capturer',
    question: 'Les archives',
    cles: 'archive archiver archivee ranger cote',
    repond: () => ({
      texte:
        'Archiver sort une note du flux sans rien perdre : elle reste consultable et se restaure d’un geste. Le bouton est en bas du flux, même quand il n’y a rien dedans.',
      suites: ['Ce qui dort'],
    }),
  },
  {
    id: 'supprimer-comment',
    theme: 'capturer',
    question: 'Comment supprimer une note ?',
    cles: 'supprimer effacer detruire poubelle corbeille',
    repond: () => ({
      texte:
        'Depuis la note, ou en tirant une ligne du flux vers la droite. Il n’y a pas de corbeille : supprimer est le seul geste que je ne sais pas défaire, et c’est pour ça qu’il passe toujours par une question. Archiver, lui, ne perd rien.',
      suites: ['Les archives', 'Comment annuler ?'],
    }),
  },
  {
    id: 'balayage-comment',
    theme: 'capturer',
    question: 'Les gestes sur une ligne',
    cles: 'balayage balayer swipe glisser geste doigt tirer',
    repond: () => ({
      texte:
        'Sur une ligne du flux : vers la droite pour archiver ou supprimer — les deux sont proposés, à toi de choisir ce que ça coûte. Vers la gauche pour classer. Et l’appui long ouvre la sélection multiple.',
      suites: ['La sélection multiple'],
    }),
  },
  {
    id: 'titre-comment',
    theme: 'capturer',
    question: 'D’où vient le titre d’une note ?',
    cles: 'titre nommer nom note',
    repond: () => ({
      texte:
        'De sa première ligne, tant que tu n’en écris pas un. Un titre qu’il faut remplir avant d’écrire, c’est un formulaire — et un formulaire, à l’instant où l’idée tombe, c’est une idée perdue.',
    }),
  },

  /* ============ ranger ============ */
  {
    id: 'espaces-comment',
    theme: 'ranger',
    question: 'À quoi servent les espaces ?',
    cles: 'espace dossier classement organisation contenant',
    repond: () => ({
      texte:
        'Un espace est un grand contenant thématique — Le Bouquin, La Chaîne, Perso. La plupart de tes notes n’en auront jamais, et c’est normal : on range le jour où un projet en a besoin, pas au moment de capturer.',
      suites: ['Range mes notes', 'Pourquoi pas de sous-dossiers ?'],
    }),
  },
  {
    id: 'sous-dossiers',
    theme: 'ranger',
    question: 'Pourquoi pas de sous-dossiers ?',
    cles: 'hierarchie arborescence niveau imbrique dossier',
    motif: /sous.?dossier|arborescence|hierarchie|sous.?espace/i,
    repond: () => ({
      texte:
        'Un seul niveau : espace, puis note. Une arborescence donne l’illusion d’avoir rangé alors qu’on n’a fait que déplacer — et deux heures à classer, zéro à écrire, c’est le risque numéro un de ce genre d’outil.',
      suites: ['À quoi servent les espaces ?'],
    }),
  },
  {
    id: 'selection-comment',
    theme: 'ranger',
    question: 'La sélection multiple',
    cles: 'selection multiple plusieurs cocher lot appui long',
    repond: () => ({
      texte:
        'Appui long sur une ligne — dans le flux, les archives ou les espaces. Les cases apparaissent, la barre du bas porte les actions. Toute suppression en lot passe par une confirmation.',
    }),
  },
  {
    id: 'non-tries',
    theme: 'ranger',
    question: 'C’est quoi « Non triés » ?',
    cles: 'non tries libre sans espace tas',
    repond: () => ({
      texte:
        'Ce n’est pas un espace : c’est la vue de tout ce qui n’en a pas. Rien ne s’y range, on ne peut ni le renommer ni le supprimer. C’est le tas le plus gros, et il le restera.',
      suites: ['Range mes notes'],
    }),
  },
  {
    id: 'couleur-espace',
    theme: 'ranger',
    question: 'La couleur d’un espace',
    cles: 'couleur teinte pastille',
    repond: () => ({
      texte:
        'Chaque espace porte une couleur et, si tu veux, une image. Ce n’est pas de la décoration : c’est ce qui te fait reconnaître le lieu du coin de l’œil, avant d’avoir lu son nom. Un espace peut aussi n’avoir aucune couleur.',
    }),
  },
  {
    id: 'annuler-comment',
    theme: 'ranger',
    question: 'Comment annuler ?',
    cles: 'annuler defaire retour erreur regret',
    repond: () => ({
      texte:
        'Tout ce que je range ou archive s’annule d’un appui, juste après. Ce qui supprime, non — c’est pour ça que la suppression passe toujours par une question avant.',
    }),
  },

  /* ============ écrire ============ */
  {
    id: 'formes-comment',
    theme: 'ecrire',
    question: 'C’est quoi les formes ?',
    cles: 'forme onglet plusieurs',
    repond: () => ({
      texte:
        'Une note porte autant de formes qu’elle veut, en onglets : fiche, carte mentale, dessin, planche, table, chronologie. Le « + » à droite en ajoute une, un deuxième appui sur un onglet le renomme. Le type d’une note est une conséquence de ce que tu en fais, jamais une case à cocher au départ.',
      suites: ['La planche', 'La table', 'La chronologie'],
    }),
  },
  {
    id: 'planche-comment',
    theme: 'ecrire',
    question: 'La planche',
    cles: 'planche moodboard image empiler coller',
    repond: () => ({
      texte:
        'Un plan libre où tu poses des images et des mots, qu’on déplace, incline et empile. C’est le seul endroit où la POSITION est le contenu : ailleurs une note se lit de haut en bas, ici c’est le voisinage de deux images qui dit quelque chose. Ctrl+V y colle une capture d’écran.',
    }),
  },
  {
    id: 'table-comment',
    theme: 'ecrire',
    question: 'La table',
    cles: 'table personnage lieu source colonne',
    /* Ancré des deux côtés : « la table » doit venir ici, mais « les
       lignes de la table » reste une affaire de logique. */
    motif: /^(la |les |une )?tables?\s*\??$/i,
    repond: () => ({
      texte:
        'De quoi lister des personnages, des lieux, des sources — avec des colonnes typées : texte, nombre, date, étiquettes, case, image. Et une ligne peut devenir une note à part entière le jour où elle mérite mieux qu’une cellule.',
    }),
  },
  {
    id: 'frise-comment',
    theme: 'ecrire',
    question: 'La chronologie',
    cles: 'chronologie frise date evenement jalon piste',
    /* Nommer la forme, c'est demander ce qu'elle est ; « les
       chronologies en attente » reste une affaire de logique. */
    motif: /^(la |les |une )?(chronologies?|frises?)\s*\??$/i,
    repond: () => ({
      texte:
        'Un axe et des jalons. La date s’y écrit comme on la dit — « au printemps suivant », « an 12 du règne » : un vrai champ date obligerait à en inventer de fausses. Et deux jalons de même rang s’alignent, ce qui fait les fils parallèles.',
    }),
  },
  {
    id: 'carte-comment',
    theme: 'ecrire',
    question: 'La carte mentale',
    cles: 'carte mentale mindmap branche noeud ramifier',
    repond: () => ({
      texte:
        'Des nœuds qu’on ramifie. Sélectionne un nœud pour lui ajouter une branche, double-clic pour renommer. Supprimer un nœud ne détruit jamais sa branche : ses enfants remontent d’un cran.',
    }),
  },
  {
    id: 'dessin-comment',
    theme: 'ecrire',
    question: 'Le dessin',
    cles: 'dessin croquis plume surligneur trait papier stylet',
    repond: () => ({
      texte:
        'Plume, surligneur, ligne droite, trois encres et quatre papiers. Le stylet est reconnu : la pression change l’épaisseur du trait.',
    }),
  },
  {
    id: 'blocs-comment',
    theme: 'ecrire',
    question: 'Les blocs d’une fiche',
    cles: 'bloc paragraphe puce liste tableau colonne galerie separation',
    repond: () => ({
      texte:
        'Une fiche est une suite de blocs, chacun déplaçable : texte, titres, listes à puces, numérotées ou à cocher, citation, anecdote, étiquettes, image, galerie, tableau, colonnes, séparation. Le menu « / » les propose tous.',
      suites: ['Les raccourcis markdown'],
    }),
  },
  {
    id: 'markdown-raccourcis',
    theme: 'ecrire',
    question: 'Les raccourcis markdown',
    cles: 'markdown raccourci diese tiret transformer',
    repond: () => ({
      texte:
        'En début de ligne, suivis d’une espace : # ## ### pour les titres, - pour une puce, 1. pour une liste numérotée, [] pour une case à cocher, > pour une citation, !! pour une anecdote, --- pour une séparation. Le marqueur disparaît tout seul.',
      suites: ['Les blocs d’une fiche'],
    }),
  },
  {
    id: 'markdown-export',
    theme: 'ecrire',
    question: 'Copier en markdown',
    cles: 'markdown copier coller partager chatgpt emporter',
    repond: () => ({
      texte:
        'Le bouton « Markdown » dans l’en-tête d’une note, ou « Emporter » dans les réglages d’un espace pour tout un sujet. Les images deviennent leur légende — un lien de fichier ne se colle nulle part.',
      suites: ['Emporter un espace'],
    }),
  },
  {
    id: 'images-comment',
    theme: 'ecrire',
    question: 'Les images',
    cles: 'image photo illustration couverture vignette',
    /* « les images » explique ; « les images orphelines » nettoie. */
    motif: /^(les |des |une |l')?images?\s*\??$/i,
    repond: () => ({
      texte:
        'Partout : en couverture d’une note, dans une fiche, en galerie, sur une planche, dans une colonne de table, sur un espace, en portrait de profil. Toutes sont réduites et réencodées à l’import — c’est le seul poste qui coûte vraiment de la place.',
      suites: ['La place occupée', 'Les images orphelines'],
    }),
  },

  /* ============ garder ============ */
  {
    id: 'donnees',
    theme: 'garder',
    question: 'Où vivent mes données ?',
    cles: 'donnees prive confidentiel serveur nuage stocke vivent vendues',
    repond: () => ({
      texte:
        'D’abord sur cet appareil, dans le navigateur — l’app marche en avion. Avec un compte, une copie part chez l’hébergeur pour que tes autres appareils la retrouvent. Rien n’est vendu, rien n’entraîne quoi que ce soit, et l’export complet existe depuis le premier jour.',
      suites: ['La sauvegarde', 'La synchronisation'],
    }),
  },
  {
    id: 'sauvegarde-comment',
    theme: 'garder',
    question: 'La sauvegarde',
    cles: 'sauvegarde export archive zip backup',
    repond: () => ({
      texte:
        'Réglages → Sauvegarde. Une archive .zip avec le contenu en markdown lisible sans Atlas, les images d’origine, et un fichier de données complet. Ce n’est pas un confort : si Atlas disparaît, tes notes survivent.',
      suites: ['Ma sauvegarde'],
    }),
  },
  {
    id: 'synchro-comment',
    theme: 'garder',
    question: 'La synchronisation',
    cles: 'synchronisation synchro appareils telephone ordinateur',
    repond: () => ({
      texte:
        'L’écran lit toujours la base locale : l’app reste instantanée, même sans réseau. Les modifications partent derrière et rattrapent au retour du signal. En cas de conflit, la version la plus récente gagne.',
      suites: ['La file d’envoi'],
    }),
  },
  {
    id: 'hors-ligne',
    theme: 'garder',
    question: 'Ça marche hors ligne ?',
    cles: 'avion reseau internet deconnecte',
    motif: /hors.?ligne|sans (reseau|internet|connexion)|en avion|deconnect/i,
    repond: () => ({
      texte:
        'Oui, entièrement. Écrire, chercher, ranger, dessiner : tout lit et écrit la base locale. Le réseau ne sert qu’à recopier vers tes autres appareils, et il rattrape tout seul.',
    }),
  },
  {
    id: 'compte-comment',
    theme: 'garder',
    question: 'À quoi sert le compte ?',
    cles: 'compte connexion inscription connecter',
    repond: () => ({
      texte:
        'Uniquement à retrouver tes idées sur tes autres appareils. Atlas s’utilise sans compte, hors ligne, sans écran d’accueil : la connexion est un réglage, pas un péage. Ce que tu as écrit avant de te connecter rejoint le compte à la première connexion.',
      suites: ['La synchronisation'],
    }),
  },
  {
    id: 'mdp-oublie',
    theme: 'garder',
    question: 'J’ai oublié mon mot de passe',
    cles: 'oublie perdu reinitialiser identifiant',
    motif: /mot de passe/i,
    repond: () => ({
      texte:
        'Le lien « Mot de passe oublié ? » est sous le champ, à la connexion. Il envoie un lien à usage unique — regarde tes indésirables, il s’y range souvent.',
    }),
  },
  {
    id: 'quota-comment',
    theme: 'garder',
    question: 'La place et le quota',
    cles: 'quota place stockage plafond octets gratuit payant limite',
    repond: () => ({
      texte:
        'Formule gratuite : 50 Mo d’images et 20 000 notes. Ce ne sont pas des chiffres choisis mais un usage intense mesuré, doublé. Écrire n’est jamais bloqué — seules les images ont une vraie limite.',
      suites: ['La place occupée', 'Les images orphelines'],
    }),
  },
  {
    id: 'vider',
    theme: 'garder',
    question: 'Vider cet appareil',
    cles: 'vider effacer reinitialiser nettoyer appareil remettre zero',
    repond: () => ({
      texte:
        'Réglages → Place occupée → Vider cet appareil. Ce qui a déjà été synchronisé redescendra du nuage ; ce qui ne l’a pas été est perdu. Fais une sauvegarde d’abord si tu n’es pas sûr.',
      suites: ['La sauvegarde'],
    }),
  },

  /* ============ régler ============ */
  {
    id: 'theme-comment',
    theme: 'reglages',
    question: 'Changer l’apparence',
    cles: 'theme sombre clair nuit apparence couleur accent verre matiere',
    repond: () => ({
      texte:
        'Réglages : clair, sombre ou automatique selon l’heure ; la matière — verre ou uni ; et la couleur d’accent, qui reteinte toute l’app, mon œil compris.',
    }),
  },
  {
    id: 'installer',
    theme: 'reglages',
    question: 'Installer Atlas sur mon téléphone',
    cles: 'installer application accueil iphone android telephone mobile',
    repond: () => ({
      texte:
        'Ouvre l’adresse dans Safari sur iPhone — seul Safari sait installer — puis Partager → Sur l’écran d’accueil. Atlas s’ouvre alors en plein écran, sans barre de navigateur, et démarre même sans réseau.',
    }),
  },
  {
    id: 'focus',
    theme: 'reglages',
    question: 'Le mode focus',
    cles: 'focus concentration distraction plein ecran',
    repond: () => ({
      texte:
        'Sur grand écran, il replie les panneaux latéraux pour ne laisser que ce que tu écris. C’est le moment « atelier » : je me tais, tu travailles.',
    }),
  },
  {
    id: 'version-comment',
    theme: 'reglages',
    question: 'La version',
    cles: 'version mise jour maj build recharger',
    repond: () => ({
      texte: `Tu es sur ${versionCourte()}, et le repère complet est dans Réglages → Version. Si l’app semble vieille, recharge : le service worker garde parfois une version de retard.`,
    }),
  },
  {
    id: 'combien',
    theme: 'atlas',
    question: 'Combien de logiques connais-tu ?',
    cles: 'combien logiques regles nombre',
    repond: () => ({
      texte: `${SCRIPTS.length} logiques, en sept familles. Toutes déterministes, toutes explicables en une phrase — et la règle exacte de chacune est à un appui.`,
      suites: ['Que sais-tu faire ?'],
    }),
  },
]

/* ================= la recherche ================= */

function memeRacine(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length >= 4 && b.startsWith(a)) return true
  if (b.length >= 4 && a.startsWith(b)) return true
  return a.length >= 6 && b.length >= 6 && a.slice(0, 5) === b.slice(0, 5)
}

function score(e: Entree, mots: string[]): number {
  const cles = e.cles.split(/\s+/)
  return mots.filter((m) => cles.some((c) => memeRacine(m, c))).length
}

/**
 * La réponse la mieux notée, ET SON SCORE.
 *
 * Le score sert à départager avec les logiques. Sans lui, une logique
 * gagnait toujours dès qu'un seul de ses mots-clés traînait dans la
 * phrase : « j'ai oublié mon mot de passe » partait sur « Ce qui
 * dort » à cause d'« oublié », « ça marche hors ligne ? » sur « Les
 * liens brisés » à cause de « ligne ». Un mot commun sur deux ne vaut
 * pas deux mots communs sur deux.
 *
 * Une tournure reconnue en entier vaut TRÈS cher (100) : elle a été
 * écrite exprès pour cette question-là, rien ne devrait la battre.
 */
function trouver(demande: string, civilites: boolean): { r: Reponse; score: number } | null {
  const mots = motsDe(demande)
  /* Une civilité tient en un ou deux mots. Au-delà, « bonjour, tu peux
     me ranger les notes du Bouquin ? » n'est plus un bonjour : c'est une
     demande, et c'est elle qu'il faut servir. */
  const courte = mots.length <= 3

  // les tournures entières d'abord : elles sont exactes, donc sûres
  for (const e of BIBLIOTHEQUE) {
    if (Boolean(e.civilite) !== civilites) continue
    if (e.motif?.test(demande)) return { r: e.repond(), score: 100 }
  }

  if (civilites && !courte) return null

  let meilleur: { e: Entree; score: number } | null = null
  for (const e of BIBLIOTHEQUE) {
    if (Boolean(e.civilite) !== civilites) continue
    const n = score(e, mots)
    if (n > 0 && (!meilleur || n > meilleur.score)) meilleur = { e, score: n }
  }
  return meilleur ? { r: meilleur.e.repond(), score: meilleur.score } : null
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
  /^\s*(comment|pourquoi|c.est quoi|qu.est.ce que|explique|a quoi sert|à quoi sert)/i.test(demande)

/** Les politesses — testées AVANT les logiques, sans discussion. */
export const civilite = (demande: string) => trouver(demande, true)?.r ?? null

/**
 * Les explications, avec leur score, pour être comparées aux logiques.
 *
 * Une question qui commence par « comment » ou « pourquoi » gagne un
 * point : à égalité de mots, elle réclame explicitement une
 * explication, et c'est le seul indice fiable qu'on ait.
 */
export function sujet(demande: string): { r: Reponse; score: number } | null {
  const t = trouver(demande, false)
  if (!t) return null
  return veutUneExplication(demande) ? { ...t, score: t.score + 1 } : t
}

/** Le sommaire, thème par thème. */
export const sujetsDe = (theme: Theme) =>
  BIBLIOTHEQUE.filter((e) => e.theme === theme && !e.civilite).map((e) => e.question)

/**
 * LA RÉPONSE EXACTE D'UNE QUESTION DU SOMMAIRE.
 *
 * Quand on appuie sur « La synchronisation » dans la liste, on sait
 * déjà de quelle entrée il s'agit : la faire repasser par la
 * recherche par mots, c'est rejouer une devinette dont on a la
 * réponse — et la perdre. Un balayage complet du sommaire l'a
 * montré : treize questions sur quarante-quatre atterrissaient
 * ailleurs, « La synchronisation » sur « Les images manquantes »,
 * « Les archives » sur « Ce qui dort ».
 *
 * On ne tente donc pas de départager par des mots-clés toujours plus
 * fins : on reconnaît le libellé au caractère près, et on répond.
 */
export function parQuestion(demande: string): Reponse | null {
  const cible = demande.trim().toLowerCase()
  const e = BIBLIOTHEQUE.find((x) => x.question.toLowerCase() === cible)
  return e ? e.repond() : null
}

export const NOMBRE_DE_SUJETS = BIBLIOTHEQUE.filter((e) => !e.civilite).length

/**
 * Ce qu'Atlas propose quand il n'a rien trouvé.
 *
 * PLUTÔT QUE DE S'ARRÊTER À « JE NE SAIS PAS ». On reprend les mots de
 * la demande et on ressort les trois sujets les moins éloignés — même
 * un score de zéro donne un point de départ, en tirant les questions
 * les plus générales. Un aveu sans porte de sortie, on ne le lit
 * qu'une fois avant de refermer.
 */
export function proches(demande: string): string[] {
  const mots = motsDe(demande)
  const classes = BIBLIOTHEQUE.filter((e) => !e.civilite)
    .map((e) => ({ e, n: score(e, mots) }))
    .sort((a, b) => b.n - a.n)
  const utiles = classes.filter((x) => x.n > 0).slice(0, 3)
  if (utiles.length) return utiles.map((x) => x.e.question)
  return ['De quoi peux-tu parler ?', 'Que sais-tu faire ?', 'Le briefing']
}

/** Ce qu'Atlas répond quand il ne trouve rien. */
export function incompris(demande: string): Reponse {
  return {
    texte:
      'Je ne comprends pas cette demande — et je préfère te le dire que deviner. Peut-être l’une de celles-ci ?',
    suites: proches(demande),
  }
}
