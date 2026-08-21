# Le site d'Atlas

Quatre pages statiques, trois feuilles de style, trois scripts. Aucune dépendance, aucune
compilation : on ouvre un `.html` dans un navigateur et ça marche.

```
site/
  index.html      Accueil
  produit.html    Produit
  tarifs.html     Prix
  infos.html      Infos
  atlas.css       La DA, reprise des jetons de l'app (src/styles/tokens.css)
  atlas.js        Thème, couleur d'accent, l'œil, le menu, l'apparition au défilement
  maquettes.css   Les écrans d'Atlas — leur matière et leur unité de dessin
  maquettes.js    Les écrans d'Atlas — leur contenu
  essai.css       Le bac à sable et les six formes essayables — leur allure
  essai.js        Le bac à sable et les six formes essayables — leur mécanique
  polices/        Inter variable, latin — 48 Ko, servis depuis le projet
  images/         Les icônes du projet, copiées de public/
```

L'ordre de chargement compte : `maquettes.js` **avant** `atlas.js` (c'est lui qui dessine les
yeux d'Atlas, y compris ceux posés dans les maquettes), et `essai.js` **après** les deux
(il réemploie les morceaux exposés dans `window.MQ`).

## Lancer

```bash
npx serve site -l 3872
```

Ou par le `launch.json` du projet, configuration **`atlas-site`** (port **3872**).

## La direction artistique

`atlas.css` recopie les jetons de `src/styles/tokens.css` : mêmes couleurs, même verre,
mêmes rayons, même trame, mêmes halos. Trois points à ne pas casser :

1. **L'accent vit en canaux HSL** (`--accent-h/s/l`). Tout le reste en découle par calcul :
   halos du fond, trame, iris de l'œil, texte accentué. Le sélecteur de couleur des pages
   d'accueil et produit est la démonstration de ce mécanisme.
2. **En mode clair, l'accent brut ne sert jamais au texte.** On emploie `--accent-text`,
   qui en est une version assombrie.
3. **On n'anime que `transform` et `opacity`**, et « Réduire les animations » du système
   fait foi.

L'œil (`atlas.js`, section 2) est un portage de `src/ui/OeilAtlas.tsx` : le dessin est
engendré par le même calcul. S'il change dans l'app, c'est là qu'il faut le reporter.

## Le vocabulaire de mise en page

La page n'est pas une suite de grilles de cartes identiques. Six blocs, à alterner :

| Classe | Ce que c'est | Quand s'en servir |
|---|---|---|
| `.index` | Le numéro de section, en chiffres de machine, suivi d'un filet | En tête de chaque section |
| `.etapes` / `.etape` | Un grand chiffre dans la marge, un titre, un texte | Pour une suite ordonnée de 3 ou 4 idées |
| `.mosaique` | Une grille de 6 colonnes où les blocs prennent 2, 3 ou 6 parts | Quand les blocs n'ont pas la même importance |
| `.bande` | Un panneau sombre en pleine largeur, une fois par page | Pour casser la valeur uniforme de la page |
| `.points` | Une liste à filets avec une clé courte à gauche | Pour détailler sans fabriquer six cartes |
| `.cite` | Une phrase seule, en serif italique | Comme respiration entre deux sections denses |

Trois règles derrière ce vocabulaire :

- **Le cadre se mérite.** `.bloc--nu` (un simple filet haut) est le défaut ; `.bloc.glass`
  ne sert qu'à ce qui doit être isolé.
- **Les respirations sont inégales** : `.section`, `.section--serree`, `.section--ample`.
  Une page dont toutes les sections ont le même souffle se lit comme un tableur.
- **Le serif n'apparaît qu'en `.inflexion`**, sur un mot ou deux dans un titre. Jamais un
  paragraphe entier.

## Les écrans montrés

**Il n'y a aucune capture d'écran en PNG.** Les douze écrans d'Atlas sont **redessinés en
HTML** dans `maquettes.js`, avec les jetons de l'app. Trois raisons, et ce ne sont pas des
raisons de confort :

- c'est net à n'importe quelle résolution, et ça ne pèse rien ;
- ça suit le thème du visiteur **et la couleur qu'il vient de choisir** : l'accent qu'il
  essaie dans le sélecteur se retrouve dans les écrans montrés, halos compris ;
- ça ne périme pas à chaque évolution de l'app, comme le ferait une image prise un mardi.

Une page ne porte donc qu'un conteneur vide :

```html
<div class="maq" data-maq="flux-bureau"></div>
```

Le script le remplit, puis l'annonce comme une **image** (`role="img"` + description) :
une maquette ne réagit à rien, et un lecteur d'écran ne doit pas énumérer ses quarante
bribes de texte.

| `data-maq` | Ce qu'il montre |
|---|---|
| `flux-bureau` | L'atelier : rail, liste des idées, note ouverte |
| `flux-tablette` | Le duo : liste et note côte à côte |
| `capture-mobile` | La capture sur téléphone, curseur qui clignote |
| `flux-balayage` | Une ligne balayée, l'action « Classer » dessous |
| `espaces` | Les projets, chacun avec sa teinte |
| `forme-fiche` · `forme-carte` · `forme-dessin` · `forme-planche` · `forme-table` · `forme-frise` | Les six formes d'une note |
| `reglages` | Thème, couleur et matière |

### L'unité de dessin

Chaque maquette est dessinée dans un repère en **pixels de plan**, puis l'ensemble se met à
l'échelle de la place disponible. `--k` vaut un pixel de plan : la largeur du conteneur
divisée par la largeur de référence du dessin (`--mq-w`). Toutes les dimensions s'écrivent
donc `calc(N * var(--k))`, où N est la valeur qu'aurait l'app.

C'est plus bavard qu'un `px`, et c'est le prix d'un dessin qui garde exactement ses
proportions du téléphone au grand écran.

### Pour en ajouter une

Une entrée dans `MAQUETTES` (`maquettes.js`) avec son `alt` et sa fonction `html()`, et un
`data-maq` dans la page. Les morceaux communs — le rail, une ligne du flux, la barre
d'onglets d'une note — sont déjà des fonctions : `rail()`, `ligne()`, `barreNote()`,
`note()`.

Deux règles à tenir :

- **du vrai contenu de travail**, jamais de faux-texte latin. Du latin dans une maquette de
  produit dit au visiteur qu'on ne lui montre rien ;
- **aucune photo** : les images sont des aplats dégradés déduits de l'accent. Une fausse
  photo attire l'œil sur elle et détourne du sujet.

## Les deux valeurs à remplacer

- **L'adresse de l'app** — `https://atlas.vercel.app`, sur chaque page :
  ```bash
  sed -i 's|https://atlas.vercel.app|https://ADRESSE-REELLE|g' site/*.html
  ```
- **L'adresse de contact** — `bonjour@atlas.fr`, dans `infos.html` (section `#contact`).

## Les plans affichés

| | Bricoleur | Compagnon | Créatif |
|---|---|---|---|
| Prix | 0 € | 12,50 €/mois · 125 €/an | 24,99 €/mois, bientôt |
| Notes | 2 000 | 20 000 | illimité |
| Images | 20 Mo | 500 Mo | 5 Go |
| Définition | 1600 px | 1600 px | 3000 px |
| Atlas prend la parole | — | briefing, rapprochements, relances | + dictée transcrite, plan proposé |

Les chiffres sont repris de `docs/08-economie.md` : une note pèse ~500 octets, une image
~10 Ko une fois allégée. Ils se modifient à trois endroits de `tarifs.html` — les cartes,
le tableau, et le bloc « Les chiffres ».

## Mise en ligne

Le site est indépendant du déploiement de l'app : `vercel.json` bâtit l'app vers `dist/`,
et `site/` n'y entre pas. Deux possibilités :

- un second projet Vercel dont la racine est `site/`, sans commande de compilation ;
- ou n'importe quel hébergement de fichiers statiques.

Les liens internes s'écrivent `tarifs.html`. Les hébergeurs qui servent ce fichier à
l'adresse `/tarifs` sont gérés : `atlas.js` compare les noms de page sans leur extension
pour marquer l'onglet courant.

## Essayer Atlas depuis le site

Deux blocs vivants, dans `essai.js` :

- **`data-essai`** — le bac à sable, sur l'accueil. On écrit une idée, Entrée la garde,
  « Classer » la fait passer d'un projet à l'autre, « Archiver » la retire **et laisse un
  mot pour revenir en arrière**. C'est la démonstration de la promesse « rien ne se perd »,
  faite plutôt qu'écrite. Rien n'est envoyé, rien n'est gardé au rechargement, et le bloc
  le dit lui-même.
- **`data-formes`** — les six formes d'une note en onglets, sur la page produit. Elles
  réemploient les corps de `maquettes.js` : ce qu'on essaie et ce qu'on regarde ailleurs
  sont le même écran.

## Le mouvement

Trois règles, les mêmes que dans l'app : on n'anime que `transform` et `opacity`, rien ne
rebondit, et « Réduire les animations » du système coupe tout sans jamais masquer de
contenu.

| Où | Quoi |
|---|---|
| Sections | Apparition en cascade — 70 ms de décalage par bloc, plafonné à cinq |
| `.index` | Le filet se dessine de gauche à droite |
| `.etape` | Le grand chiffre s'éclaircit et se décale au survol |
| `.maq`, `.bloc`, `.plan` | Un soulèvement de deux ou trois pixels |
| L'œil de l'ouverture | Il flotte, sur onze secondes |
| `[data-compte]` | Le nombre monte une fois, quand il entre à l'écran |
| `.fil` | Une ligne de deux pixels sous l'en-tête, qui suit le défilement |
| Le bac à sable | L'idée gardée descend, l'idée archivée glisse et se referme |
