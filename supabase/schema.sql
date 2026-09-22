-- Family Trip Planner — Datenmodell
-- Manuell im Supabase SQL Editor ausführen. NICHT automatisiert deployen.

-- ─────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Tabellen
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists family_members (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  pin_hash    text not null,
  created_at  timestamptz not null default now()
);

-- Case-insensitive eindeutiger Username (verhindert "Lukas" vs. "lukas")
create unique index if not exists family_members_username_lower_idx
  on family_members (lower(username));

create table if not exists slots (
  id          uuid primary key default gen_random_uuid(),
  day         date not null,
  sort_order  int not null default 0,
  title       text not null,
  description text,
  link        text,
  created_by  uuid references family_members (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists slots_day_sort_idx on slots (day, sort_order);

-- updated_at automatisch pflegen
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists slots_set_updated_at on slots;
create trigger slots_set_updated_at
  before update on slots
  for each row
  execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table family_members enable row level security;
alter table slots enable row level security;

-- family_members: keine direkten Client-Zugriffe. Login/Registrierung läuft
-- ausschließlich über die SECURITY DEFINER RPCs unten, die pin_hash niemals
-- nach außen geben.
-- (keine Policies -> ohne Policy ist der Zugriff für anon/authenticated
-- standardmäßig verweigert, RPCs mit SECURITY DEFINER umgehen das gezielt)

-- slots: Lesen für alle (auch anon), Schreiben ist app-seitig hinter dem
-- Familien-PIN-Gate im Frontend geschützt.
create policy "slots_select_all"
  on slots for select
  using (true);

create policy "slots_insert_all"
  on slots for insert
  with check (true);

create policy "slots_update_all"
  on slots for update
  using (true)
  with check (true);

create policy "slots_delete_all"
  on slots for delete
  using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- RPC: list_usernames
-- Gibt nur id + username zurück (kein pin_hash) für die Login-Auswahl.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function list_usernames()
returns table (id uuid, username text)
language sql
security definer
set search_path = public
as $$
  select id, username
  from family_members
  order by lower(username);
$$;

grant execute on function list_usernames() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- RPC: register_or_login
-- Legt bei neuem Username einen Eintrag mit gehashtem PIN an. Bei
-- existierendem Username wird der PIN gegen den gespeicherten Hash geprüft.
-- Gibt bei Erfolg die member id zurück, sonst wird eine Exception geworfen.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function register_or_login(p_username text, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       uuid;
  v_pin_hash text;
begin
  if p_username is null or length(trim(p_username)) = 0 then
    raise exception 'Username darf nicht leer sein';
  end if;

  if p_pin is null or length(p_pin) < 4 then
    raise exception 'PIN muss mindestens 4 Zeichen haben';
  end if;

  select id, pin_hash
    into v_id, v_pin_hash
    from family_members
   where lower(username) = lower(p_username);

  if v_id is null then
    -- Neuer Username -> Account anlegen
    -- crypt/gen_salt sind schema-qualifiziert (extensions.), da Supabase
    -- pgcrypto standardmäßig im Schema "extensions" statt "public" anlegt.
    insert into family_members (username, pin_hash)
    values (p_username, extensions.crypt(p_pin, extensions.gen_salt('bf')))
    returning id into v_id;

    return v_id;
  end if;

  -- Existierender Username -> PIN prüfen
  if v_pin_hash = extensions.crypt(p_pin, v_pin_hash) then
    return v_id;
  else
    raise exception 'Falscher PIN für diesen Namen';
  end if;
end;
$$;

grant execute on function register_or_login(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Delta: Wochenansicht (time_label) + explizite anon-Policies
-- ─────────────────────────────────────────────────────────────────────────

-- Bugfix: crypt/gen_salt schema-qualifizieren, da Supabase pgcrypto
-- standardmäßig im Schema "extensions" statt "public" anlegt (führte zu
-- "function gen_salt(unknown) does not exist").
create or replace function register_or_login(p_username text, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id       uuid;
  v_pin_hash text;
begin
  if p_username is null or length(trim(p_username)) = 0 then
    raise exception 'Username darf nicht leer sein';
  end if;

  if p_pin is null or length(p_pin) < 4 then
    raise exception 'PIN muss mindestens 4 Zeichen haben';
  end if;

  select id, pin_hash
    into v_id, v_pin_hash
    from family_members
   where lower(username) = lower(p_username);

  if v_id is null then
    insert into family_members (username, pin_hash)
    values (p_username, extensions.crypt(p_pin, extensions.gen_salt('bf')))
    returning id into v_id;

    return v_id;
  end if;

  if v_pin_hash = extensions.crypt(p_pin, v_pin_hash) then
    return v_id;
  else
    raise exception 'Falscher PIN für diesen Namen';
  end if;
end;
$$;

alter table slots add column if not exists time_label text;

-- Zugriffsschutz läuft bewusst app-seitig über Familien-PIN + Username/PIN,
-- nicht über Supabase Auth/RLS-Rollen - akzeptabel für dieses private,
-- nicht-sensible Tool. Die Policies erlauben der anon-Rolle explizit
-- Schreibzugriff, da die App ausschließlich mit dem anon-Key arbeitet.
create policy "slots_insert_anon"
  on slots for insert
  to anon
  with check (true);

create policy "slots_update_anon"
  on slots for update
  to anon
  using (true)
  with check (true);

create policy "slots_delete_anon"
  on slots for delete
  to anon
  using (true);

-- Realtime: slots-Tabelle muss der Publication beitreten, sonst feuern
-- postgres_changes-Events (Insert/Update/Delete) nicht.
alter publication supabase_realtime add table slots;
