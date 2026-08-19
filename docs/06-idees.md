# Atlas — Idées en attente

> Ce que tu as noté, avec un verdict technique honnête sur chacune. Ce document existe pour
> qu'aucune idée ne se perde, et pour qu'on ne redécouvre pas deux fois la même contrainte.

---

## 1. Capter les captures d'écran — ❌ impossible en PWA

**L'idée.** Atlas détecte qu'une capture d'écran vient d'être prise et propose de la ranger :
dans un espace, dans le flux, ou nulle part.

**Le verdict.** **Le web n'a aucune interface pour ça.** Ni sur iOS, ni ailleurs, ni derrière une
permission. Ce n'est pas une question de navigateur récent : la capacité n'existe pas.

Une app **native** iOS le peut (`userDidTakeScreenshotNotification`). Atlas devrait donc être
emballé dans une coque native — la porte de sortie prévue en D6 — **et** gagner un petit module
natif pour relayer l'événement.

**Ce qui marche dès aujourd'hui, et qui sert le même besoin :**

| Chemin | iOS | Android |
|---|---|---|
| **Coller** une capture depuis le presse-papier | ✅ | ✅ |
| **Partager vers Atlas** depuis la feuille de partage système | ❌ (PWA) | ✅ |

Sur iPhone, le geste devient : capture d'écran → copier → ouvrir Atlas → coller. Trois gestes au
lieu d'un, mais réalisable tout de suite. **À faire en priorité : accepter le collage d'image dans
la capture et l'éditeur.**

> C'est le premier argument sérieux en faveur de la coque native. Il faudra en accumuler quelques
> autres avant de payer ce coût (D6).

---

## 2. Écran de premier lancement — ✅ fait, mais pas comme demandé

**L'idée.** Au premier lancement, un écran dans le style de la connexion, présentant les
permissions : micro (dictée, questions à Atlas), notifications, détection de capture d'écran.

**Ce qui est juste :** le moment de premier lancement mérite un écran. Il présente Atlas, pose le
ton, et c'est là qu'on explique ce qu'il sait faire.

**Ce qui est à corriger : demander toutes les permissions d'un coup est le meilleur moyen de se
les faire refuser.** Et sur iOS, un refus est quasi définitif — il faut aller le rétablir dans les
réglages du système, ce que personne ne fait. La règle est donc :

> **On demande une permission au moment où l'on s'en sert, jamais avant.**
> L'écran de bienvenue présente ; il ne réclame pas.

État réel de chacune :

| Permission | Faisable | Quand la demander |
|---|---|---|
| **Notifications** | ✅ sur iOS **16.4+, et seulement une fois l'app installée** sur l'écran d'accueil | à l'activation des rappels, pas avant |
| **Microphone** | ✅ techniquement | au premier appui sur le bouton de dictée — qui n'existe pas encore (D4) |
| **Capture d'écran** | ❌ inexistante | — |

**Ce qui a été construit** — `src/screens/BienvenueScreen.tsx` : un écran autonome (ni barre, ni
encoche, ni rail, comme la connexion), avec l'œil, qui *raconte* les trois moments d'usage puis
liste les trois capacités avec un état honnête en face de chacune — « à installer », « bientôt »,
« indisponible ». Aucune permission n'est demandée. L'écran se termine par une phrase qui engage :
*« Je ne demanderai jamais une autorisation avant d'en avoir besoin. »*

Il s'affiche au premier lancement, et se **revoit à volonté** depuis le profil (bouton
« Revoir la bienvenue »).

---

## 3. Atlas comme entité : l'œil — ✅ fait

**L'idée.** Atlas prend corps : un œil, blanc cerclé de gris, pupille de la couleur principale
avec des nuances, une lueur qui glisse, un iris plus sombre. Une séquence de mouvement. Posé au
centre de la bordure haute du conteneur de connexion.

**Fait** — `src/ui/OeilAtlas.tsx`. Ce qui a été retenu :

- **Il regarde, il ne fixe pas.** Une séquence de 14 s le fait balayer la page avec de longs temps
  d'arrêt : c'est l'immobilité qui rend le mouvement vivant, pas l'inverse.
- **Trois rythmes décalés** — le regard (14 s), la lueur (9 s), le clignement (7,4 s). Aucun
  multiple commun : la boucle ne se voit jamais.
- **La lueur ne suit pas exactement le regard.** Ce décalage est ce qui donne l'impression d'une
  surface bombée plutôt que d'un dessin plat.
- **L'iris dérive de l'accent** : clair au centre, vif au milieu, sombre au bord, plus un liseré.
  Changer la couleur dans les réglages change la couleur de ses yeux.
- La paupière reste **hors champ** hors clignement, et ne coûte donc rien.
- Tout en `transform` et `opacity` : le tracé n'est jamais recalculé.

**La suite pour lui**, quand Atlas se mettra à agir (V1/V2) : que le regard réagisse — qu'il se
tourne vers ce qu'on écrit, se ferme en mode focus, s'illumine quand il a quelque chose à dire.
C'est là qu'il cessera d'être un logo pour devenir une présence.
