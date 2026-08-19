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
