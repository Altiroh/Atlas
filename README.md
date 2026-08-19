# Atlas

Un second cerveau qui parle. La structure d'un Notion, l'usage d'un Jarvis.
Projet **personnel**, mono-utilisateur.

📄 **Le cadrage vit dans [`docs/`](docs/)** — à lire avant de toucher au code :

| Document | Contenu |
|---|---|
| [01-scope.md](docs/01-scope.md) | Le produit : les 3 moments d'usage, les non-objectifs, le phasage |
| [02-architecture-v0.md](docs/02-architecture-v0.md) | Les écrans, les 3 coquilles, le plan en 8 jalons |
| [03-organisation-et-DA.md](docs/03-organisation-et-DA.md) | Les 3 axes de classement, les 6 types de contenu, la direction artistique |

---

## Lancer

```bash
npm run dev --prefix Nopro/atlas
```

Ou par le `launch.json` racine, configuration **`atlas`** (port **3870**).

Pour tester la version de production (service worker, hors-ligne, installation) :

```bash
npm run build --prefix Nopro/atlas && npx vite preview --port 3871
```

(configuration `atlas-prod` du launch.json). Le service worker n'est actif qu'en production.

Le serveur écoute aussi sur le réseau local : depuis l'iPhone ou l'iPad connectés
au même Wi-Fi, ouvre l'adresse `Network:` affichée au démarrage
(de la forme `http://192.168.x.x:3870`).

---

## État : jalons 1, 2, 4 faits — jalon 3 (synchro) prêt, en attente du serveur

Les trois coquilles, la charte visuelle, **la persistance locale et l'éditeur de posts**.

**En place**
- **Persistance IndexedDB** — posts, espaces et images survivent au rechargement.
  Écriture différée (400 ms) pendant la frappe, donc pas de bouton « Enregistrer ».
- **Éditeur de post** — titre, corps qui s'étend tout seul, image de couverture, espace
  de rattachement, suppression.
- **Images** — importées, réduites à 1600 px et réencodées en WebP avant stockage
  (un PNG de 3,2 Mo tombe à ~10 Ko).
- **Espaces personnalisables** — créer, renommer, choisir la teinte, poser une image ;
  cliquer un espace filtre le flux. Supprimer un espace libère ses posts, ne les détruit pas.
- **Mind map** — un post s'ouvre en Texte ou en Carte. Nœuds déplaçables, ramification,
  renommage, panoramique, zoom molette et pincement, recentrage automatique. Souris et doigt
  passent par le même code (Pointer Events).
- **Balayage des lignes du flux** — vers la droite : Classer (choix d'espace) ; vers la gauche :
  Archiver. Balayage franc (>148 px) = action directe. Verrouillage d'axe, donc le défilement
  vertical reste natif ; le clic qui suit un balayage est absorbé.
- **Archives** — ce qui sort du flux n'est jamais supprimé : accès et restauration en bas de liste.
- **Installable (PWA)** — manifeste, icônes PNG générées par `node tools/icones.mjs`, raccourci
  « Capturer ». Sur iOS l'`apple-touch-icon` est indispensable, le manifeste ne suffit pas.
- **Démarrage hors ligne** — service worker : cache-first pour les ressources empreintées,
  réseau-puis-cache pour le document. **Vérifié serveur éteint** : l'app démarre.
- **Sauvegarde** — export `.zip` (markdown lisible + JSON fidèle + images d'origine),
  écrit sans aucune dépendance. Réglages → Sauvegarde.
- **Compte** — création, connexion, profil, déconnexion. La connexion **ne garde pas l'app** :
  Atlas s'utilise sans compte. Cloisonnement vérifié entre deux comptes du même appareil.
- **Moteur de synchronisation** — pierres tombales, file d'attente, fusion au plus récent,
  images incluses. Éprouvé contre un « nuage local » : restauration complète sur appareil neuf,
  suppressions qui ne ressuscitent pas, conflits arbitrés. Voir [docs/04](docs/04-synchronisation.md).
- **Typographie Inter** (variable, 48 Ko servis depuis le projet, aucun CDN).
- Les 3 coquilles (compacte / duo / atelier), choisies sur la **largeur de fenêtre**
  → les trois se testent en redimensionnant la fenêtre du Mac.
- **Rail de navigation fin (66 px)** — jamais une colonne pleine. Sur iPad : icône + libellé
  dessous. Sur Mac : icônes seules, le panneau se déploie au survol **par-dessus** le contenu,
  qui ne bouge donc pas. Sur iPhone : barre d'onglets en bas, icône + libellé dessous.
- Thème **clair / nuit / automatique à l'heure** (clair 8 h → 18 h), sans rechargement.
- **Accent changeable** (5 préréglages + roue de teinte), qui reteinte aussi le fond animé.
- Fond « aurora » animé, surfaces en verre, arrondi léger.
- Zones sûres iOS, pas de zoom au focus, pas de rebond parasite, pas de débordement
  horizontal jusqu'à 320 px.
- Capture fonctionnelle (⏎ enregistre, ⇧⏎ nouvelle ligne) + pastilles d'espaces.

**Pas encore**
- **Moodboard** — le prochain bloc (plusieurs images sur une planche).
- **Le vrai serveur** : le moteur attend une dorsale Supabase. Ce qu'il faut fournir est listé
  dans [docs/04 § 6](docs/04-synchronisation.md).
- Les données vivent **uniquement sur l'appareil** tant que le jalon 3 n'est pas fait.
- Le repère de coquille en bas à droite est un **outil de mise au point**, il disparaîtra
  à la validation des coquilles.

---

## Structure

```
src/
  styles/     reset · tokens (couleurs, verre, rayons) · app (mise en page)
  theme/      thème horaire + accent, appliqués au DOM en variables CSS
  layout/     useShell (le choix de la coquille) · Rail (navigation) · les 3 coquilles
  screens/    Capture · Flux · Espaces · Détail · Réglages
  store/      état applicatif (en mémoire au jalon 1)
  ui/         icônes, fond animé
```

## Deux règles à ne pas casser

1. **La coquille se décide sur la largeur, jamais sur l'appareil détecté.**
   C'est ce qui rend les trois mises en page testables sur un seul écran.
2. **On n'anime jamais un flou ni une grille** — seulement `transform` et `opacity`.
   C'est la condition pour que ça reste fluide sur iPhone.
