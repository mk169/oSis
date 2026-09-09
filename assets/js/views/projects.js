/* ===========================================================
   OS — Ansicht: Projekte & Ziele
   Die strategische Ebene.
   =========================================================== */

OS.views.projekte = (function () {
  'use strict';

  const U = OS.util;
  const S = OS.store;

  const TABS = [
    { id: 'aktiv', num: 'A', label: 'Aktive Projekte' },
    { id: 'backlog', num: 'B', label: 'Ideen & Backlog' },
    { id: 'ziele', num: 'C', label: 'Ziele' },
    { id: 'methode', num: 'D', label: '25/5-Methode' },
    { id: 'frameworks', num: 'E', label: 'Frameworks' }
  ];

  function tabOf(params) {
    const t = params && params.tab;
    return TABS.some(x => x.id === t) ? t : 'aktiv';
  }

  function tabs(active) {
    return '<div class="tabs">' + TABS.map(t =>
      '<a class="tab' + (t.id === active ? ' is-active' : '') + '" href="#/projekte?tab=' + t.id + '">' +
      '<span class="tab-num">' + t.num + '</span>' + U.esc(t.label) + '</a>').join('') + '</div>';
  }

  /* --- A: Aktive Projekte -------------------------------------------- */

  function projectCard(p) {
    const progress = S.projectProgress(p);
    const goals = (p.goalIds || []).map(id => S.find('goal', id)).filter(Boolean);
    const openTasks = S.tasks({ projectId: p.id, status: 'open' }).length;

    return '<article class="card card-hover">' +
      '<button class="project-card" data-act="os.projectOpen" data-id="' + p.id + '">' +
        '<div class="card-head" style="margin-bottom:0">' +
          '<div>' +
            '<span class="overline">' + U.esc(S.PROJECT_STATUS_LABEL[p.status]) + '</span>' +
            '<div class="card-title" style="margin-top:6px">' + U.esc(p.name || 'Ohne Titel') + '</div>' +
          '</div>' +
        '</div>' +
        (p.outcome ? '<div class="small muted" style="line-height:1.55">' + U.esc(U.trunc(p.outcome, 130)) + '</div>' : '') +
        '<div class="pc-next">' +
          '<span class="pc-next-label">Nächste Handlung</span>' +
          (p.nextAction ? U.esc(p.nextAction) : '<span class="muted">Noch nicht festgelegt</span>') +
        '</div>' +
        ((p.milestones || []).length
          ? '<div><div class="spread tiny muted" style="margin-bottom:5px"><span>Meilensteine</span><span>' + progress + ' %</span></div>' +
            OS.ui.progressBar(progress) + '</div>' : '') +
        '<div class="pc-meta">' +
          OS.ui.areaChip(p.areaId) +
          goals.map(g => '<span class="chip chip-green">' + U.esc(U.trunc(g.title, 24)) + '</span>').join('') +
          (openTasks ? '<span class="chip">' + openTasks + ' ' + U.plural(openTasks, 'Aufgabe', 'Aufgaben') + '</span>' : '') +
          (p.due ? '<span class="chip">' + U.esc(U.fmtRelative(p.due)) + '</span>' : '') +
        '</div>' +
        (!goals.length && ['aktiv', 'geplant'].includes(p.status)
          ? '<div class="pc-orphan">Zahlt auf kein Ziel ein. Vielleicht ist dies eine Idee für später.</div>' : '') +
      '</button>' +
      '</article>';
  }

  function activeTab() {
    const max = S.state.settings.maxActiveProjects || 5;
    const active = S.activeProjects();
    const planned = S.projects({ status: ['geplant', 'idee'] });
    const paused = S.projects({ status: 'pausiert' });
    const finished = S.projects({ status: ['abgeschlossen', 'archiviert'] });

    return '<div class="spread" style="margin-bottom:26px">' +
        '<div class="count-line">' +
          '<span>Aktiv: ' + active.length + ' von ' + max + ' Projekten</span>' +
          '<span class="count-track">' + Array.from({ length: max }).map((_, i) =>
            '<i class="count-slot' + (i < active.length ? ' is-filled' : '') + '"></i>').join('') + '</span>' +
        '</div>' +
        '<button class="btn btn-sm" data-act="os.projectNew">Neues Projekt</button>' +
      '</div>' +

      (active.length >= max ? '<div class="note" style="margin-bottom:24px">Alle Plätze belegt. ' +
        'Wenn etwas Neues aktiv werden soll, pausiere zuerst ein Projekt.</div>' : '') +

      (active.length
        ? '<div class="grid grid-auto">' + active.map(projectCard).join('') + '</div>'
        : OS.ui.emptyState('Kein aktives Projekt',
          'Ein Projekt hat ein Ende und eine nächste Handlung. Mehr braucht es nicht.',
          '<button class="btn btn-sm" data-act="os.projectNew">Projekt anlegen</button>')) +

      (planned.length ? '<section class="section" style="margin-top:46px">' +
        '<div class="section-head"><h3>Geplant</h3></div>' +
        '<div class="grid grid-auto">' + planned.map(projectCard).join('') + '</div></section>' : '') +

      (paused.length ? '<section class="section">' +
        '<div class="section-head"><h3>Pausiert</h3></div>' +
        '<div class="grid grid-auto">' + paused.map(projectCard).join('') + '</div></section>' : '') +

      (finished.length ? '<section class="section">' +
        '<div class="section-head"><h3>Abgeschlossen</h3>' +
        '<button class="link-btn" data-act="ui.goArchive">Archiv</button></div>' +
        '<div class="list">' + finished.slice(0, 6).map(p =>
          '<div class="list-item"><div class="li-main">' +
            '<button class="li-title link-btn" data-act="os.projectOpen" data-id="' + p.id + '">' + U.esc(p.name) + '</button>' +
            '<div class="li-meta">' + OS.ui.statusChip(p.status) + OS.ui.areaChip(p.areaId) + '</div>' +
          '</div></div>').join('') + '</div></section>' : '');
  }

  /* --- B: Ideen & Backlog --------------------------------------------- */

  function ideaRow(idea) {
    return '<div class="idea-row">' +
      '<div class="idea-main">' +
        '<div class="li-title">' + U.esc(idea.title) + '</div>' +
        (idea.notes ? '<div class="small muted" style="margin-top:3px">' + U.esc(U.trunc(idea.notes, 120)) + '</div>' : '') +
        '<div class="li-meta" style="margin-top:6px">' +
          OS.ui.areaChip(idea.areaId) +
          '<span class="chip">' + U.esc(idea.priority) + '</span>' +
          (idea.tags || []).map(t => '<span class="chip">#' + U.esc(t) + '</span>').join('') +
        '</div>' +
      '</div>' +
      '<div class="li-actions">' +
        '<button class="btn btn-sm" data-act="projekte.ideaActivate" data-id="' + idea.id + '">Aktivieren</button>' +
        (idea.status === 'geparkt'
          ? '<button class="btn btn-sm btn-quiet" data-act="projekte.ideaStatus" data-id="' + idea.id + '" data-status="idee">Zurückholen</button>'
          : '<button class="btn btn-sm btn-quiet" data-act="projekte.ideaStatus" data-id="' + idea.id + '" data-status="geparkt">Parken</button>') +
        OS.ui.iconBtn('edit', 'projekte.ideaEdit', 'Bearbeiten', 'data-id="' + idea.id + '"') +
        OS.ui.iconBtn('archive', 'projekte.ideaStatus', 'Archivieren', 'data-id="' + idea.id + '" data-status="archiviert"') +
        OS.ui.iconBtn('trash', 'projekte.ideaDelete', 'Löschen', 'data-id="' + idea.id + '"') +
      '</div>' +
      '</div>';
  }

  function backlogTab() {
    const open = S.ideas({ status: 'idee' });
    const parked = S.ideas({ status: 'geparkt' });

    return '<div class="card" style="margin-bottom:34px">' +
        '<span class="overline">Schnell aufnehmen</span>' +
        '<div class="row" style="margin-top:12px;gap:8px;flex-wrap:nowrap">' +
          '<input class="input" data-idea-input placeholder="Eine Idee, ohne Verpflichtung" style="flex:1">' +
          '<button class="btn" data-act="projekte.ideaQuick">Aufnehmen</button>' +
        '</div>' +
        '<div class="field-help" style="margin-top:8px">Ideen sind keine Zusagen. Sie dürfen liegen bleiben.</div>' +
      '</div>' +

      '<section class="section">' +
        '<div class="section-head"><h3>Ideen</h3>' +
          '<span class="tiny muted">' + open.length + '</span></div>' +
        (open.length ? open.map(ideaRow).join('') : '<div class="empty">Noch keine Ideen aufgenommen.</div>') +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head"><h3>Später</h3></div>' +
        '<p class="small muted" style="margin-bottom:14px">Bewusst geparkt. Das ist ein guter Ort – kein Abstellgleis.</p>' +
        (parked.length
          ? '<div class="later-list">' + parked.map(ideaRow).join('') + '</div>'
          : '<div class="empty">Hier ist Platz für alles, was warten darf.</div>') +
      '</section>';
  }

  /* --- C: Ziele --------------------------------------------------------- */

  function goalRow(g) {
    const progress = S.goalProgress(g);
    const linked = S.projects({ goalId: g.id });
    return '<div class="card card-hover" style="margin-bottom:12px">' +
      '<div class="spread" style="align-items:flex-start;gap:20px">' +
        '<div style="flex:1;min-width:0">' +
          '<div class="row row-tight" style="margin-bottom:6px">' +
            '<span class="chip">' + U.esc(S.HORIZON_LABEL[g.horizon] || '') + '</span>' +
            OS.ui.areaChip(g.areaId) +
            '<span class="chip">' + U.esc(S.GOAL_STATUS_LABEL[g.status] || '') + '</span>' +
            (g.framework && g.framework.type !== 'frei'
              ? '<span class="chip chip-accent">' + U.esc((OS.frameworks[g.framework.type] || {}).label || '') + '</span>' : '') +
          '</div>' +
          '<button class="card-title link-btn" style="border:0" data-act="os.goalOpen" data-id="' + g.id + '">' + U.esc(g.title || 'Ohne Titel') + '</button>' +
          (g.metric ? '<div class="small muted" style="margin-top:6px">' + U.esc(U.trunc(g.metric, 150)) + '</div>' : '') +
          (linked.length ? '<div class="chips" style="margin-top:10px">' + linked.map(p =>
            '<button class="chip chip-btn" data-act="os.projectOpen" data-id="' + p.id + '">' + U.esc(U.trunc(p.name, 26)) + '</button>').join('') + '</div>'
            : '<div class="tiny muted" style="margin-top:10px">Ohne Projekt – das ist in Ordnung.</div>') +
        '</div>' +
        '<div style="width:120px;flex:0 0 auto">' +
          '<div class="tiny muted" style="text-align:right;margin-bottom:5px">' + progress + ' %</div>' +
          OS.ui.progressBar(progress) +
        '</div>' +
      '</div>' +
      '</div>';
  }

  function goalsTab(params) {
    const areaFilter = (params && params.a) || '';
    const all = S.goals().filter(g => !areaFilter || g.areaId === areaFilter);
    const groups = [
      { id: 'saison', label: 'Saison' },
      { id: 'jahr', label: 'Jahr' },
      { id: 'lang', label: 'Langfristig' }
    ];

    return '<div class="spread" style="margin-bottom:26px">' +
        '<div class="chips">' +
          '<a class="chip chip-btn' + (!areaFilter ? ' is-on' : '') + '" href="#/projekte?tab=ziele">Alle</a>' +
          S.areas().map(a => '<a class="chip chip-btn' + (areaFilter === a.id ? ' is-on' : '') +
            '" href="#/projekte?tab=ziele&a=' + a.id + '">' + U.esc(a.name) + '</a>').join('') +
        '</div>' +
        '<button class="btn btn-sm" data-act="os.goalNew">Neues Ziel</button>' +
      '</div>' +
      '<p class="small muted" style="margin-bottom:26px">Ziele sind keine Projekte. Sie beschreiben, was wahr sein soll – nicht, wie es geschieht.</p>' +
      groups.map(group => {
        const list = all.filter(g => g.horizon === group.id);
        if (!list.length) return '';
        return '<section class="section">' +
          '<div class="section-head"><h3>' + group.label + '</h3><span class="tiny muted">' + list.length + '</span></div>' +
          list.map(goalRow).join('') +
          '</section>';
      }).join('') +
      (!all.length ? OS.ui.emptyState('Noch keine Ziele',
        'Ein Ziel braucht einen Namen, ein Warum und eine Erfolgsdefinition. Vorlagen sind freiwillig.',
        '<button class="btn btn-sm" data-act="os.goalNew">Erstes Ziel</button>') : '');
  }

  /* --- D: 25/5-Methode ---------------------------------------------------- */

  function methodTab() {
    const m = S.state.method255;
    const wishes = S.wishes();
    const top = S.topWishes();
    const step = m.step || 1;
    const canStep2 = wishes.length >= 5;

    const steps = '<div class="steps">' +
      [
        { n: 1, label: 'Bis zu 25 Wünsche sammeln' },
        { n: 2, label: 'Die fünf wichtigsten markieren' },
        { n: 3, label: 'Die übrigen bewusst weglassen' }
      ].map(s => '<button class="step' + (step === s.n ? ' is-active' : step > s.n ? ' is-done' : '') + '" ' +
        'data-act="projekte.methodStep" data-step="' + s.n + '">' +
        '<span class="step-num">Schritt ' + s.n + '</span>' + s.label + '</button>').join('') +
      '</div>';

    let body = '';

    if (step === 1) {
      body = '<div class="card" style="margin-bottom:26px">' +
          '<span class="overline">Schritt 1</span>' +
          '<h3 style="margin-top:8px">Was willst du – höchstens 25 Dinge</h3>' +
          '<p class="small muted" style="margin-top:8px">Schreib ohne zu werten. Ziele, Wünsche, Vorhaben. ' +
          'Noch entscheidest du nichts.</p>' +
          '<div class="row" style="margin-top:16px;gap:8px;flex-wrap:nowrap">' +
            '<input class="input" data-wish-input placeholder="Wunsch oder Ziel" style="flex:1"' +
              (wishes.length >= 25 ? ' disabled' : '') + '>' +
            '<button class="btn" data-act="projekte.wishAdd"' + (wishes.length >= 25 ? ' disabled' : '') + '>Hinzufügen</button>' +
          '</div>' +
          '<div class="field-help" style="margin-top:8px">' + wishes.length + ' von 25' +
            (wishes.length >= 25 ? ' – die Liste ist voll. Das ist Absicht.' : '') + '</div>' +
        '</div>' +
        wishList(false) +
        (canStep2 ? '<div class="row" style="margin-top:26px;justify-content:flex-end">' +
          '<button class="btn btn-primary btn-sm" data-act="projekte.methodStep" data-step="2">Weiter zu den fünf wichtigsten</button></div>' : '');
    }

    if (step === 2) {
      body = '<div class="card" style="margin-bottom:26px">' +
          '<span class="overline">Schritt 2</span>' +
          '<h3 style="margin-top:8px">Markiere die fünf wichtigsten</h3>' +
          '<p class="small muted" style="margin-top:8px">Nicht die dringendsten. Die, die dein Leben am meisten verändern.</p>' +
          '<div class="field-help" style="margin-top:10px">' + top.length + ' von 5 markiert</div>' +
        '</div>' +
        wishList(true) +
        '<div class="row" style="margin-top:26px;justify-content:flex-end">' +
          '<button class="btn btn-primary btn-sm" data-act="projekte.methodStep" data-step="3"' +
            (top.length ? '' : ' disabled') + '>Weiter</button>' +
        '</div>';
    }

    if (step === 3) {
      const avoid = S.avoidWishes();
      body = '<div class="grid grid-2" style="align-items:start">' +
          '<section class="section">' +
            '<div class="section-head"><h3>Deine fünf</h3><span class="tiny muted">' + top.length + '</span></div>' +
            (top.length ? top.map(w =>
              '<div class="wish-row is-top">' +
                '<span class="star is-on">' + U.icons.star + '</span>' +
                '<span class="wish-text">' + U.esc(w.text) + '</span>' +
                '<button class="btn btn-sm" data-act="projekte.wishToGoal" data-id="' + w.id + '">Zu Saisonziel</button>' +
              '</div>').join('') : '<div class="empty">Noch nichts markiert.</div>') +
            '<div class="note note-accent" style="margin-top:18px">Aktiviere höchstens ein bis zwei dieser Ziele in einer Saison. ' +
            'Die anderen warten – sie sind nicht verloren.</div>' +
          '</section>' +
          '<section class="section">' +
            '<div class="section-head"><h3>Vermeiden – nicht jetzt</h3><span class="tiny muted">' + avoid.length + '</span></div>' +
            '<p class="small muted" style="margin-bottom:14px">Diese Liste ist der eigentliche Gewinn der Methode. ' +
            'Sie erscheint bewusst nicht in Tag und Woche.</p>' +
            (avoid.length ? avoid.map(w =>
              '<div class="wish-row is-avoid"><span class="wish-text">' + U.esc(w.text) + '</span>' +
              OS.ui.iconBtn('archive', 'projekte.wishToIdea', 'In Ideen ablegen', 'data-id="' + w.id + '"') + '</div>').join('')
              : '<div class="empty">Keine weiteren Wünsche.</div>') +
          '</section>' +
        '</div>';
    }

    return steps + body +
      '<div class="row" style="margin-top:40px;justify-content:flex-end">' +
        (wishes.length ? '<button class="btn btn-quiet btn-sm" data-act="projekte.methodReset">Liste zurücksetzen</button>' : '') +
      '</div>';
  }

  function wishList(selectable) {
    const wishes = S.wishes();
    if (!wishes.length) return '<div class="empty">Noch nichts gesammelt.</div>';
    const top = S.topWishes().length;
    return '<div class="wish-grid">' + wishes.map((w, i) =>
      '<div class="wish-row' + (w.top ? ' is-top' : '') + '">' +
        '<span class="wish-num">' + U.pad2(i + 1) + '</span>' +
        (selectable
          ? '<button class="star' + (w.top ? ' is-on' : '') + '" data-act="projekte.wishToggle" data-id="' + w.id + '"' +
            (!w.top && top >= 5 ? ' disabled title="Fünf sind markiert"' : '') + '>' +
            (w.top ? U.icons.star : U.icons.starOutline) + '</button>'
          : '') +
        '<input class="line-input wish-text" value="' + U.esc(w.text) + '" data-store="wish:' + w.id + ':text">' +
        OS.ui.iconBtn('trash', 'projekte.wishRemove', 'Entfernen', 'data-id="' + w.id + '"') +
      '</div>').join('') + '</div>';
  }

  /* --- E: Frameworks -------------------------------------------------------- */

  function frameworksTab() {
    return '<p class="lede" style="max-width:60ch;margin-bottom:34px">Vorlagen helfen beim Denken. ' +
      'Keine ist verpflichtend. Jede lässt sich nach dem Ausfüllen zu einer einfachen, lesbaren Zielkarte zusammenfassen.</p>' +
      '<div class="grid grid-auto">' +
      Object.keys(OS.frameworks).filter(k => k !== 'frei').map(key => {
        const fw = OS.frameworks[key];
        return '<article class="card fw-card">' +
          '<div class="fw-name">' + U.esc(fw.label) + '</div>' +
          '<div class="fw-desc">' + U.esc(fw.desc) + '</div>' +
          '<ul>' + fw.fields.map(f => '<li>' + U.esc(f.label) + '</li>').join('') + '</ul>' +
          '<button class="btn btn-sm" style="margin-top:auto" data-act="projekte.goalWithFramework" data-fw="' + key + '">' +
            'Ziel mit dieser Vorlage</button>' +
          '</article>';
      }).join('') +
      '<article class="card card-quiet fw-card">' +
        '<div class="fw-name">Ohne Vorlage</div>' +
        '<div class="fw-desc">Name, Warum, Erfolgsdefinition. Oft genügt das vollkommen.</div>' +
        '<button class="btn btn-sm" style="margin-top:auto" data-act="os.goalNew">Freies Ziel</button>' +
      '</article>' +
      '</div>';
  }

  /* --- Rendern ---------------------------------------------------------------- */

  function render(params) {
    const tab = tabOf(params);
    const head = '<div class="page-head">' +
      '<span class="overline">Projekte &amp; Ziele</span>' +
      '<h1 style="margin-top:12px">Strategische Ebene</h1>' +
      '<div class="page-sub">Hier entscheidest du, woran gearbeitet wird – und woran bewusst nicht.</div>' +
      '</div>';

    let body = '';
    if (tab === 'aktiv') body = activeTab();
    else if (tab === 'backlog') body = backlogTab();
    else if (tab === 'ziele') body = goalsTab(params);
    else if (tab === 'methode') body = methodTab();
    else if (tab === 'frameworks') body = frameworksTab();

    return head + tabs(tab) + body;
  }

  function mount(root) {
    const ideaInput = root.querySelector('[data-idea-input]');
    if (ideaInput) ideaInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') actions['projekte.ideaQuick']();
    });
    const wishInput = root.querySelector('[data-wish-input]');
    if (wishInput) wishInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') actions['projekte.wishAdd']();
    });
  }

  /* --- Aktionen ---------------------------------------------------------------- */

  const actions = {
    'projekte.ideaQuick': function () {
      const input = document.querySelector('[data-idea-input]');
      if (!input) return;
      const title = input.value.trim();
      if (!title) return;
      S.update(() => S.addIdea({ title: title }));
    },
    'projekte.ideaEdit': function (el, ds) { OS.forms.idea(ds.id); },
    'projekte.ideaStatus': function (el, ds) {
      S.update(() => {
        const i = S.find('idea', ds.id);
        if (i) i.status = ds.status;
      });
    },
    'projekte.ideaDelete': async function (el, ds) {
      const ok = await OS.ui.confirm({ title: 'Idee löschen?', text: 'Sie wird endgültig entfernt.', confirmLabel: 'Löschen', tone: 'danger' });
      if (ok) S.update(() => S.remove('idea', ds.id));
    },
    'projekte.ideaActivate': function (el, ds) {
      const i = S.find('idea', ds.id);
      if (!i) return;
      OS.forms.project({ name: i.title, why: i.notes, areaId: i.areaId });
      S.update(() => { i.status = 'archiviert'; });
    },

    'projekte.methodStep': function (el, ds) {
      S.update(() => { S.state.method255.step = Number(ds.step) || 1; });
    },
    'projekte.wishAdd': function () {
      const input = document.querySelector('[data-wish-input]');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      if (S.wishes().length >= 25) { OS.ui.toast('25 sind genug.'); return; }
      S.update(() => {
        S.state.method255.wishes.push({ id: U.uid('w'), text: text, top: false, createdAt: new Date().toISOString() });
      });
    },
    'projekte.wishToggle': function (el, ds) {
      S.update(() => {
        const w = S.find('wish', ds.id);
        if (!w) return;
        if (!w.top && S.topWishes().length >= 5) return;
        w.top = !w.top;
      });
    },
    'projekte.wishRemove': function (el, ds) {
      S.update(() => {
        const list = S.state.method255.wishes;
        const i = list.findIndex(w => w.id === ds.id);
        if (i >= 0) list.splice(i, 1);
      });
    },
    'projekte.wishToGoal': function (el, ds) {
      const w = S.find('wish', ds.id);
      if (!w) return;
      const season = S.currentSeason();
      OS.forms.goal({
        title: w.text, horizon: 'saison', seasonId: season ? season.id : null, fromWishId: w.id
      });
    },
    'projekte.wishToIdea': function (el, ds) {
      const w = S.find('wish', ds.id);
      if (!w) return;
      S.update(() => S.addIdea({ title: w.text, notes: 'Aus der 25/5-Liste.' }));
      OS.ui.toast('In Ideen abgelegt. In der 25/5-Liste bleibt der Eintrag sichtbar.');
    },
    'projekte.methodReset': async function () {
      const ok = await OS.ui.confirm({
        title: 'Liste zurücksetzen?',
        text: 'Alle 25 Einträge werden gelöscht. Bereits erstellte Ziele bleiben bestehen.',
        confirmLabel: 'Zurücksetzen', tone: 'danger'
      });
      if (!ok) return;
      S.update(() => { S.state.method255 = { wishes: [], step: 1, completedAt: null }; });
    },

    'projekte.goalWithFramework': function (el, ds) {
      OS.forms.goal({ framework: ds.fw });
    }
  };

  return { render: render, mount: mount, actions: actions, title: 'Projekte & Ziele' };
})();
