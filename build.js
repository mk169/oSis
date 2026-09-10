/* ===========================================================
   OS — Build
   Fasst index.html, CSS und JS zu einer einzigen Datei zusammen:
   dist/os.html – ohne <html>, <head> und <body>, damit sie sich
   überall einbetten und als Artifact veröffentlichen lässt.

   Aufruf:  node build.js
   =========================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'os.html');

const CSS = [
  'assets/css/base.css',
  'assets/css/layout.css',
  'assets/css/components.css',
  'assets/css/views.css'
];

const JS = [
  'assets/js/config.js',
  'assets/js/util.js',
  'assets/js/store.js',
  'assets/js/ui.js',
  'assets/js/forms.js',
  'assets/js/sync.js',
  'assets/js/views/today.js',
  'assets/js/views/week.js',
  'assets/js/views/season.js',
  'assets/js/views/projects.js',
  'assets/js/views/system.js',
  'assets/js/app.js'
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function bodyOf(html) {
  const match = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  if (!match) throw new Error('index.html enthält kein <body>.');
  return match[1]
    .replace(/\s*<script src="[^"]*"><\/script>/g, '')
    .trim();
}

function build() {
  const markup = bodyOf(read('index.html'));
  const css = CSS.map(read).join('\n\n');
  const js = JS.map(read).join('\n\n');

  // Ein Script am Ende des Dokuments läuft vor DOMContentLoaded,
  // beim Einbetten kann das Ereignis aber schon vorbei sein.
  const boot =
    "\n/* Start, auch wenn das Dokument bereits geladen ist. */\n" +
    "if (document.readyState === 'loading') {\n" +
    "  document.addEventListener('DOMContentLoaded', function () { OS.app.init(); });\n" +
    "} else {\n" +
    "  OS.app.init();\n" +
    "}\n";

  const jsClean = js.replace(
    /document\.addEventListener\('DOMContentLoaded', function \(\) \{\s*OS\.app\.init\(\);\s*\}\);/,
    ''
  );

  const out =
    '<title>OS Life Operating System</title>\n' +
    '<meta name="description" content="Ein ruhiges Life-Operating-System. Startet leer, speichert lokal.">\n' +
    '<style>\n' + css + '\n</style>\n\n' +
    markup + '\n\n' +
    '<script>\n' + jsClean + boot + '</script>\n';

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, out, 'utf8');

  const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
  console.log('dist/os.html geschrieben – ' + kb + ' KB');
}

build();
