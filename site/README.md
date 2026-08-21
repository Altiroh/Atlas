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

La page n'est pas une suite de grilles de cartes identiques. Cinq blocs, à alterner :

| Classe | Ce que c'est | Quand s'en servir |
|---|---|---|
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
- **Pas de chapeau au-dessus des titres.** Ni petit libellé en capitales précédé d'un trait
  d'accent, ni numéro de section suivi d'un filet : c'est la décoration la plus reconnaissable
  des pages faites à la chaîne. **Une section commence par son titre.**

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

## Les appels à l'action

**Le site ne propose nulle part d'ouvrir l'app.** Tous les appels — l'en-tête, l'ouverture,
les plans, le pied de page — mènent au **bac à sable** de l'accueil (`index.html#essayer`).
C'est le seul endroit où Atlas se manifeste vraiment, et ça évite d'envoyer quelqu'un sur
une adresse qui n'existe pas encore.

Le jour où l'app sera en ligne, il y aura un seul endroit par page à rebrancher : l'appel de
l'en-tête, reconnaissable à sa classe `entete__cta`. Les autres appels peuvent rester sur le
bac à sable — essayer avant d'ouvrir un compte reste le meilleur chemin.

## L'adresse de contact

`bonjour@atlas.fr`, dans `infos.html` (section `#contact`) — à remplacer par la vraie boîte.

## Les plans affichés

| | Bricoleur | Compagnon | Créatif |
|---|---|---|---|
| Prix | 0 € | 12,50 €/mois · 125 €/an | 24,99 €/mois |
| Disponibilité | **maintenant** | bientôt | bientôt |
| Place | des années d'idées | dix fois plus | sans compter |
| Atlas regarde | — | briefing, rapprochements, relances | + mémoire d'espace, Emporter |
| Table de travail | — | plusieurs séances par semaine | sans se rationner |

### Le site ne publie aucun chiffre de capacité

**C'est délibéré, et c'est une règle à tenir.** Les quotas exacts, les poids unitaires et le
raisonnement de coût vivent dans [docs/09](../docs/09-ia-marche-et-cooperation.md) et
[docs/11](../docs/11-la-table-de-travail.md) — **pas sur le site.** Trois raisons :

1. **Ça renseigne la concurrence.** Publier « une note pèse 500 octets, une image 10 Ko, et
   le palier gratuit vaut exactement un usage intense » revient à donner sa structure de
   coûts et à laisser calculer ses marges.
2. **Ça engage sur des promesses non tenues.** Annoncer « 600 échanges par mois » pour une
   fonction qui n'existe pas encore fixe une attente au chiffre près.
3. **Un nombre précis appelle la vérification.** « Les 37 rangements » invite à demander
   les trente-sept.

Le site dit donc des **degrés** — « de quoi tenir des années », « dix fois plus », « sans
compter » — et laisse les paliers exacts à l'app, où ils sont vrais au moment où on les lit.

## Le cadrage de l'IA sur le site

Trois décisions à ne pas défaire sans relire [docs/11](../docs/11-la-table-de-travail.md)
et [docs/12](../docs/12-avec-ou-sans-ia.md) :

1. **Les deux plans payants portent « bientôt ».** L'IA n'existe pas encore. Présenter un
   plan payant comme disponible alors qu'il ne l'est pas serait la seule ligne malhonnête
   du site — et le gratuit, lui, est disponible et complet, ce qui se dit très bien.
2. **Le gratuit se vend par ce qu'il est**, pas par ce qui lui manque : « Atlas en entier,
   sans intelligence artificielle ». C'est un mode revendiqué.
3. **Atlas ne rédige pas.** La phrase sous les plans le dit en clair — *« Atlas ne fait pas
   le travail, il fait penser »* — et la page produit lui consacre sa huitième section, avec
   les deux regards côte à côte : l'œil ouvert et l'œil qui dort.

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
| `.etape` | Le grand chiffre s'éclaircit et se décale au survol |
| `.maq`, `.bloc`, `.plan` | Un soulèvement de deux ou trois pixels |
| L'œil de l'ouverture | Il flotte, sur onze secondes |
| `[data-compte]` | Le nombre monte une fois, quand il entre à l'écran |
| `.fil` | Une ligne de deux pixels sous l'en-tête, qui suit le défilement |
| Le bac à sable | L'idée gardée descend, l'idée archivée glisse et se referme |

## Le bandeau de pied

Le pied n'est pas une rangée de liens sur le fond de la page : c'est un **panneau opaque en
pleine largeur**, avec son halo teinté par l'accent, son grain, un cheveu de lumière sur
l'arête haute, et le mot « Atlas » en très grand qui sort par le bas. C'est lui qui ferme le
document.

Il est sombre dans les deux thèmes, mais **pas de la même valeur** : en thème clair il est à
, en thème nuit à . Reprendre la même valeur qu'en clair le rendrait
invisible sur un fond de page déjà noir — le pied redeviendrait alors ce qu'on vient de
corriger.

## Le responsive

Vérifié à **375 px** (téléphone) et **768 px** (tablette) sur les quatre pages : aucun
débordement horizontal, aucun texte sous 11,5 px, aucune cible tactile sous 44 px.

Quatre décisions structurent le petit écran :

**1. Les écrans montrés défilent au lieu de rétrécir.** Un dessin prévu pour 1 100 px
ramené à 335 met son texte à quatre pixels. Chaque maquette a donc une largeur plancher
proportionnelle à son propre dessin — `min-width: calc(var(--mq-w) * 0.8px)` — et c'est le
cadre qui défile en dessous. **La règle s'annule toute seule** quand il y a la place : sur
un grand écran le plancher est plus petit que la colonne, et rien ne change.

**2. Une colonne plutôt que deux étroites.** Sous 900 px, `.duo` et `.plans` passent en
colonne unique. Deux colonnes de 300 px, ce sont deux colonnes illisibles — et un
comparatif de prix en « deux et un » est plus mal rangé qu'une pile.

**3. Le pointeur décide, pas la largeur.** Les cibles à 44 px sont sous
`@media (hover: none), (max-width: 900px)` : une tablette large se touche aussi, et une
petite fenêtre de bureau se clique très bien.

**4. `min-width: 0` sur les enfants de grille.** C'est le piège qui coûte le plus cher à
trouver : un enfant de grille refuse par défaut d'être plus étroit que son contenu, donc
une maquette qui défile force **la colonne** à grandir et c'est la page entière qui
déborde. Le correctif est une ligne, le diagnostic une demi-heure.

Deux détails qui ne se voient qu'à l'usage : le champ du bac à sable reste à **17 px**
minimum, sous quoi iOS zoome à la mise au point et décale toute la page ; et
`.contenu` prend `max(clamp(…), env(safe-area-inset-*))` pour l'encoche en paysage.

## En ligne

**https://atlas-site-gamma.vercel.app**

Projet Vercel **`atlas-site`**, séparé de celui de l'app (`atlas`, sur
`atlas-kappa-flax.vercel.app`). Racine `site/`, **aucune compilation** — ce sont des
fichiers, il n'y a rien à bâtir.

```bash
cd site && npx vercel deploy --prod
```

`vercel.json` pose trois choses :

- **`cleanUrls`** — `/tarifs` sert `tarifs.html`. `atlas.js` compare les noms de page sans
  extension, donc l'onglet courant se marque quand même.
- **Le cache à deux vitesses.** Les polices et les icônes sont **immuables un an** : leur
  contenu ne change jamais sous le même nom. Les feuilles et les scripts, eux, changent
  sous le même nom — il n'y a pas d'empreinte dans les noms de fichiers — donc ils sont
  **revalidés à chaque visite**. Sans ça, une correction mettrait une semaine à arriver
  chez quelqu'un qui a déjà visité.
- **Les en-têtes de sécurité**, repris de ceux de l'app.

> ⚠️ **Vercel refuse les clés de commentaire `//` dans `vercel.json`.** Le schéma est
> strict : toute propriété inconnue fait échouer le déploiement avec
> *« Schema verification failed »*. Les explications vivent donc ici, pas dans le fichier.

Le renommage du projet se fait depuis le tableau de bord Vercel ; l'adresse
`atlas-site-gamma.vercel.app` suivrait.

## Le rythme vertical

Les marges de section **s'additionnent** : deux sections voisines apportent chacune la
leur. Avec `padding-block: clamp(64px, 10vw, 132px)` de part et d'autre, ça faisait
**264 px de vide entre deux phrases** — mesuré, pas supposé : 166 à 323 px selon les
voisines.

> **Les valeurs de `padding-block` sont la moitié de ce qu'on veut voir entre deux
> sections, jamais le total.**

| | Avant | Après |
|---|---|---|
| `.section` | 132 px | **64 px** |
| `.section--serree` | 64 px | **40 px** |
| `.section--ample` | 180 px | **88 px en haut, 64 en bas** |
| `.bande` | 120 px | **80 px** |
| `.section__tete + *` | 60 px | **44 px** |
| `.duo + .duo` | 110 px | **72 px** |
| **Vide réel entre sections** | 166–323 px | **86–163 px** |

Trois trous se cachaient ailleurs :

- **Les cartes de prix étirées.** `align-items: stretch` alignait leurs bas, donc la plus
  courte laissait **162 px de vide** sous sa dernière ligne. En `start`, chacune prend sa
  hauteur — et l'alignement qu'on croyait perdre était déjà là, les prix étant en haut.
  Il ne manquait qu'un `min-height` sur `.plan__promesse`, parce que les promesses n'ont
  pas toutes le même nombre de lignes.
- **Une marge inline oubliée** sur la bande du comparatif, qui s'ajoutait à son propre
  `padding` : 205 px à elle seule.
- **Le pied sur téléphone** — quatre colonnes de liens qui s'empilaient une par une, faute
  de pouvoir en loger deux : 170 px de largeur minimale et 28 px de gouttière ne tiennent
  pas dans 350. À 165 et 20, elles tiennent. **1 482 px → 1 024 px.**

Au total, l'accueil passe de **8 194 à 7 036 px** sans qu'une ligne de contenu disparaisse.

## L'affichage sur téléphone

### Les écrans se remettent en page, ils ne se tranchent pas

Un écran dessiné pour 1 100 px montré dans 348 laissait voir **40 % de lui-même**, coupé au
milieu d'un volet. On ne lit pas « panoramique », on lit « cassé ».

Les maquettes étant du HTML, elles **se remettent en page comme l'app le fait elle-même** —
et la remise en page est honnête : sur un téléphone, Atlas montre bel et bien une colonne.

| Écran | Sur téléphone |
|---|---|
| `mq--atelier` | Le rail et le volet de détail disparaissent : il reste la colonne des idées |
| `mq--espaces` | Le rail disparaît, les projets passent sur deux colonnes |
| `mq--note` | La barre d'onglets disparaît — les six formes sont déjà en boutons au-dessus |
| `flux-tablette` | **Masqué.** Son propos est d'avoir deux volets côte à côte ; coupé en deux, il ne démontre rien |

Résultat : **les cinq écrans de la page produit sont visibles à 100 %.**

> ⚠️ **Deux pièges d'ordre, tous deux silencieux :**
>
> 1. **Un style inline bat une classe.** Tant que `--mq-w` était posé dans l'attribut
>    `style`, aucune requête média ne pouvait le surcharger. Les tailles des écrans qui se
>    remettent en page vivent donc **dans la feuille**.
> 2. **Une déclaration ajoutée en fin de fichier passe après la requête média qui la
>    surcharge.** Les tailles de base doivent être écrites **avant** les blocs `@media`.

Ce qui dépasse encore reçoit un mot — `↔ fais glisser` — posé par le script **seulement si
la coupe dépasse 12 %**, et effacé au premier glissement.

### L'en-tête

Trois places fixes plutôt qu'une rangée qui se pousse : **le réglage du thème à gauche,
Atlas au centre, le menu à droite**. `display: contents` sur `.entete__outils` fait remonter
le sélecteur et le bouton dans la grille du parent — sans quoi ils resteraient solidaires
dans une seule cellule, à droite.

Le panneau du menu était en `--surface-strong` : du blanc à 80 % posé sur le fond animé,
donc **gris et sale**. Il prend maintenant le fond de la page, franchement opaque, et ses
liens l'encre pleine plutôt que le gris de service.

### Les conteneurs centrés

En une colonne, un bloc à largeur plafonnée reste **collé à gauche** s'il n'a pas de marge
automatique — c'est ce qui donnait l'impression d'un conteneur mal posé. `.maq--tel`,
`.reglage` et les onglets des formes reçoivent `margin-inline: auto` sous 900 px.
