# OS

Ein persönliches Life-Operating-System. Ruhig, editorial, ohne Gamification.
Die App startet bewusst leer: keine vorgefertigten Lebensziele, keine Demo-Daten,
keine Annahmen über die Person, die sie benutzt.

## Starten

Kein Build, keine Abhängigkeiten, kein Server nötig.

```
index.html im Browser öffnen
```

Alternativ als lokaler Server, etwa `python3 -m http.server`, und dann
`http://localhost:8000` aufrufen.

Alle Daten liegen im `localStorage` des Browsers. Es gibt kein Konto und keine
Übertragung nach außen. Export und Import als JSON finden sich unter
**Review & System → Daten**.

## Einzeldatei-Fassung

```
node build.js
```

Fasst Markup, CSS und JavaScript zu `dist/os.html` zusammen. Diese eine Datei
enthält die vollständige App und lässt sich überall hinlegen oder einbetten.

Steht eine Speicherfunktion der Umgebung zur Verfügung, nutzt der Export sie.
Ist keine vorhanden, zeigt OS den Export als Text zum Kopieren. Der Import
nimmt wahlweise eine Datei oder eingefügten Text.

## Geräte koppeln

Ohne Kopplung bleibt jedes Gerät für sich. Mit Kopplung sehen iPhone und Mac
denselben Stand. Die Daten liegen dann in einem eigenen Supabase-Projekt,
nicht bei OS und nicht bei Dritten.

**1. Projekt anlegen.** Auf supabase.com ein kostenloses Projekt erstellen.

**2. Tabelle einrichten.** Im SQL-Editor des Projekts einmal ausführen:

```sql
create table if not exists public.os_state (
  user_id    uuid primary key references auth.users on delete cascade,
  payload    jsonb not null,
  device     text,
  updated_at timestamptz not null default now()
);

alter table public.os_state enable row level security;

create policy "eigene daten lesen"  on public.os_state
  for select using (auth.uid() = user_id);
create policy "eigene daten anlegen" on public.os_state
  for insert with check (auth.uid() = user_id);
create policy "eigene daten aendern" on public.os_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.os_state;
```

Die drei Regeln sorgen dafür, dass jede Person nur die eigene Zeile sieht.
Die letzte Zeile schaltet die Live-Übertragung zwischen den Geräten frei.

**3. Adresse freigeben.** Unter Authentication, URL Configuration die Adresse
der App als Site URL und als Redirect URL eintragen, etwa
`https://mk169.github.io/oSis/`. Ohne diesen Schritt führt der Anmeldelink
ins Leere.

**4. Zugangsdaten holen.** Unter Settings, API stehen `Project URL` und der
Schlüssel `anon public`. Beide Werte werden gebraucht.

**5. In OS eintragen.** Review & System, Daten, Geräte, Kopplung einrichten.
Beide Werte einfügen, verbinden, dann die eigene E-Mail-Adresse eintragen und
den zugeschickten Link auf demselben Gerät öffnen.

**6. Zweites Gerät.** Dieselben Schritte 5 mit denselben Werten und derselben
E-Mail-Adresse. Ab dann folgen die Daten.

Der `anon public` Schlüssel darf im Gerät liegen, dafür ist er gemacht.
Geschützt werden die Daten durch die Zugriffsregeln der Datenbank.

### Was bei gleichzeitiger Änderung passiert

Der zuletzt gespeicherte Stand gewinnt. Bevor OS einen fremden Stand
übernimmt, legt es den eigenen als Sicherung ab. Unter Geräte lässt er sich
mit einem Klick zurückholen. Der Export bleibt unabhängig davon die
verlässlichste Sicherung.

### Grenzen

Die Kopplung braucht eine Verbindung nach außen. In der Claude-Artifact-Fassung
ist sie deshalb nicht verfügbar, dort blendet OS den Bereich aus. Export und
Import funktionieren überall.

## Auf Vercel veröffentlichen

Das Repository ist ohne Build-Schritt aufgebaut, Vercel liefert es unverändert
aus. `vercel.json` legt genau das fest und sorgt dafür, dass Änderungen sofort
ankommen statt aus dem Zwischenspeicher.

1. Auf vercel.com mit GitHub anmelden, Add New, Project, dieses Repository
   importieren.
2. Framework Preset auf `Other` lassen, Build Command und Install Command leer,
   Output Directory `.` – das steht schon in `vercel.json`.
3. Deploy. Nach etwa einer Minute steht die Adresse fest.
4. Unter Settings, Git prüfen, dass die Production Branch `main` ist.
5. Diese Adresse anschließend in Supabase unter Authentication, URL
   Configuration als Site URL und als Redirect URL eintragen. Ohne diesen
   Schritt führt der Anmeldelink ins Leere.

Vorschau-Bereitstellungen bekommen eigene Adressen. Der Anmeldelink gilt nur
für die eingetragene Produktionsadresse, richte die Kopplung also dort ein.

## Als Website veröffentlichen

Über GitHub Pages: Repository → Settings → Pages → Source „Deploy from a
branch“ → Branch `main` und Ordner `/ (root)`. Danach liegt die App unter
`https://mk169.github.io/oSis/`.

## Aufbau

| Bereich | Zweck |
| --- | --- |
| Heute | Nur was jetzt zählt: eine Sache, höchstens drei Aufgaben, Zeitblöcke, Check-in, Abschluss |
| Woche | Wochenfokus, Kalender Mo–So, Kapazität, Gewohnheitsmatrix, „Diese Woche nicht“ |
| Saison | 6 bis 12 Wochen, drei bis fünf Ziele, verknüpfte Projekte, Mid-Season-Review |
| Projekte & Ziele | Aktive Projekte, Ideen & Backlog, Ziele, 25/5-Methode, Frameworks |
| Review & System | Wochen- und Saisonreview, Lebensbereiche, Gewohnheiten, Vorlagen, Daten, Archiv |

## Verknüpfungen

Aufgabe → Projekt → Saisonziel → Lebensbereich.

Jede Ebene ist freiwillig. Ein Projekt ohne Ziel wird nicht getadelt, sondern
mit einem Hinweis versehen: „Vielleicht ist dies eine Idee für später.“

## Grenzen, die das System absichtlich zieht

- Höchstens drei Tagesaufgaben (einstellbar unter Daten → Maße)
- Höchstens fünf aktive Projekte, sichtbar als „Aktiv: X von 5“
- Drei bis fünf Saisonziele je Saison
- Aus den Top 5 der 25/5-Methode höchstens ein bis zwei Ziele pro Saison
- Die übrigen 20 Wünsche bleiben sichtbar, erscheinen aber nie in Tag oder Woche

Nichts davon wird rot markiert. Hinweise sind leise formuliert, Fristen werden
relativ und ohne Mahnung angezeigt.

## Tastatur

| Taste | Wirkung |
| --- | --- |
| `1` – `5` | Zwischen den fünf Bereichen wechseln |
| `n` | Neu |
| `i` | Inbox |
| `/` oder `Strg/Cmd + K` | Suche |
| `Esc` | Dialog oder Inbox schließen |
| `Strg/Cmd + Enter` | Formular abschicken |

## Frameworks für Ziele

Freiwillige Vorlagen: SMART, Outcome/Process, WOOP, 12-Week-Year, One-Thing.
Jede Vorlage lässt sich nach dem Ausfüllen zu einer lesbaren Zielkarte
zusammenfassen. „Ohne Vorlage“ ist eine gleichwertige Wahl.

## Dateien

```
index.html
assets/css/base.css          Tokens, Reset, Typografie
assets/css/layout.css        App-Shell, Navigation, Drawer
assets/css/components.css    Karten, Formulare, Modal, Chips
assets/css/views.css         Ansichtsspezifisches
assets/js/util.js            Datum, Text, Icons
assets/js/store.js           Datenmodell, Persistenz, Selektoren, Export/Import
assets/js/ui.js              Modal, Formular, Toast, Drawer
assets/js/forms.js           Dialoge für Aufgabe, Projekt, Ziel, Saison; Frameworks
assets/js/views/*.js         Die fünf Ansichten
assets/js/app.js             Router, Ereignisse, Inbox, Suche
build.js                     Baut dist/os.html als Einzeldatei
```

## Datenformat

Ein Export enthält `{ app, version, exportedAt, state }`. Der Import kann
ersetzen oder zusammenführen; beim Zusammenführen werden nur unbekannte
Einträge übernommen.
