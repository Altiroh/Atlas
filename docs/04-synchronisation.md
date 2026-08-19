# Atlas — Synchronisation (jalon 3)

> Suite de [02-architecture-v0.md](02-architecture-v0.md). Le moteur est **écrit et éprouvé** ;
> il attend un serveur.

---

## 1. Le principe

**L'appareil reste la source de vérité de l'affichage.** L'écran lit toujours la base locale :
l'app est instantanée et fonctionne en mode avion. La synchronisation tourne derrière et rattrape.

Un tour de synchro, dans cet ordre — **et l'ordre est le cœur du sujet** :

| # | Étape | Pourquoi ici |
|---|---|---|
| 1 | **Tirer** ce qui a changé sur le serveur | avant de pousser, sinon on écrase une modification distante qu'on n'avait pas vue |
| 2 | **Fusionner** — le plus récent gagne, enregistrement par enregistrement | |
| 3 | **Rapatrier** les images désormais référencées mais absentes | |
| 4 | **Envoyer** les images des enregistrements modifiés ici | avant les enregistrements : jamais de post pointant vers une image absente |
| 5 | **Pousser** ces enregistrements | |
| 6 | **Marquer propre** | en dernier : un envoi interrompu est simplement rejoué |

Déclencheurs : au démarrage, au retour du réseau, au retour d'arrière-plan, 4 s après la dernière
frappe, et toutes les 90 s.

---

## 2. Les deux champs qui rendent tout ça possible

**`supprime` — la pierre tombale.** Une suppression ne retire pas l'enregistrement : elle le vide
et le marque. Sans ça, l'appareil A efface une note, l'appareil B ne l'apprend jamais et la
**ressuscite** au prochain envoi. Les tombes sont purgées après 90 jours.

**`sale` — la file d'attente.** L'enregistrement a changé depuis le dernier envoi réussi. On ne se
fie pas aux horloges pour savoir quoi envoyer : on le sait.

Les tombes ne restent pas dans `posts` / `espaces` — elles vivent dans `tombes`, que seule la
synchro lit. Toute l'interface continue donc de les ignorer.

---

## 3. Trois pièges rencontrés, et leurs parades

Ils ont tous été trouvés en testant la restauration sur un « appareil neuf ». Ils ne doivent pas
être réintroduits.

**1. L'hydratation réentrante.** Deux hydratations concurrentes se marchent dessus : la seconde
réécrit l'état que la synchro venait d'appliquer et ressuscite le contenu supprimé.
→ `hydrater()` rend toujours **la même promesse**.

**2. L'amorçage sur un appareil raccroché.** Le contenu de démonstration ne doit être planté qu'au
tout premier usage. Sur un appareil neuf branché à un compte existant, il inventerait des posts
fantômes… qui partiraient aussitôt dans le vrai nuage.
→ **on n'amorce pas quand un serveur est configuré.**

**3. Le serveur trop poli.** Un client ayant raté un tour peut pousser une version périmée et
écraser une suppression.
→ **le serveur refuse toute écriture plus ancienne que celle qu'il détient.** C'est sa seule
règle, et elle est indispensable.

---

## 3 bis. Le compte

**La connexion ne garde pas l'app.** Atlas s'ouvre et s'utilise sans compte, hors ligne, sans
écran d'accueil — le moment ⚡ l'exige. Créer un compte est un **réglage**, pas un péage : ça sert
à retrouver ses idées sur les autres appareils, et à ne plus rien exporter à la main.

Parcours : créer un compte (prénom, e-mail, mot de passe ≥ 8 caractères) · se connecter ·
renommer son profil · se déconnecter.

Trois règles de sécurité des données, toutes vérifiées :

| Situation | Ce qui se passe | Pourquoi |
|---|---|---|
| **Première connexion** sur un appareil déjà utilisé | le contenu local **rejoint le compte** | sinon les idées déjà prises resteraient invisibles des autres appareils |
| **Déconnexion** | le contenu local **reste** | se déconnecter n'est pas renoncer à ses notes |
| **Autre compte** sur le même appareil | le local est **effacé avant tout envoi** | sinon les idées du compte précédent partiraient dans le nuage du suivant |

La déconnexion tente d'abord d'envoyer ce qui est en attente ; si le réseau manque, elle prévient
et demande confirmation plutôt que de partir en silence.

⚠️ **Le compte local (`AuthLocale`) n'est pas de la sécurité.** Le mot de passe est salé et haché
pour ne pas traîner en clair, mais tout vit dans le navigateur : quiconque y a accès peut tout
lire. C'est une maquette fonctionnelle du parcours, destinée à l'éprouver sans serveur. La vraie
protection viendra de Supabase, dont c'est le métier.

---

## 4. Ce qui a été vérifié

Contre le « nuage local » (une seconde base du navigateur, qui joue le rôle du serveur) :

- ✅ envoi initial : 8 posts, 5 espaces, 1 image déposés ;
- ✅ **appareil neuf** : base locale vidée, horloge remise à zéro → tout revient, images comprises ;
- ✅ **suppression** : devient une pierre tombale ici et sur le serveur, contenu vidé, identifiant conservé ;
- ✅ **pas de résurrection** : après restauration complète, le post supprimé ne revient pas ;
- ✅ **conflit** : une version distante plus récente l'emporte sur la version locale ;
- ✅ une version distante **plus ancienne** n'écrase jamais le local.

Et pour le compte :

- ✅ création avec refus d'un mot de passe trop court, et d'une adresse déjà prise ;
- ✅ mot de passe faux → message **identique** que l'adresse existe ou non ;
- ✅ première connexion : les 8 posts et l'image déjà présents rejoignent le compte ;
- ✅ déconnexion : le contenu reste sur l'appareil, la synchro s'arrête ;
- ✅ **cloisonnement** : un second compte trouve un espace vide et ne voit rien du premier ;
- ✅ retour sur le premier compte : tout revient, images comprises.

---

## 5. Limite assumée

La fusion se fait **au dernier écrivain**, sur des horloges d'appareils. Deux appareils modifiant
le *même* post à la *même* minute, hors ligne, peuvent perdre l'une des deux versions.

Pour un utilisateur unique qui n'écrit qu'à un endroit à la fois, c'est suffisant — et ça évite
une machinerie de fusion sans commune mesure avec le besoin. Si ça devenait un vrai problème, le
correctif serait de fusionner **champ par champ** plutôt qu'enregistrement par enregistrement.

---

## 6. Brancher un vrai serveur

Tout passe par une interface de quatre méthodes (`src/store/dorsale.ts`) :

```ts
tirer(depuis)            // ce qui a changé après `depuis`, + l'horloge du serveur
pousser(lot)             // entreposer, en refusant les versions périmées
envoyerImage(id, blob)
recupererImage(id)
```

Rien d'autre. Tout le difficile est côté client.

### Le schéma à créer (Supabase / PostgreSQL)

```sql
create table espaces (
  id          text primary key,
  nom         text not null default '',
  hue         int  not null default 200,
  image_id    text,
  ordre       int  not null default 0,
  updated_at  bigint not null,
  supprime    boolean not null default false,
  proprietaire uuid not null default auth.uid()
);

create table posts (
  id          text primary key,
  titre       text not null default '',
  texte       text not null default '',
  espace_id   text,
  cover_id    text,
  carte       jsonb,
  etat        text not null default 'libre',
  created_at  bigint not null,
  updated_at  bigint not null,
  supprime    boolean not null default false,
  proprietaire uuid not null default auth.uid()
);

create index on posts (updated_at);
create index on espaces (updated_at);

-- Chacun ne voit que ses propres lignes.
alter table posts   enable row level security;
alter table espaces enable row level security;
create policy "les miennes" on posts   for all using (proprietaire = auth.uid());
create policy "les miens"   on espaces for all using (proprietaire = auth.uid());

-- LA règle du § 3.3 : on refuse d'écraser par une version plus ancienne.
create or replace function refuser_perime() returns trigger as $$
begin
  if old.updated_at > new.updated_at then return old; end if;
  return new;
end $$ language plpgsql;

create trigger posts_perime   before update on posts   for each row execute function refuser_perime();
create trigger espaces_perime before update on espaces for each row execute function refuser_perime();
```

Plus un **bucket de stockage privé** `images` pour les fichiers.

### Ce qu'il me faut de toi

1. L'**URL du projet** Supabase et la **clé anonyme** (`anon`, publique — jamais la clé `service_role`).
2. Le schéma ci-dessus exécuté dans l'éditeur SQL.
3. Le bucket `images` créé, en privé.
4. Dans *Authentication*, activer **e-mail + mot de passe** — et dire si tu veux la
   **confirmation par e-mail** à l'inscription (l'écran la gère déjà : il affiche
   « vérifie ta boîte » au lieu d'ouvrir la session).

5. Les deux valeurs dans un `.env.local` à la racine du projet (modèle : `.env.example`) :

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   Et **les mêmes dans Vercel** → Settings → Environment Variables, sinon la version en ligne
   continuera de tourner sur la maquette locale.

### Ce qui est déjà écrit et n'attend que ces valeurs

`AuthSupabase` (`src/store/auth-supabase.ts`) et `DorsaleSupabase` (`src/store/dorsale-supabase.ts`)
sont **écrits**. La bascule est automatique : dès que les deux variables existent, Atlas les
utilise ; sinon il retombe sur le compte et le nuage de test. **Aucun écran ne change** — c'est
précisément ce que les deux maquettes locales servaient à prouver.

Ils sont **chargés à la demande**. Sans serveur configuré, la bibliothèque Supabase — 56 Ko
compressés, soit presque autant que toute l'app — n'est jamais téléchargée.

Deux points de conception qui ne s'improvisent pas, déjà traités :

- **`proprietaire` n'est jamais envoyé** : la colonne se remplit elle-même avec `auth.uid()`.
  L'envoyer depuis le client serait au mieux inutile, au pire une faille.
- **L'horloge rendue n'est jamais inférieure au plus grand `updated_at` reçu.** Si l'appareil qui a
  écrit avait une horloge en avance, se fier à la nôtre ferait sauter ses lignes au tour suivant —
  elles seraient perdues en silence.

⚠️ **Ces deux adaptateurs n'ont pas pu être testés** : sans projet Supabase, il n'y a rien à
interroger. Le jour où les clés arrivent, prévoir une passe de vérification complète — création de
compte, connexion, envoi, appareil neuf, suppression, image.
