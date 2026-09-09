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
