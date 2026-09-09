/* ===========================================================
   OS — App
   Router, Ereignisse, Inbox, Suche, Tastatur.
   =========================================================== */

OS.app = (function () {
  'use strict';

  const U = OS.util;
  const S = OS.store;

  const ROUTES = ['heute', 'woche', 'saison', 'projekte', 'system'];
  let current = { route: 'heute', params: {} };

  /* --- Aktionsregister --------------------------------------------- */

  OS.actions = {};
  function registerActions(map) { Object.assign(OS.actions, map); }

  /* --- Routing ------------------------------------------------------ */

  function parseHash() {
    const raw = (location.hash || '#/heute').replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const route = ROUTES.includes(path) ? path : 'heute';
    const params = {};
    (query || '').split('&').filter(Boolean).forEach(pair => {
      const [k, v] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { route, params };
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  /* --- Rendern -------------------------------------------------------- */

  function welcomeCard() {
    return '<div class="card" style="margin-bottom:34px;border-left:2px solid var(--accent)">' +
      '<span class="overline">Willkommen</span>' +
      '<h3 style="margin-top:8px">Dieses System ist leer – und das ist Absicht.</h3>' +
      '<p class="small" style="margin-top:10px;color:var(--ink-2);max-width:62ch">Es enthält nichts über dich, bis du etwas einträgst. ' +
      'Ein guter Anfang: ein oder zwei Lebensbereiche, eine Saison mit drei Zielen, ein Projekt mit einer nächsten Handlung. ' +
      'Alles andere kann warten.</p>' +
      '<div class="row" style="margin-top:16px">' +
        '<button class="btn btn-sm" data-act="ui.goAreas">Lebensbereiche</button>' +
        '<button class="btn btn-sm" data-act="saison.new">Saison anlegen</button>' +
        '<button class="btn btn-sm" data-act="os.habitNew">Gewohnheit</button>' +
      '</div>' +
      '</div>';
  }

  function render() {
    current = parseHash();
    const view = OS.views[current.route];
    const root = document.getElementById('view');
    if (!view || !root) return;

    const showWelcome = S.isEmpty() && current.route === 'heute';
    root.innerHTML = (showWelcome ? welcomeCard() : '') + view.render(current.params);

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('is-active', item.getAttribute('data-route') === current.route);
    });

    document.title = 'OS · ' + (view.title || '');
    U.autosizeAll(root);
    if (view.mount) view.mount(root, current.params);

    updateChrome();
    if (OS.ui.isDrawerOpen()) OS.ui.renderDrawer();
    OS.forms.refresh();
  }

  function updateChrome() {
    const count = S.state.inbox.length;
    const badge = document.getElementById('inbox-count');
    if (badge) {
      badge.textContent = count;
      badge.className = 'pill' + (count ? ' pill-accent' : '');
    }
    const date = document.getElementById('topbar-date');
    if (date) date.textContent = U.fmtLong(U.today());

    const hint = document.getElementById('season-hint');
    if (hint) {
      const season = S.currentSeason();
      if (season) {
        const p = S.seasonProgress(season);
        hint.innerHTML = U.esc(season.title) + '<br>Woche ' + p.week + ' von ' + p.weeks;
      } else {
        hint.textContent = 'Keine Saison aktiv';
      }
    }
  }

  function applySettings() {
    const s = S.state.settings;
    const root = document.documentElement;
    root.setAttribute('data-theme', s.theme === 'dark' ? 'dark' : 'light');
    const accent = S.ACCENTS.find(a => a.id === s.accent) || S.ACCENTS[0];
    const dark = s.theme === 'dark';
    root.style.setProperty('--accent', dark ? accent.dark : accent.value);
    root.style.setProperty('--accent-soft', dark ? accent.darkSoft : accent.soft);
  }

  /* --- Store-Bindungen (data-store) ------------------------------------ */

  function resolveStoreTarget(spec) {
    const parts = String(spec).split(':');
    const kind = parts[0];
    const id = parts[1] || '';
    const path = parts.slice(2).join(':');

    if (kind === 'milestone') {
      const [projectId, msId] = id.split('.');
      const p = S.find('project', projectId);
      const ms = p && (p.milestones || []).find(m => m.id === msId);
      return { obj: ms, path: path };
    }
    return { obj: S.find(kind, id), path: path };
  }

  function writeStore(el, rerender) {
    const spec = el.getAttribute('data-store');
    if (!spec) return;
    const { obj, path } = resolveStoreTarget(spec);
    if (!obj || !path) return;

    let value;
    if (el.type === 'checkbox') value = el.checked;
    else if (el.hasAttribute('data-number') || el.type === 'range' || el.type === 'number') value = Number(el.value);
    else value = el.value;

    U.setPath(obj, path, value);
    if (obj.updatedAt !== undefined) obj.updatedAt = new Date().toISOString();

    if (rerender) S.update();
    else S.silent();
  }

  /* --- Ereignisse --------------------------------------------------------- */

  function bindEvents() {
    document.addEventListener('click', e => {
      const target = e.target.closest('[data-act]');
      if (!target) return;
      if (target.tagName === 'SELECT') return;
      const act = target.getAttribute('data-act');
      const fn = OS.actions[act];
      if (!fn) return;
      e.preventDefault();
      fn(target, Object.assign({}, target.dataset), e);
    });

    document.addEventListener('change', e => {
      const el = e.target;
      if (el.matches('[data-store]')) {
        writeStore(el, el.hasAttribute('data-rerender') || el.tagName === 'SELECT' || el.type === 'checkbox');
        return;
      }
      const actEl = el.closest('[data-act]');
      if (actEl && (actEl.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox')) {
        const fn = OS.actions[actEl.getAttribute('data-act')];
        if (fn) fn(actEl, Object.assign({}, actEl.dataset), e);
      }
    });

    const debouncedWrite = U.debounce(el => writeStore(el, false), 260);
    document.addEventListener('input', e => {
      const el = e.target;
      if (el.matches('textarea[data-autosize], .ghost-area')) U.autosize(el);
      if (!el.matches('[data-store]')) return;
      if (el.type === 'range') { writeStore(el, false); updateRangeLabel(el); return; }
      debouncedWrite(el);
    });

    document.getElementById('overlay').addEventListener('click', () => OS.ui.closeDrawer());

    window.addEventListener('hashchange', render);

    window.addEventListener('scroll', () => {
      const bar = document.querySelector('.topbar');
      if (bar) bar.classList.toggle('is-stuck', window.scrollY > 8);
    }, { passive: true });

    document.addEventListener('keydown', onKey);
  }

  function updateRangeLabel(el) {
    const label = el.parentElement && el.parentElement.querySelector('.progress-value');
    if (label) label.textContent = el.value + ' %';
  }

  function isTyping(e) {
    const el = e.target;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      if (!OS.ui.closeTopModal()) OS.ui.closeDrawer();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearch();
      return;
    }
    if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === '/') { e.preventDefault(); openSearch(); }
    else if (e.key === 'n') { e.preventDefault(); openNew(); }
    else if (e.key === 'i') { e.preventDefault(); openInbox(); }
    else if (['1', '2', '3', '4', '5'].includes(e.key)) {
      e.preventDefault();
      go('#/' + ROUTES[Number(e.key) - 1]);
    }
  }

  /* --- Inbox ------------------------------------------------------------- */

  function inboxHtml() {
    const items = S.inbox();
    const kinds = [
      { id: 'aufgabe', label: 'Aufgabe' },
      { id: 'idee', label: 'Idee' },
      { id: 'sorge', label: 'Sorge' }
    ];
    const kind = OS.app._inboxKind || 'aufgabe';

    return '<div class="drawer-head">' +
        '<div><span class="overline">Inbox</span>' +
          '<h3 style="margin-top:8px">Alles darf hier landen</h3>' +
          '<p class="small muted" style="margin-top:6px">Aufgaben, Ideen, Sorgen. Sortiert wird später.</p></div>' +
        '<button class="icon-btn" data-act="ui.closeDrawer" aria-label="Schließen">' + U.icons.close + '</button>' +
      '</div>' +
      '<div class="drawer-body">' +
        '<div class="quick-capture" style="margin-bottom:22px">' +
          '<div class="kind-picker">' + kinds.map(k =>
            '<button class="chip chip-btn' + (kind === k.id ? ' is-on' : '') + '" data-act="inbox.kind" data-kind="' + k.id + '">' +
            k.label + '</button>').join('') + '</div>' +
          '<textarea class="textarea" rows="2" data-inbox-input data-autofocus placeholder="Was liegt an? Enter speichert."></textarea>' +
          '<button class="btn btn-sm btn-primary" data-act="inbox.add">Aufnehmen</button>' +
        '</div>' +
        (items.length ? items.map(item =>
          '<div class="inbox-item kind-' + U.esc(item.kind) + '">' +
            '<div class="ii-main">' +
              '<span class="kind-mark">' + U.esc(S.INBOX_KIND_LABEL[item.kind] || '') + '</span>' +
              '<div class="ii-text">' + U.nl2br(item.text) + '</div>' +
              '<div class="ii-actions">' +
                '<button class="btn btn-sm" data-act="inbox.toToday" data-id="' + item.id + '">Heute</button>' +
                '<button class="btn btn-sm" data-act="inbox.toTask" data-id="' + item.id + '">Aufgabe</button>' +
                '<button class="btn btn-sm" data-act="inbox.toIdea" data-id="' + item.id + '">Idee</button>' +
                '<button class="btn btn-sm" data-act="inbox.toProject" data-id="' + item.id + '">Projekt</button>' +
                '<button class="btn btn-sm btn-quiet" data-act="inbox.remove" data-id="' + item.id + '">Erledigt</button>' +
              '</div>' +
            '</div>' +
          '</div>').join('')
          : '<div class="empty">Die Inbox ist leer. Ein guter Zustand.</div>') +
      '</div>';
  }

  function openInbox() {
    OS.ui.openDrawer(inboxHtml);
    setTimeout(() => {
      const input = document.querySelector('[data-inbox-input]');
      if (input) {
        input.focus();
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addFromInbox(); }
        });
      }
    }, 50);
  }

  function addFromInbox() {
    const input = document.querySelector('[data-inbox-input]');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    S.update(() => S.addInbox({ text: text, kind: OS.app._inboxKind || 'aufgabe' }));
    const fresh = document.querySelector('[data-inbox-input]');
    if (fresh) fresh.focus();
  }

  /* --- Neu ---------------------------------------------------------------- */

  function openNew() {
    const tiles = [
      { act: 'os.taskNew', title: 'Aufgabe', desc: 'Eine konkrete Handlung' },
      { act: 'ui.inbox', title: 'Inbox-Notiz', desc: 'Schnell wegschreiben' },
      { act: 'os.projectNew', title: 'Projekt', desc: 'Mit Ergebnis und Ende' },
      { act: 'os.goalNew', title: 'Ziel', desc: 'Was wahr sein soll' },
      { act: 'os.ideaNew', title: 'Idee', desc: 'Ohne Verpflichtung' },
      { act: 'os.blockNew', title: 'Zeitblock', desc: 'Zeit für eine Sache' }
    ];
    OS.ui.modal({
      title: 'Neu',
      size: 'sm',
      body: '<div class="new-grid">' + tiles.map(t =>
        '<button class="new-tile" data-act="' + t.act + '" data-from-new="1">' +
          '<div class="nt-title">' + t.title + '</div>' +
          '<div class="nt-desc">' + t.desc + '</div>' +
        '</button>').join('') + '</div>'
    });
  }

  /* --- Suche ---------------------------------------------------------------- */

  function searchAll(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits = [];

    function match(text) { return String(text || '').toLowerCase().includes(q); }

    S.state.tasks.forEach(t => {
      if (match(t.title) || match(t.notes)) hits.push({ kind: 'Aufgabe', title: t.title, act: 'os.taskEdit', id: t.id });
    });
    S.state.projects.forEach(p => {
      if (match(p.name) || match(p.why) || match(p.outcome) || match(p.nextAction) || match(p.notes))
        hits.push({ kind: 'Projekt', title: p.name, act: 'os.projectOpen', id: p.id });
    });
    S.state.goals.forEach(g => {
      if (match(g.title) || match(g.why) || match(g.metric) || match(g.summary))
        hits.push({ kind: 'Ziel', title: g.title, act: 'os.goalOpen', id: g.id });
    });
    S.state.ideas.forEach(i => {
      if (match(i.title) || match(i.notes)) hits.push({ kind: 'Idee', title: i.title, act: 'projekte.ideaEdit', id: i.id });
    });
    S.state.inbox.forEach(i => {
      if (match(i.text)) hits.push({ kind: 'Inbox', title: i.text, act: 'ui.inbox', id: i.id });
    });
    S.state.method255.wishes.forEach(w => {
      if (match(w.text)) hits.push({ kind: '25/5', title: w.text, act: 'ui.goMethod', id: w.id });
    });
    S.state.seasons.forEach(s => {
      if (match(s.title) || match(s.motto)) hits.push({ kind: 'Saison', title: s.title, act: 'ui.goSeason', id: s.id });
    });
    Object.keys(S.state.days).forEach(key => {
      const d = S.state.days[key];
      if (match(d.oneThing) || match(d.intention) || match(d.checkin && d.checkin.note) ||
        match(d.close && d.close.done) || match(d.close && d.close.takeaway)) {
        hits.push({ kind: 'Tag · ' + U.fmtShort(key), title: d.oneThing || d.intention || U.fmtLong(key), act: 'ui.goDay', id: key });
      }
    });
    S.state.reviews.forEach(r => {
      const text = Object.keys(r.answers).map(k => r.answers[k]).join(' ');
      if (match(text)) hits.push({
        kind: r.type === 'woche' ? 'Wochenreview' : 'Saisonreview',
        title: U.trunc(text.trim(), 70), act: 'system.openReview', id: r.id
      });
    });

    return hits.slice(0, 40);
  }

  function openSearch() {
    const api = OS.ui.modal({
      size: 'lg',
      body: '<div style="margin:-22px -28px">' +
        '<input class="search-input" data-search placeholder="Suchen …" data-autofocus>' +
        '<div class="search-results" data-results></div>' +
        '</div>'
    });

    const input = api.root.querySelector('[data-search]');
    const results = api.root.querySelector('[data-results]');
    let cursor = 0;
    let hits = [];

    function draw() {
      if (!input.value.trim()) {
        results.innerHTML = '<div style="padding:18px 22px" class="small muted">' +
          'Durchsucht Aufgaben, Projekte, Ziele, Ideen, Inbox, Tage und Reviews.</div>';
        return;
      }
      hits = searchAll(input.value);
      if (!hits.length) {
        results.innerHTML = '<div style="padding:18px 22px" class="small muted">Nichts gefunden.</div>';
        return;
      }
      results.innerHTML = hits.map((h, i) =>
        '<button class="search-hit' + (i === cursor ? ' is-cursor' : '') + '" data-hit="' + i + '">' +
          '<span class="hit-kind">' + U.esc(h.kind) + '</span>' +
          '<div class="hit-title">' + U.esc(U.trunc(h.title || 'Ohne Titel', 90)) + '</div>' +
        '</button>').join('');
      results.querySelectorAll('[data-hit]').forEach(btn => {
        btn.addEventListener('click', () => choose(Number(btn.getAttribute('data-hit'))));
      });
    }

    function choose(i) {
      const hit = hits[i];
      if (!hit) return;
      api.close();
      const fn = OS.actions[hit.act];
      if (fn) fn(null, { id: hit.id, d: hit.id });
    }

    input.addEventListener('input', () => { cursor = 0; draw(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, hits.length - 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(cursor - 1, 0); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(cursor); }
    });

    draw();
  }

  /* --- Gemeinsame Aktionen ------------------------------------------------------ */

  const sharedActions = {
    'ui.search': openSearch,
    'ui.inbox': openInbox,
    'ui.new': openNew,
    'ui.closeDrawer': () => OS.ui.closeDrawer(),
    'ui.goProjects': () => go('#/projekte?tab=aktiv'),
    'ui.goAreas': () => go('#/system?tab=bereiche'),
    'ui.goHabits': () => go('#/system?tab=gewohnheiten'),
    'ui.goArchive': () => go('#/system?tab=archiv'),
    'ui.goTemplates': () => go('#/system?tab=vorlagen'),
    'ui.goMethod': () => go('#/projekte?tab=methode'),
    'ui.goSeason': (el, ds) => go('#/saison' + (ds && ds.id ? '?s=' + ds.id : '')),
    'ui.goDay': (el, ds) => go('#/heute?d=' + (ds && ds.id ? ds.id : U.today())),

    'os.taskNew': (el, ds) => OS.forms.task(null, {
      projectId: (ds && ds.project) || null,
      date: (ds && ds.date) || null
    }),
    'os.taskEdit': (el, ds) => OS.forms.task(ds.id),
    'os.taskToggle': (el, ds) => S.update(() => S.toggleTask(ds.id)),
    'os.taskPlan': (el, ds) => OS.forms.planTask(ds.id),
    'os.taskArchive': (el, ds) => {
      S.update(() => { const t = S.find('task', ds.id); if (t) t.status = 'archived'; });
      OS.ui.toast('Archiviert.', {
        label: 'Rückgängig',
        onClick: () => S.update(() => { const t = S.find('task', ds.id); if (t) t.status = 'open'; })
      });
    },

    'os.projectNew': (el, ds) => OS.forms.project({ goalIds: ds && ds.goal ? [ds.goal] : [] }),
    'os.projectOpen': (el, ds) => OS.forms.projectDetail(ds.id),
    'os.projectGoalToggle': (el, ds) => {
      S.update(() => {
        const p = S.find('project', ds.id);
        if (!p) return;
        const i = p.goalIds.indexOf(ds.goal);
        if (i >= 0) p.goalIds.splice(i, 1); else p.goalIds.push(ds.goal);
      });
    },
    'os.projectArchive': async (el, ds) => {
      const ok = await OS.ui.confirm({
        title: 'Projekt archivieren?',
        text: 'Es verschwindet aus der aktiven Ansicht und bleibt im Archiv lesbar.',
        confirmLabel: 'Archivieren'
      });
      if (!ok) return;
      S.update(() => { const p = S.find('project', ds.id); if (p) { p.status = 'archiviert'; p.archivedAt = new Date().toISOString(); } });
      OS.ui.closeAllModals();
    },
    'os.projectDelete': async (el, ds) => {
      const ok = await OS.ui.confirm({
        title: 'Projekt löschen?',
        text: 'Zugehörige Aufgaben bleiben bestehen, verlieren aber ihre Verknüpfung.',
        confirmLabel: 'Löschen', tone: 'danger'
      });
      if (!ok) return;
      S.update(() => {
        S.state.tasks.forEach(t => { if (t.projectId === ds.id) t.projectId = null; });
        S.remove('project', ds.id);
      });
      OS.ui.closeAllModals();
    },
    'os.milestoneAdd': async (el, ds) => {
      const title = await OS.ui.prompt({ title: 'Meilenstein', label: 'Was ist dann erreicht?' });
      if (!title) return;
      S.update(() => {
        const p = S.find('project', ds.id);
        if (!p) return;
        if (!Array.isArray(p.milestones)) p.milestones = [];
        p.milestones.push({ id: U.uid('m'), title: title, done: false, due: null });
      });
    },
    'os.milestoneToggle': (el, ds) => {
      S.update(() => {
        const p = S.find('project', ds.id);
        const m = p && (p.milestones || []).find(x => x.id === ds.ms);
        if (m) m.done = !m.done;
      });
    },
    'os.milestoneRemove': (el, ds) => {
      S.update(() => {
        const p = S.find('project', ds.id);
        if (!p) return;
        const i = (p.milestones || []).findIndex(x => x.id === ds.ms);
        if (i >= 0) p.milestones.splice(i, 1);
      });
    },

    'os.goalNew': (el, ds) => OS.forms.goal({ projectId: (ds && ds.project) || null }),
    'os.goalOpen': (el, ds) => OS.forms.goalDetail(ds.id),
    'os.goalFramework': (el, ds) => {
      S.update(() => {
        const g = S.find('goal', ds.id);
        if (!g) return;
        if (!g.framework) g.framework = { type: 'frei', fields: {} };
        g.framework.type = ds.fw;
      });
    },
    'os.goalSummarize': (el, ds) => {
      S.update(() => {
        const g = S.find('goal', ds.id);
        if (g) g.summary = OS.forms.summarize(g);
      });
      OS.ui.toast('Zielkarte aktualisiert.');
    },
    'os.goalProgressMode': (el, ds) => {
      S.update(() => {
        const g = S.find('goal', ds.id);
        if (g) g.progressMode = ds.mode;
      });
    },
    'os.goalDelete': async (el, ds) => {
      const ok = await OS.ui.confirm({
        title: 'Ziel löschen?',
        text: 'Verknüpfte Projekte bleiben bestehen.',
        confirmLabel: 'Löschen', tone: 'danger'
      });
      if (!ok) return;
      S.update(() => {
        S.state.projects.forEach(p => {
          const i = (p.goalIds || []).indexOf(ds.id);
          if (i >= 0) p.goalIds.splice(i, 1);
        });
        S.remove('goal', ds.id);
      });
      OS.ui.closeAllModals();
    },

    'os.ideaNew': () => OS.forms.idea(),
    'os.areaNew': () => OS.forms.area(),
    'os.habitNew': () => OS.forms.habit(),
    'os.blockNew': () => OS.forms.block(U.today()),

    'inbox.kind': (el, ds) => { OS.app._inboxKind = ds.kind; OS.ui.renderDrawer(); openInboxFocus(); },
    'inbox.add': addFromInbox,
    'inbox.remove': (el, ds) => S.update(() => S.remove('inbox', ds.id)),
    'inbox.toToday': (el, ds) => {
      S.update(() => {
        const item = S.find('inbox', ds.id);
        if (!item) return;
        S.addTask({ title: item.text, date: U.today() });
        S.remove('inbox', ds.id);
      });
      OS.ui.toast('Für heute geplant.');
    },
    'inbox.toTask': (el, ds) => {
      const item = S.find('inbox', ds.id);
      if (!item) return;
      const text = item.text;
      S.update(() => S.remove('inbox', ds.id));
      OS.forms.task(null, { title: text });
    },
    'inbox.toIdea': (el, ds) => {
      S.update(() => {
        const item = S.find('inbox', ds.id);
        if (!item) return;
        S.addIdea({ title: item.text });
        S.remove('inbox', ds.id);
      });
      OS.ui.toast('In Ideen abgelegt.');
    },
    'inbox.toProject': (el, ds) => {
      const item = S.find('inbox', ds.id);
      if (!item) return;
      OS.forms.project({ name: item.text });
      S.update(() => S.remove('inbox', ds.id));
    }
  };

  function openInboxFocus() {
    setTimeout(() => {
      const input = document.querySelector('[data-inbox-input]');
      if (input) {
        input.focus();
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addFromInbox(); }
        });
      }
    }, 40);
  }

  /* --- Start ------------------------------------------------------------------- */

  function init() {
    S.init();

    // Beim allerersten Start der Systemeinstellung folgen. Danach entscheidet der Schalter.
    if (S.isFresh() && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      S.silent(() => { S.state.settings.theme = 'dark'; });
    }
    applySettings();

    registerActions(sharedActions);
    Object.keys(OS.views).forEach(key => {
      if (OS.views[key].actions) registerActions(OS.views[key].actions);
    });

    bindEvents();
    S.subscribe(() => { render(); });
    render();
  }

  return {
    init: init, render: render, go: go, applySettings: applySettings,
    registerActions: registerActions, openSearch: openSearch, openInbox: openInbox,
    get current() { return current; },
    _inboxKind: 'aufgabe'
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  OS.app.init();
});
