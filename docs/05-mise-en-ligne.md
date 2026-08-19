# Atlas — Mettre en ligne

Deux chemins, selon ce que tu veux tester. Le premier prend deux minutes mais ne montre pas tout ;
le second est la vraie mise en ligne.

---

## A. Tout de suite, sur le réseau local

Le serveur de développement écoute déjà sur le Wi-Fi. Depuis l'iPhone, **connecté au même réseau
que le Mac/PC**, ouvre l'adresse `Network:` affichée au démarrage — de la forme :

```
http://192.168.x.x:3870
```

**Ce que tu verras :** toute l'interface, les trois coquilles, le compte, la synchro locale.

**Ce que tu ne verras PAS, et c'est important :**

| | Pourquoi |
|---|---|
| ❌ Le démarrage **hors ligne** | Le service worker exige une connexion sécurisée (HTTPS). En `http://` il refuse de s'installer. |
| ❌ L'app **installée** qui marche vraiment | « Ajouter à l'écran d'accueil » fonctionnera, mais sans le service worker l'icône ouvrira une page morte dès que le serveur s'arrête. |
| ❌ L'usage **ailleurs que chez toi** | L'adresse n'existe que sur ton Wi-Fi. |

C'est bon pour juger le rendu, les gestes, les couleurs, le mouvement des formes. Pas pour juger
Atlas comme une app.

---

## B. La vraie mise en ligne

Il faut un hébergeur : HTTPS, une adresse permanente, et l'app disponible partout. Les trois
options ci-dessous sont gratuites pour cet usage et servent des fichiers statiques — Atlas n'a
besoin de rien d'autre.

Le projet est déjà configuré pour les trois (`vercel.json`, `public/_headers`).

### Vercel — le plus court

```bash
npm run build --prefix Nopro/atlas
npx vercel --cwd Nopro/atlas --prod
```

La première fois, la commande ouvre le navigateur pour créer/associer ton compte, puis pose trois
questions (nom du projet, dossier). Elle rend une adresse en `.vercel.app`.

### Cloudflare Pages

```bash
npm run build --prefix Nopro/atlas
npx wrangler pages deploy Nopro/atlas/dist --project-name atlas
```

### Netlify

```bash
npm run build --prefix Nopro/atlas
npx netlify deploy --dir Nopro/atlas/dist --prod
```

> Je ne peux pas créer le compte à ta place — c'est la seule étape qui te revient. Une fois qu'il
> existe, redéployer tient en une commande.

---

## Ensuite, sur l'iPhone

1. Ouvre l'adresse dans **Safari** (pas Chrome : sur iOS, seul Safari sait installer une app).
2. Bouton **Partager** → **Sur l'écran d'accueil**.
3. Lance Atlas depuis l'icône : plein écran, sans barre de navigateur, et il démarre même sans réseau.

Pour le raccourci de capture (D5) : app **Raccourcis** → nouveau raccourci → *Ouvrir l'URL* avec
`https://…/?vue=capture` → puis **Réglages → Accessibilité → Toucher → Toucher au dos** pour le
déclencher en tapant deux fois au dos du téléphone.

---

## Ce qu'il faut savoir avant de s'en servir pour de vrai

**Les données restent sur l'appareil.** Tant que la dorsale Supabase n'est pas branchée
([docs/04](04-synchronisation.md)), chaque appareil a son propre contenu — le compte et la
synchro tournent contre un « nuage local » qui ne quitte pas le navigateur.

Donc : **n'écris pas trois chapitres sur le téléphone en croyant les retrouver sur le Mac.**
Pour le moment, c'est un banc d'essai, pas encore ton second cerveau.
