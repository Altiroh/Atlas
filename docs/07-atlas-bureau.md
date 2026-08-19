# Atlas — Le virage bureau

> Révision de cap. Atlas devient **un assistant d'ordinateur**. Ce document dit ce que ça change,
> ce que ça coûte, et ce que ça débloque.

---

## 1. Ce que « assistant d'ordinateur » veut dire

Une app de notes qu'on ouvre, c'est une destination. **Un assistant, c'est une présence** : il est
là avant qu'on le cherche, il répond à un raccourci, il voit ce qui se passe sur la machine.

Concrètement, ce qui sépare les deux :

| | App | Assistant |
|---|---|---|
| On y va | on l'ouvre | **il apparaît** |
| Déclencheur | une icône | **un raccourci clavier global** |
| Présence | une fenêtre | **la barre de menus, toujours là** |
| Contexte | ce qu'on y tape | **le presse-papier, la fenêtre active, les captures d'écran** |
| Démarrage | quand on y pense | **au démarrage de la machine** |

C'est cette colonne de droite qui fait Atlas. Et **aucune de ces cinq lignes n'est possible dans
un navigateur.**

---

## 2. La conséquence, dite franchement

**Le virage bureau impose la coque native.** Ce n'était qu'une porte de sortie (D6) ; ça devient
le chemin.

Un site web, même installé, ne peut pas :

- capter un raccourci **quand il n'a pas le focus** — c'est la définition même d'un raccourci global ;
- vivre dans la **barre de menus** ;
- **démarrer avec la machine** ;
- lire le **presse-papier** sans un geste de collage explicite ;
- savoir qu'une **capture d'écran** vient d'être prise ([docs/06 § 1](06-idees.md)).

> C'était le premier argument pour le natif. En voilà quatre autres. **La décision est prise.**

**Ce qui ne change pas, et c'est l'essentiel :** tout le travail fait tient. L'interface, la base
locale, la synchronisation, le compte, les coquilles — c'est du web, et une coque native exécute
du web. On n'emballe pas une app *à refaire* : on emballe **celle qui existe**.

**Ce qui reste vrai aussi :** la version web continue de tourner. Sur l'iPhone et l'iPad, c'est
elle. Le bureau gagne une coque ; le reste ne bouge pas.

---

## 3. La nouvelle hiérarchie des moments

Le cadrage initial ([docs/01 § 4](01-scope.md)) plaçait les trois moments à égalité. Ce n'est plus
vrai — le bureau passe devant.

| | Avant | Maintenant |
|---|---|---|
| 🔨 **L'atelier** (Mac) | un des trois | **le centre de gravité** |
| ⚡ **L'éclair** (iPhone) | le premier servi | reste, mais l'éclair se déplace : il se déclenche **au clavier**, sur le Mac |
| 🌊 **La rumination** (iPad) | un des trois | inchangé |

**L'éclair devient un raccourci clavier.** C'est le même besoin — capturer avant que l'idée
s'évapore — mais sur le Mac, l'idée arrive pendant qu'on fait autre chose. Ouvrir une app est déjà
trop long. Le geste devient : `⌥Espace`, on tape, `⏎`, la fenêtre disparaît. Sans jamais quitter
ce qu'on était en train de faire.

---

## 4. Ce que l'assistant sait faire — par vagues

**Vague 1 — la présence.** C'est elle qui transforme l'app en assistant, et rien d'autre.

- Raccourci global → une **fenêtre de capture** qui surgit par-dessus tout, et disparaît.
- Icône dans la **barre de menus** : capture, recherche, dernières idées.
- Démarrage avec la machine, sans fenêtre.

**Vague 2 — le contexte.** Atlas voit ce qui l'entoure.

- **Capture d'écran détectée** → « je la range où ? » (l'idée d'origine, enfin possible).
- **Presse-papier** : coller devient un geste de première classe ; un lien copié se range avec son titre.
- La **fenêtre active** au moment de la capture devient un indice de classement.

**Vague 3 — la conversation.** C'est là qu'Atlas devient le Jarvis du cadrage (D1).

- Une **barre de commande** au clavier : chercher, créer, demander.
- Dictée, puis voix.
- Les briefings et les relances, qui ont enfin un endroit où apparaître : une notification système.

---

## 5. La décision technique à prendre

Deux façons d'emballer une app web en app de bureau :

| | **Tauri** | **Electron** |
|---|---|---|
| Poids | ~10 Mo | ~150 Mo |
| Mémoire | celle du navigateur système | un Chromium complet |
| Moteur de rendu | **WebKit sur Mac** — le même que Safari | Chromium partout |
| Raccourci global, barre de menus, presse-papier | ✅ | ✅ |
| Langage de la coque | Rust | Node |

**Je recommande Tauri**, pour une raison qui compte ici plus qu'ailleurs : il utilise **WebKit sur
Mac**, donc le même moteur que l'iPhone et l'iPad. Une seule interface à vérifier au lieu de deux.
Avec Electron, le Mac serait le seul appareil à rendre du Chromium — et les écarts se paieraient
en surprises.

Le coût honnête : la coque se code en Rust. Peu de code — quelques dizaines de lignes pour le
raccourci, la fenêtre et la barre de menus — mais c'est un langage de plus dans le projet.

---

## 6. Ce que ça ne doit pas devenir

Le virage bureau ne rend pas caduc le § 8 de [docs/01](01-scope.md). Atlas reste :

- ❌ pas collaboratif ;
- ❌ pas un gestionnaire de projet ;
- ❌ pas un clone de Notion.

Et une règle nouvelle, propre à l'assistant : **il ne s'impose pas.** Une fenêtre qui surgit
sans qu'on l'appelle, une notification de trop, et on désinstalle. La présence est une invitation,
jamais une interruption — c'est le garde-fou de D1, appliqué au bureau.
