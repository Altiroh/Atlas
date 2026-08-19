# Atlas — Organisation du contenu & Direction artistique

> Suite de [02-architecture-v0.md](02-architecture-v0.md). Deux sujets : **comment on range**,
> et **à quoi ça ressemble**.

---

## PARTIE 1 — Comment on organise

### 1.1 Le problème posé

Tu ne captures pas *un* type de chose. Tu captures :
- des **idées de vidéos** (YouTube / réseaux),
- de la **matière de bouquin** (scènes, personnages, détails),
- des **concepts** à faire mûrir,
- des **mind maps** (un plan, une structure, un univers qui se ramifie),
- des **moodboards** (des images, une ambiance, une direction visuelle).

Un seul dossier plat ne peut pas tenir ça. Mais une usine à classement te fera fuir (D7).

### 1.2 La réponse : trois axes indépendants

Le piège classique, c'est de tout empiler dans une seule hiérarchie de dossiers.
On sépare au contraire **trois questions différentes**, chacune avec sa réponse :

| Axe | La question | Réponse | Obligatoire ? |
|---|---|---|---|
| **Espace** | *Ça sert quel projet ?* | Le Bouquin · La Chaîne · Perso… | non |
| **Type** | *C'est quelle nature d'objet ?* | Idée · Note · Mind map · Moodboard · Concept · Référence | oui, mais **déduit** |
| **Tag** | *Ça parle de quoi ?* | libre, autant qu'on veut | non |

**Pourquoi trois axes séparés :** une idée de vidéo *sur* un personnage du bouquin existe dans
les deux mondes. Avec des dossiers, il faut choisir — et tu choisis mal. Avec trois axes, elle est
dans l'espace *La Chaîne*, de type *Idée*, taguée *#Marc*. Elle ressort des deux côtés.

**Le Type n'est jamais demandé à la capture.** Tu écris du texte : c'est une *Idée*. Tu la
développes : elle devient une *Note*. Tu ajoutes des images : un *Moodboard*. Tu ajoutes des
branches : une *Mind map*. **Le type est une conséquence de ce que tu fais, pas une case à cocher.**
C'est ce qui protège le moment ⚡.

### 1.3 Les six types de contenu

| Type | Ce que c'est | Arrive en |
|---|---|---|
| **Idée** | Une capture brute. Quelques lignes. Le point de départ de tout. | **fait** |
| **Note** | Un document : titre, corps, image de couverture, espace. | **fait** |
| **Mind map** | Un canevas de nœuds reliés : plan de bouquin, univers, arborescence de sujets. | **fait** |
| **Moodboard** | Une planche : plusieurs images, couleurs, extraits, ambiance. | **suivant** |
| **Concept** | Une idée qu'on travaille : le pitch, les intentions, ce qu'elle deviendra. | après |
| **Référence** | Un lien externe conservé avec sa raison d'être. | après |

Le socle commun est en place : **un post = titre + corps + image + espace**, enregistré en base
locale. La mind map et le moodboard s'y branchent comme des *manières d'afficher et d'éditer* un
post, pas comme des objets à part — c'est ce qui évite de refaire la plomberie à chaque type.

**Tous partagent le même socle** : ils vivent dans un espace, sont cherchables, et naissent d'une
capture. C'est ce qui rend le modèle extensible sans le casser.

### 1.4 Ce que ça a donné dans le code

Le pari est tenu : la mind map n'a demandé **aucune** modification de la plomberie. Un post a
gagné un champ `carte`, et l'éditeur un sélecteur *Texte · Carte*. La persistance, la recherche,
le rattachement à un espace et la vignette du flux ont fonctionné pour elle sans être touchés.

Le moodboard suivra le même chemin : un champ de plus, une vue de plus, zéro réécriture.
**Prévoir la place coûte une heure ; refaire la structure plus tard coûte une semaine.**

---

## PARTIE 2 — Direction artistique

### 2.1 L'intention

> Épuré, frais, moderne. L'esprit Notion pour le calme, mais vivant.
> Une app dans laquelle **on se sent bien** — pas un outil, un lieu.

Trois partis pris :

**Le verre, pas le plat.** Les surfaces sont translucides et floutées, posées sur un fond qui
bouge lentement. C'est ce qui donne la profondeur et la fraîcheur, là où Notion est totalement plat.

**Le mouvement est ambiant, jamais démonstratif.** Le fond respire (des halos très lents), les
transitions sont courtes et douces. Rien ne rebondit, rien ne clignote.

**L'arrondi est léger.** 14 à 24 px. Assez pour adoucir, pas assez pour faire jouet.

### 2.2 Les thèmes

- **Light** — fond très clair légèrement bleuté, surfaces blanches translucides. Frais, aéré.
- **Night** — fond neutre profond, surfaces claires translucides. Feutré, pas noir charbon.
- **Par défaut : automatique à l'heure.** Light de **8 h à 18 h**, Night de **18 h à 8 h**.
  Bascule en douceur, sans rechargement. Réglable : Auto · Toujours clair · Toujours sombre.

### 2.3 La couleur d'accent

**Bleu clair (« Ciel ») par défaut**, et **entièrement changeable** — c'est un réglage, pas une
constante. Le jaune éclair, envisagé au départ, reste disponible en préréglage : à l'usage, le
bleu clair sert mieux le « épuré, frais » recherché, et il ne pose pas le problème de lisibilité
décrit ci-dessous.

Un point technique important, valable pour tout accent très lumineux (un jaune vif en particulier) :
posé sur fond clair, il est **illisible en texte**. La règle est donc stricte et tenue partout :

- l'accent sert aux **aplats, halos, indicateurs et états actifs** ;
- le texte **sur** l'accent est presque noir ;
- pour du **texte coloré** en mode clair, on utilise une version assombrie de l'accent, pas l'accent brut.

**L'accent teinte aussi le fond animé.** Changer la couleur ne change pas juste un bouton :
toute l'ambiance de l'app suit. C'est ce qui fait qu'elle « te ressemble ».

### 2.4 Contraintes de performance (iOS d'abord)

Le flou de verre est l'effet le plus coûteux du web. Trois règles pour que l'app reste fluide
sur iPhone :

1. **Peu de couches floutées à la fois** — le verre est réservé aux surfaces de navigation et
   aux cartes, pas à chaque élément.
2. **On n'anime jamais le flou lui-même** — seulement des déplacements et des opacités,
   que le téléphone traite sans effort.
3. **`Réduire les animations` du système est respecté** : le fond se fige, l'app reste utilisable.
