-- ===========================================================
-- OS — Datenbank für die Gerätekopplung
--
-- Einmal im SQL-Editor des eigenen Supabase-Projekts ausführen.
-- Danach unter Authentication, URL Configuration die Adresse der App
-- als Site URL und als Redirect URL eintragen, sonst führt der
-- Anmeldelink ins Leere.
-- ===========================================================

-- Eine Zeile je Person. Der gesamte Stand liegt als JSON in payload.
create table if not exists public.os_state (
  user_id    uuid primary key references auth.users on delete cascade,
  payload    jsonb not null,
  device     text,
  updated_at timestamptz not null default now()
);

-- Ohne diese Zeile wäre die Tabelle für alle Angemeldeten lesbar.
alter table public.os_state enable row level security;

-- Drei Regeln, alle mit derselben Aussage: nur die eigene Zeile.
drop policy if exists "eigene daten lesen"   on public.os_state;
drop policy if exists "eigene daten anlegen" on public.os_state;
drop policy if exists "eigene daten aendern" on public.os_state;

create policy "eigene daten lesen" on public.os_state
  for select
  using (auth.uid() = user_id);

create policy "eigene daten anlegen" on public.os_state
  for insert
  with check (auth.uid() = user_id);

create policy "eigene daten aendern" on public.os_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Damit Änderungen des anderen Geräts von selbst ankommen und nicht
-- erst beim Knopf „Jetzt abgleichen“.
do $$
begin
  alter publication supabase_realtime add table public.os_state;
exception
  when duplicate_object then null;
end
$$;
