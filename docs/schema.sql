-- ═══════════════════════════════════════════════════════════════
-- Atlas — schéma Supabase
--
-- À coller d'un bloc dans l'éditeur SQL du projet, puis exécuter.
-- Le script est REJOUABLE : on peut le relancer sans rien casser.
--
-- Ordre : les tables, la sécurité au niveau des lignes, la règle
-- anti-écrasement, puis le stockage des images.
-- ═══════════════════════════════════════════════════════════════


-- ─── 1. Les tables ─────────────────────────────────────────────
--
-- Les dates sont des `bigint` (millisecondes), pas des `timestamp` :
-- c'est le client qui les produit, et la comparaison doit être
-- exactement celle qu'il fait de son côté.
--
-- `proprietaire` se remplit tout seul avec l'identifiant de qui
-- écrit. Le client ne l'envoie jamais — ce serait au mieux inutile,
-- au pire une faille.

create table if not exists espaces (
  id           text primary key,
  nom          text    not null default '',
  hue          int     not null default 200,
  image_id     text,
  ordre        int     not null default 0,
  updated_at   bigint  not null,
  supprime     boolean not null default false,
  proprietaire uuid    not null default auth.uid() references auth.users (id) on delete cascade
);

create table if not exists posts (
  id           text primary key,
  titre        text    not null default '',
  texte        text    not null default '',
  blocs        jsonb,          -- le contenu réel : la suite de blocs
  espace_id    text,
  cover_id     text,
  carte        jsonb,          -- les nœuds de la mind map
  dessin       jsonb,          -- les traits du croquis
  papier       text,           -- uni | points | grille | lignes
  etat         text    not null default 'libre',   -- libre | classee | archivee
  created_at   bigint  not null,
  updated_at   bigint  not null,
  supprime     boolean not null default false,     -- la pierre tombale
  proprietaire uuid    not null default auth.uid() references auth.users (id) on delete cascade
);

-- `create table if not exists` ne touche pas à une table déjà là :
-- pour qui a passé le script avant les blocs, c'est CETTE ligne qui
-- ajoute la colonne. Elle ne coûte rien si elle existe déjà.
alter table posts add column if not exists blocs jsonb;

-- Les FORMES d'une note : fiches, cartes et dessins en nombre libre,
-- chacune nommée. Elles remplacent `blocs` / `carte` / `dessin`, qui
-- restent en place — ils servent à reconstruire les formes d'une note
-- écrite avant elles, à sa première ouverture, et une seule fois.
alter table posts add column if not exists formes jsonb;

-- `texte` reste rempli, en projection de `blocs` : c'est lui que lit
-- la recherche. Le client s'en charge, le serveur ne calcule rien.

-- La synchro ne demande QUE ce qui a changé depuis un instant donné :
-- sans ces index, chaque tour relirait toute la table.
create index if not exists posts_maj   on posts   (proprietaire, updated_at);
create index if not exists espaces_maj on espaces (proprietaire, updated_at);


-- ─── 2. Chacun chez soi ────────────────────────────────────────
--
-- Sans ces règles, n'importe quel porteur de la clé publique lirait
-- tout. C'est ELLES qui protègent les données, jamais le secret de
-- la clé — qui n'en est pas un, elle part dans le navigateur.

alter table posts   enable row level security;
alter table espaces enable row level security;

drop policy if exists "posts — les miens"   on posts;
drop policy if exists "espaces — les miens" on espaces;

create policy "posts — les miens" on posts
  for all
  using (proprietaire = auth.uid())
  with check (proprietaire = auth.uid());

create policy "espaces — les miens" on espaces
  for all
  using (proprietaire = auth.uid())
  with check (proprietaire = auth.uid());


-- ─── 3. Le serveur refuse le périmé ────────────────────────────
--
-- Un appareil qui a raté un tour de synchro peut renvoyer une
-- version ancienne — et ressusciter ce qu'un autre venait de
-- supprimer. Le serveur garde donc toujours la plus récente.
--
-- C'est sa seule règle, et elle est indispensable.

create or replace function refuser_perime() returns trigger as $$
begin
  if old.updated_at > new.updated_at then
    return old;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_perime   on posts;
drop trigger if exists espaces_perime on espaces;

create trigger posts_perime
  before update on posts
  for each row execute function refuser_perime();

create trigger espaces_perime
  before update on espaces
  for each row execute function refuser_perime();


-- ─── 4. Le stockage des images ─────────────────────────────────
--
-- Créer d'abord le bucket dans Storage : nom `images`, PRIVÉ.
-- Puis ces règles. Sans elles, le bucket est soit inaccessible,
-- soit ouvert à tous — il n'y a pas d'entre-deux.
--
-- Chacun ne touche qu'à SON dossier, dont le nom est son
-- identifiant : exactement le chemin qu'écrit le client,
-- `{proprietaire}/{image}`.

insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

drop policy if exists "images — lire les miennes"      on storage.objects;
drop policy if exists "images — déposer les miennes"   on storage.objects;
drop policy if exists "images — supprimer les miennes" on storage.objects;

create policy "images — lire les miennes" on storage.objects
  for select
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "images — déposer les miennes" on storage.objects
  for insert
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "images — supprimer les miennes" on storage.objects
  for delete
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);




-- ─── 5. Le compte lui-même ─────────────────────────────────────
--
-- Rien à créer : Supabase possède `auth.users`, la remplit à
-- l'inscription, et gère mots de passe et jetons. Nos tables s'y
-- rattachent, c'est tout — et le `on delete cascade` posé plus haut
-- fait que supprimer un compte emporte ses posts et ses espaces.
--
-- Manque une seule chose, et elle sera obligatoire le jour où
-- quelqu'un d'autre s'inscrit : POUVOIR SUPPRIMER SON PROPRE COMPTE.
-- Le client, avec la clé publique, n'en a pas le droit — et c'est
-- heureux. Il faut donc une fonction qui s'exécute avec les droits
-- du propriétaire, et qui ne peut effacer QUE l'appelant.

-- ⚠ LES FICHIERS NE SE SUPPRIMENT PAS D'ICI.
--
-- Une première version de cette fonction effaçait aussi les images,
-- par un `delete from storage.objects`. Supabase le REFUSE désormais,
-- et il a raison : supprimer la ligne ne supprime pas le fichier dans
-- le stockage objet, elle le rend seulement introuvable. On se
-- retrouverait à payer pour des octets que plus personne ne peut lire.
--
--   42501 — « Direct deletion from storage tables is not allowed.
--             Use the Storage API instead. »
--
-- Le client doit donc vider son dossier d'images PAR L'API DE STOCKAGE
-- avant d'appeler cette fonction. C'est un aller-retour de plus, et
-- c'est le prix d'une suppression qui supprime vraiment.

create or replace function supprimer_mon_compte() returns void
language plpgsql
security definer
-- `search_path` figé : sans ça, un schéma malveillant pourrait faire
-- exécuter son propre `delete` avec les droits élevés de la fonction.
set search_path = public, auth
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'Aucune session';
  end if;

  -- le compte ; la cascade se charge des posts et des espaces
  delete from auth.users where id = moi;
end;
$$;

revoke all on function supprimer_mon_compte() from public, anon;
grant execute on function supprimer_mon_compte() to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- Reste à faire à la main, dans le tableau de bord :
--
--   Authentication → Providers → Email
--     · activer « Email »
--     · DÉCOCHER « Confirm email »  (voir docs/04 § 7)
--
-- Puis me donner, depuis Project Settings → API :
--   · Project URL
--   · clé `anon` — surtout PAS la clé `service_role`
-- ═══════════════════════════════════════════════════════════════
