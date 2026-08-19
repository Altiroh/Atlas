# Atlas — Architecture de la V0

> Suite de [01-scope.md](01-scope.md). On passe du **quoi** au **comment c'est organisé**.
> Statut : v0.1 — proposition à valider.

Rappel du terrain (D3) : la V0, c'est **la capture pure**. Pas le Bouquin, pas les Vidéos.
Objectif : que tu remplaces Notes/Keep dès la première semaine.

---

## 1. Le principe directeur

> **Un noyau de vues, trois coquilles de navigation.**

Ce n'est pas « une app responsive ». Les **écrans sont les mêmes** sur les trois appareils —
c'est la **coquille autour** (navigation, densité, écran d'ouverture) qui change, parce que les
trois moments d'usage n'ont pas les mêmes besoins.

La coquille est choisie sur **la largeur de la fenêtre**, jamais sur le type d'appareil détecté.
Conséquence pratique : **tu testes les trois mises en page sur ton Mac** en redimensionnant la
fenêtre. Énorme gain de vitesse d'itération — pas besoin de dégainer la tablette à chaque changement.

| Largeur | Coquille | Moment |
|---|---|---|
| < 700 px | **Compacte** — 1 colonne, barre d'onglets en bas | ⚡ L'éclair |
| 700–1100 px | **Duo** — 2 colonnes (liste + contenu) | 🌊 La rumination |
| > 1100 px | **Atelier** — 3 colonnes repliables | 🔨 L'atelier |

---

## 2. Les six écrans de la V0

On ne peut pas descendre en dessous. Chaque écran justifie son existence par un moment d'usage.

| # | Écran | Rôle | Moment servi |
|---|---|---|---|
| 1 | **Capture** | Un champ, un curseur. Enregistrer et enchaîner. | ⚡ |
| 2 | **Le Flux** | Tout ce que tu as capturé, du plus récent au plus ancien. | 🌊 |
| 3 | **Espaces** | Les grands contenants + leur contenu. | 🌊 🔨 |
| 4 | **Note** | Lecture et écriture d'un document long. | 🔨 |
| 5 | **Recherche** | Retrouver, en plein texte. | tous |
| 6 | **Réglages** | Compte, appareils, export. | — |

**Hors scope V0**, et c'est volontaire : tags, fiches, tâches, liens entre notes, historique de
versions, IA. Tout ça arrive après, sur un socle qui tourne déjà.

---

## 3. Les trois coquilles en détail

### 📱 Compacte — iPhone
- **L'app s'ouvre sur Capture**, curseur actif, clavier levé. Jamais sur une liste.
- Barre d'onglets en bas : **Capture · Flux · Espaces**. Trois onglets, pas plus.
- La recherche est en tête du Flux, pas un onglet.
- Validation = enregistré **et le champ se vide** : on enchaîne les idées sans quitter l'écran.
- Sous le champ, une **rangée de pastilles d'espaces** (cf. § 4.2) : un tap si tu sais déjà, rien sinon.

### 📐 Duo — iPad
- Deux colonnes : **liste à gauche, contenu à droite**.
- L'app s'ouvre sur **le Flux** — c'est le moment de la relecture.
- Rattacher une capture à un espace se fait au doigt, par **balayage** — *fait, et étendu aux trois coquilles*.
- La capture reste accessible via un bouton flottant permanent.

### 🖥️ Atelier — desktop
- Trois colonnes : **Espaces | Liste | Éditeur**.
- Les deux colonnes de gauche se replient → **mode focus**, l'éditeur seul en plein écran.
- La capture est un **raccourci clavier** qui ouvre une fenêtre légère par-dessus, sans quitter ce que tu fais.
- L'app s'ouvre sur **la dernière note touchée** — on reprend le travail où on l'a laissé.

---

## 4. Le tri, tel que ton usage réel l'impose

### 4.1 Le constat qui commande tout

> « Je range quand j'ai un projet. Mais à la volée, il y a **60 % de chances que ce ne soit jamais trié**. »

C'est la donnée de conception la plus importante du projet, et elle invalide le modèle classique
de l'inbox à vider. Trois conséquences, non négociables :

**❌ Pas d'inbox-dette.** Aucun compteur rouge, aucun « 47 non triées », aucun zéro à atteindre.
Une app qui te reproche ton retard, tu l'abandonnes en trois semaines. On appelle cet écran
**le Flux**, pas l'Inbox : c'est un fleuve qui coule, pas une pile qui s'accumule.

**✅ La recherche devient le vrai filet de sécurité.** Si 60 % de la matière n'est jamais rangée,
c'est la recherche — pas le classement — qui garantit que rien n'est perdu. Elle passe donc
**avant** les espaces dans le plan (§ 7).

**✅ Le tri est *tiré* par le projet, jamais *poussé* par la liste.** Tu ne t'assieds pas devant
ton flux pour le vider. C'est en ouvrant Le Bouquin que tu te demandes « qu'est-ce que j'avais
noté là-dessus ? ». Le mécanisme doit donc partir de l'espace, pas du flux.

### 4.2 Les deux seuls mécanismes de classement

**1. Le tap à la capture** — pour les 40 %.
Sous le champ de saisie, une rangée de pastilles : `Bouquin` `Chaîne` `Perso`.
Quand tu es *dans* un projet, tu sais déjà où ça va : **un tap, zéro friction**.
Quand tu ne sais pas, tu ne touches rien et tu valides. C'est ça qui protège le moment ⚡.

**2. « Piocher dans le flux »** — pour récupérer les 60 %, plus tard.
Depuis un espace, un bouton qui ouvre le flux avec un champ de recherche : tu tapes
« narrateur », tu tapes sur les 4 captures qui ressortent, elles rejoignent l'espace.
Le tri se fait **quand tu en as besoin, sur ce dont tu as besoin.** Le reste peut dormir.

*(En V1, l'IA fera la proposition à ta place — mais le mécanisme manuel doit déjà bien marcher
sans elle, sinon on masque un problème de conception derrière de l'intelligence.)*

### 4.3 Le cycle de vie

```
   ⚡ tu écris
        │
        ▼
   ┌──────────┐  tap ou pioche  ┌───────────┐  promotion  ┌────────┐
   │ LE FLUX  │────────────────▶│  CLASSÉE  │────────────▶│  NOTE  │
   │  (brut)  │                 │(un espace)│             │(longue)│
   └──────────┘                 └───────────┘             └────────┘
        │
        └──▶ reste dans le flux, indéfiniment, sans que ce soit un échec
```

**Trois états** : `libre` → `classée` → `archivée`.
`libre` **n'est pas un état d'attente** : c'est un état de repos parfaitement valide.
Rien ne se supprime jamais — l'archive est le fond du tiroir, pas la poubelle.

Une **Note** naît toujours de la promotion d'une capture, jamais d'un formulaire vide.
C'est ce qui garantit que la capture reste le point d'entrée unique.

---

## 5. Le modèle de données (V0)

Trois tables. La discipline ici paie sur toute la vie du projet.

**espace** — `id · nom · couleur · ordre`

**capture** — `id · texte · état(libre|classée|archivée) · espace_id? · note_id? · créée_le · modifiée_le`

**note** — `id · titre · contenu · espace_id · créée_le · modifiée_le`

Pas de table `tag`, pas de table `lien` en V0. On les ajoutera quand le manque se fera *vraiment*
sentir à l'usage — pas avant.

---

## 6. Faire vivre l'app sur les trois supports

### La recommandation : **une app web installable (PWA), d'abord**

Un seul chantier, une seule URL, qui s'installe comme une vraie app sur les trois appareils
(icône sur l'écran d'accueil, plein écran, pas de barre de navigateur).

**Pourquoi c'est le bon choix ici :**
- **Tu testes en permanence, partout.** Chaque modification est visible sur tes trois appareils
  en rechargeant une page. C'est exactement ce que tu demandes avec « tester pas à pas ».
- **Pas de store**, pas de validation Apple, pas de build à distribuer.
- **Un seul code** pour les trois coquilles.
- Le hors-ligne, le stockage local et l'installation sont des capacités web standard aujourd'hui.

### Le contexte tout-Apple : les limites, dites franchement

Tes trois appareils sont Mac + iPad + iPhone. C'est le terrain le plus contraint pour une PWA.

- Sur **iOS**, une PWA n'a **ni widget d'écran d'accueil, ni cible de partage système**.
  Ce sont deux des trois raccourcis qu'on avait prévus pour le moment ⚡ (§ 4 du scope).
- **Le repli est meilleur qu'il n'y paraît** : un **Raccourci** iOS qui ouvre Atlas directement
  sur la capture, déclenchable depuis l'écran d'accueil, mais surtout depuis le **bouton Action**
  (iPhone 15 Pro et suivants) ou le **toucher au dos du téléphone** (Back Tap, réglable sur
  tous les modèles récents). Deux tapes au dos de l'iPhone → champ de capture ouvert.
  Honnêtement, c'est plus rapide qu'un widget.
- La **dictée native du clavier** reste disponible : c'est le moyen de capturer en marchant,
  sans qu'on ait à construire quoi que ce soit (D4).

⚠️ **Le point de vigilance réel, et il est sérieux** : Safari est plus agressif que les autres
navigateurs sur l'effacement des données locales des sites peu utilisés. Une app installée sur
l'écran d'accueil est bien mieux traitée qu'un simple onglet, et on demandera explicitement au
système de **rendre le stockage persistant** — mais on ne peut pas garantir à 100 % qu'une
capture restée **uniquement** en local survivra à des semaines d'inactivité.

**Conséquence directe sur le plan** : la sync (jalon 3) n'est pas un confort, c'est **la
sauvegarde**. Elle doit arriver tôt, et une capture ne doit jamais rester longtemps
non synchronisée. C'est la raison pour laquelle les jalons 3 et 4 précèdent tout le reste.

### La porte de sortie, si ça coince

On **emballe la même app web dans une coque native** (Capacitor). Le code des écrans ne change
pas d'une ligne ; on gagne le widget, le partage système et un stockage garanti, au prix d'un
build à installer sur l'iPhone.

C'est la bonne façon de prendre la décision : **on ne paie ce coût que si l'usage réel prouve
qu'il manque quelque chose.** Pas avant.

### Ce que ça donne par appareil

| Appareil | En V0 | Si on emballe plus tard |
|---|---|---|
| **Mac** | App installée depuis le navigateur | + raccourci clavier global de capture |
| **iPad** | App installée, plein écran, hors ligne | (rien de plus nécessaire) |
| **iPhone** | App installée + Raccourci sur Back Tap / bouton Action | + widget, partage système, stockage garanti |

### La sync (D2 — cloud grand public)

- **L'appareil est la source de vérité de l'affichage.** L'écran lit toujours les données
  locales : l'app reste instantanée et fonctionne en mode avion.
- La sync tourne **en arrière-plan**, et rattrape au retour du réseau.
- **Un seul utilisateur, jamais deux écritures simultanées** → pas besoin de machinerie de
  fusion complexe. La dernière écriture gagne, champ par champ. On ne sur-construit pas.
- **L'export automatique en markdown tourne dès la V0** — c'est l'assurance-vie exigée par D2.

---

## 7. Le plan pas à pas

Huit jalons. **Chacun se termine par quelque chose que tu peux tester toi-même**, et l'app
devient réellement utilisable à partir du jalon 4.

| # | Jalon | Ce que tu testes, concrètement |
|---|---|---|
| **1** | **Les trois coquilles** — écrans vides, navigation qui marche | Tu ouvres l'URL sur le Mac et tu redimensionnes : les 3 mises en page apparaissent. Puis sur l'iPhone et l'iPad. |
| **2** | **Capturer, en local** — champ + Flux, stockage sur l'appareil | Tu chronomètres : ouverture → texte enregistré. **Objectif < 2 s.** Si c'est raté ici, tout le reste est inutile. |
| **3** | **Le compte et la sync** | Tu captures sur l'iPhone, ça apparaît sur le Mac. *C'est aussi ta sauvegarde — cf. le point Safari au § 6.* |
| **4** | **Le hors-ligne** | Mode avion, tu captures 3 idées, tu réactives : tout remonte. *À partir d'ici, tu utilises Atlas pour de vrai.* |
| **5** | **Le Flux et la recherche** | Tu retrouves une capture précise de la semaine passée. **Remonté ici exprès** : c'est le filet de sécurité des 60 % jamais rangés. |
| **6** | **Espaces** — le tap à la capture + « piocher dans le flux » | Tu crées Le Bouquin, tu y pioches tout ce qui le concerne. Le vrai test du § 4.2. |
| **7** | **Notes et éditeur** | Tu écris un vrai bout de chapitre sur le Mac, tu le relis sur l'iPad. |
| **8** | **Installation et export automatique** | Icône Atlas sur les 3 écrans d'accueil + Raccourci sur le Back Tap ; tu récupères tout en markdown sur ton disque. |

Les jalons 1 à 4 forment le **socle** : tant qu'ils ne sont pas solides, on n'ajoute rien.
La recherche est passée devant les espaces (échange 5 ↔ 6 par rapport à la première version du
plan) — conséquence directe du § 4.1.

---

## 8. Décisions actées pour la V0

| # | Décision | Conséquence |
|---|---|---|
| **D5** | **Mac + iPad + iPhone** | Terrain le plus contraint pour une PWA. Raccourci iOS sur Back Tap / bouton Action à la place du widget ; sync = sauvegarde (§ 6). |
| **D6** | **PWA d'abord**, coque native seulement si l'usage le réclame | Une URL, test immédiat sur les 3 appareils, aucune réécriture à prévoir en cas de bascule. |
| **D7** | **Le tri est partiel et assumé** — ~40 % au tap, ~60 % jamais rangé | Pas d'inbox-dette ; « Le Flux » remplace « l'Inbox » ; la recherche passe avant les espaces dans le plan. |
| **D8** | **La V0 n'est plus « la capture pure »** — elle contient un vrai éditeur | Révision explicite de D3. Un **Post** = titre + corps + image + espace, éditable et enregistré au fil de la frappe. Les **espaces sont personnalisables** (nom, couleur, image). La capture éclair reste le chemin le plus court, mais ce n'est plus le seul. |

> **Note sur D8.** Ce qui a été bâti *avant* d'ajouter l'éditeur : la **persistance locale**.
> Un post avec image, ou une mind map, posé sur un état en mémoire, disparaît au rechargement —
> et rien n'est alors testable. L'ordre n'est pas une préférence, c'est une contrainte.

## 9. Reste à trancher

1. **Tes espaces de départ** — quels sont les 3 ou 4 vrais contenants de ta vie créative ?
   *(Le Bouquin · La Chaîne · Perso · Veille ?)* Nécessaire au jalon 6, pas avant.
2. **Le ton d'Atlas** — tutoiement ou vouvoiement, sobre ou complice.
   Sans voix (D4), son écriture *est* sa personnalité. À trancher avant la V1.
