/* ===========================================================
   OS — Ansicht: Review & System
   Hält das System lebendig und verhindert Überladung.
   =========================================================== */

OS.views.system = (function () {
  'use strict';

  const U = OS.util;
  const S = OS.store;

  const TABS = [
    { id: 'review', label: 'Reviews' },
    { id: 'bereiche', label: 'Lebensbereiche' },
    { id: 'gewohnheiten', label: 'Gewohnheiten' },
    { id: 'vorlagen', label: 'Vorlagen' },
    { id: 'daten', label: 'Daten' },
    { id: 'archiv', label: 'Archiv' }
  ];

  const WEEK_QUESTIONS = [
    { key: 'gelungen', text: 'Was ist gelungen?' },
    { key: 'offen', text: 'Was blieb offen – und warum?' },
    { key: 'energie', text: 'Was hat Energie gegeben oder gezogen?' },
    { key: 'wichtig', text: 'Was ist nächste Woche wirklich wichtig?' },
    { key: 'warten', text: 'Was darf warten?' }
  ];

  const SEASON_QUESTIONS = [
    { key: 'rueckblick', text: 'Was hat diese Saison getragen?' },
    { key: 'ziele', text: 'Welche Ziele sind erreicht – und welche nicht?' },
    { key: 'gelernt', text: 'Was hast du über dich gelernt?' },
    { key: 'loslassen', text: 'Was lässt du bewusst los?' },
    { key: 'naechste', text: 'Worauf richtet sich die nächste Saison?' }
  ];

  function tabOf(params) {
    const t = params && params.tab;
    return TABS.some(x => x.id === t) ? t : 'review';
  }

  function tabs(active) {
    return '<div class="tabs">' + TABS.map(t =>
      '<a class="tab' + (t.id === active ? ' is-active' : '') + '" href="#/system?tab=' + t.id + '">' +
      U.esc(t.label) + '</a>').join('') + '</div>';
  }

  /* --- Review-Dialoge -------------------------------------------------- */

  function reviewModal(opts) {
    const o = opts || {};
    const existing = o.reviewId ? S.find('review', o.reviewId) : null;
    const questions = o.questions;
    const answers = existing ? existing.answers : {};

    const goalRows = (o.goals || []).map(g =>
      '<div class="list-item"><div class="li-main">' +
        '<div class="li-title">' + U.esc(g.title || 'Ohne Titel') + '</div>' +
        '<div class="li-meta"><span class="tiny muted">' + S.goalProgress(g) + ' %</span></div>' +
      '</div>' +
      '<select class="select" style="width:auto" data-goal-rating="' + g.id + '">' +
        Object.keys(S.GOAL_STATUS_LABEL).map(s =>
          '<option value="' + s + '"' + ((existing && existing.goalRatings[g.id] === s) || (!existing && g.status === s) ? ' selected' : '') + '>' +
          S.GOAL_STATUS_LABEL[s] + '</option>').join('') +
      '</select></div>').join('');

    const projectRows = (o.projects || []).map(p =>
      '<div class="list-item"><div class="li-main">' +
        '<div class="li-title">' + U.esc(p.name) + '</div>' +
        '<div class="li-meta">' + OS.ui.statusChip(p.status) + '</div>' +
      '</div>' +
      '<select class="select" style="width:auto" data-project-status="' + p.id + '">' +
        S.PROJECT_STATUS.map(s => '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' +
          S.PROJECT_STATUS_LABEL[s] + '</option>').join('') +
      '</select></div>').join('');

    OS.ui.modal({
      title: o.title,
      subtitle: o.subtitle,
      size: 'lg',
      body: '<div class="stack" style="gap:4px">' +
        questions.map((q, i) =>
          '<div class="q-block">' +
            '<div class="q-text"><span class="q-num">' + U.pad2(i + 1) + '</span>' + U.esc(q.text) + '</div>' +
            '<textarea class="textarea" rows="3" data-answer="' + q.key + '" placeholder="In Ruhe. Stichworte genügen.">' +
              U.esc(answers[q.key] || '') + '</textarea>' +
          '</div>').join('') +
        (goalRows ? '<div class="field" style="margin-top:10px"><span class="field-label">Ziele bewerten</span>' +
          '<div class="list">' + goalRows + '</div></div>' : '') +
        (projectRows ? '<div class="field" style="margin-top:20px"><span class="field-label">Projekte fortführen, pausieren, beenden</span>' +
          '<div class="list">' + projectRows + '</div></div>' : '') +
        '</div>',
      footer: '<button class="btn" data-modal-close type="button">Abbrechen</button>' +
        '<button class="btn btn-primary" data-save type="button">Review speichern</button>',
      onMount: function (root, api) {
        root.querySelector('[data-save]').addEventListener('click', () => {
          const values = {};
          root.querySelectorAll('[data-answer]').forEach(el => { values[el.getAttribute('data-answer')] = el.value; });
          const ratings = {};
          root.querySelectorAll('[data-goal-rating]').forEach(el => { ratings[el.getAttribute('data-goal-rating')] = el.value; });
          const projectStatus = {};
          root.querySelectorAll('[data-project-status]').forEach(el => { projectStatus[el.getAttribute('data-project-status')] = el.value; });

          S.update(() => {
            const target = existing || S.addReview({ type: o.type, periodKey: o.periodKey, seasonId: o.seasonId || null });
            if (o.type === 'eigen') {
              target.title = o.title;
              target.templateId = o.templateId || null;
              target.questions = questions;
            }
            target.answers = values;
            target.goalRatings = ratings;
            Object.keys(ratings).forEach(gid => {
              const g = S.find('goal', gid);
              if (g) g.status = ratings[gid];
            });
            Object.keys(projectStatus).forEach(pid => {
              const p = S.find('project', pid);
              if (p) p.status = projectStatus[pid];
            });
          });
          api.close();
          OS.ui.toast('Review gespeichert.');
        });
      }
    });
  }

  function weekReview(wKey) {
    const key = wKey || U.weekKey(U.today());
    const existing = S.reviews('woche').find(r => r.periodKey === key);
    const days = U.weekDays(key);
    const done = S.state.tasks.filter(t => t.status === 'done' && t.date && days.includes(t.date));

    reviewModal({
      title: 'Wochenreview · KW ' + U.weekNumber(key),
      subtitle: U.fmtShort(days[0]) + ' – ' + U.fmtShort(days[6]) +
        (done.length ? ' · ' + done.length + ' ' + U.plural(done.length, 'Aufgabe', 'Aufgaben') + ' erledigt' : ''),
      type: 'woche',
      periodKey: key,
      questions: WEEK_QUESTIONS,
      reviewId: existing ? existing.id : null
    });
  }

  function seasonReview(seasonId, type) {
    const season = S.find('season', seasonId) || S.currentSeason();
    if (!season) { OS.ui.toast('Es gibt noch keine Saison.'); return; }
    const isMid = type === 'mid';
    const existing = S.reviews().find(r => r.seasonId === season.id && r.type === (isMid ? 'mid' : 'saison'));
    const p = S.seasonProgress(season);

    reviewModal({
      title: (isMid ? 'Mid-Season-Review' : 'Saisonreview') + ' · ' + (season.title || 'Saison'),
      subtitle: 'Woche ' + p.week + ' von ' + p.weeks,
      type: isMid ? 'mid' : 'saison',
      periodKey: season.id,
      seasonId: season.id,
      questions: isMid
        ? [{ key: 'stand', text: 'Wo stehst du – ehrlich?' }].concat(SEASON_QUESTIONS.slice(1, 4))
        : SEASON_QUESTIONS,
      goals: S.seasonGoals(season.id),
      projects: isMid ? [] : S.projects({ live: true }),
      reviewId: existing ? existing.id : null
    });
  }

  function reviewLabel(r) {
    if (r.type === 'woche') return 'Wochenreview · KW ' + U.weekNumber(r.periodKey);
    if (r.type === 'mid') return 'Mid-Season-Review';
    if (r.type === 'eigen') return r.title || 'Eigenes Review';
    return 'Saisonreview';
  }

  function openReview(id) {
    const r = S.find('review', id);
    if (!r) return;
    const questions = Array.isArray(r.questions) && r.questions.length
      ? r.questions
      : (r.type === 'woche' ? WEEK_QUESTIONS : SEASON_QUESTIONS);
    OS.ui.modal({
      title: reviewLabel(r),
      subtitle: U.fmtMedium(r.createdAt.slice(0, 10)),
      size: 'lg',
      body: '<div class="stack" style="gap:18px">' +
        questions.filter(q => (r.answers[q.key] || '').trim()).map(q =>
          '<div class="re-qa"><div class="re-q">' + U.esc(q.text) + '</div>' +
          '<div class="re-a">' + U.esc(r.answers[q.key]) + '</div></div>').join('') +
        (Object.keys(r.answers).every(k => !(r.answers[k] || '').trim()) ? '<div class="empty">Dieses Review ist leer geblieben.</div>' : '') +
        '</div>',
      footer: '<button class="btn btn-quiet btn-sm" data-del type="button">Löschen</button>' +
        '<button class="btn" data-modal-close type="button">Schließen</button>',
      onMount: function (root, api) {
        root.querySelector('[data-del]').addEventListener('click', async () => {
          const ok = await OS.ui.confirm({ title: 'Review löschen?', text: 'Der Eintrag wird entfernt.', confirmLabel: 'Löschen', tone: 'danger' });
          if (ok) { S.update(() => S.remove('review', id)); api.close(); }
        });
      }
    });
  }

  /* --- Tab: Reviews ------------------------------------------------------ */

  function reviewTab() {
    const list = S.reviews();
    const wKey = U.weekKey(U.today());
    const season = S.currentSeason();
    const hasWeek = S.reviews('woche').some(r => r.periodKey === wKey);

    return '<div class="grid grid-2" style="align-items:start;margin-bottom:40px">' +
        '<div class="card">' +
          '<span class="overline">Wöchentlich</span>' +
          '<h3 style="margin-top:8px">Wochenreview</h3>' +
          '<p class="small muted" style="margin-top:8px">Fünf Fragen, zehn Minuten. Der Rhythmus zählt mehr als die Länge.</p>' +
          '<div class="row" style="margin-top:16px">' +
            '<button class="btn btn-sm btn-primary" data-act="system.weekReview">' +
              (hasWeek ? 'Review dieser Woche öffnen' : 'Review für KW ' + U.weekNumber(wKey)) + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<span class="overline">Je Saison</span>' +
          '<h3 style="margin-top:8px">Saisonreview</h3>' +
          '<p class="small muted" style="margin-top:8px">Ziele bewerten, Projekte beenden oder pausieren, die nächste Saison vorbereiten.</p>' +
          '<div class="row" style="margin-top:16px">' +
            '<button class="btn btn-sm" data-act="system.seasonReview" data-type="mid"' + (season ? '' : ' disabled') + '>Mid-Season</button>' +
            '<button class="btn btn-sm btn-primary" data-act="system.seasonReview" data-type="ende"' + (season ? '' : ' disabled') + '>Saison abschließen</button>' +
          '</div>' +
          (!season ? '<div class="field-help" style="margin-top:10px">Noch keine Saison angelegt.</div>' : '') +
        '</div>' +
      '</div>' +

      (S.state.templates.filter(t => t.kind === 'review').length
        ? '<section class="section">' +
          '<div class="section-head"><h3>Eigene Reviewvorlagen</h3>' +
            '<button class="link-btn" data-act="ui.goTemplates">Verwalten</button></div>' +
          '<div class="row">' + S.state.templates.filter(t => t.kind === 'review').map(t =>
            '<button class="btn btn-sm" data-act="system.templateUse" data-id="' + t.id + '">' + U.esc(t.name) + '</button>').join('') +
          '</div>' +
        '</section>'
        : '') +

      '<section class="section">' +
        '<div class="section-head"><h3>Frühere Reviews</h3><span class="tiny muted">' + list.length + '</span></div>' +
        (list.length ? list.map(r => {
          const label = reviewLabel(r);
          const first = Object.keys(r.answers).map(k => r.answers[k]).find(v => (v || '').trim());
          return '<div class="review-entry">' +
            '<div class="re-head">' +
              '<button class="link-btn" style="font-size:15px" data-act="system.openReview" data-id="' + r.id + '">' + label + '</button>' +
              '<span class="tiny muted">' + U.esc(U.fmtMedium(r.createdAt.slice(0, 10))) + '</span>' +
            '</div>' +
            (first ? '<div class="small muted" style="margin-top:6px">' + U.esc(U.trunc(first, 140)) + '</div>' : '') +
            '</div>';
        }).join('') : '<div class="empty">Noch keine Reviews. Das erste ist meist das kürzeste.</div>') +
      '</section>';
  }

  /* --- Tab: Lebensbereiche ------------------------------------------------- */

  function areaTab() {
    const active = S.areas();
    const archived = S.state.areas.filter(a => a.archived);

    return '<p class="lede" style="max-width:60ch;margin-bottom:26px">Lebensbereiche sind die Bühne, nicht das Stück. ' +
      'Sie werden nie erledigt – Ziele und Projekte zahlen auf sie ein.</p>' +

      '<div class="row" style="margin-bottom:20px">' +
        '<button class="btn btn-sm" data-act="os.areaNew">Bereich anlegen</button>' +
        (!S.state.areas.length ? '<button class="btn btn-sm btn-quiet" data-act="system.areaSuggest">Neutrale Vorschläge einfügen</button>' : '') +
      '</div>' +

      (active.length ? '<div class="card">' + active.map((a, i) =>
        '<div class="manage-row">' +
          '<div class="mr-main">' +
            '<span class="color-dot" style="background:' + U.esc(a.color) + '"></span>' +
            '<input class="line-input" value="' + U.esc(a.name) + '" data-store="area:' + a.id + ':name">' +
          '</div>' +
          '<span class="tiny muted">' + S.projects({ areaId: a.id }).length + ' Projekte · ' +
            S.goals({ areaId: a.id }).length + ' Ziele</span>' +
          '<div class="li-actions">' +
            OS.ui.iconBtn('chevronL', 'system.areaMove', 'Nach oben', 'data-id="' + a.id + '" data-dir="-1"') +
            OS.ui.iconBtn('chevronR', 'system.areaMove', 'Nach unten', 'data-id="' + a.id + '" data-dir="1"') +
            OS.ui.iconBtn('edit', 'system.areaEdit', 'Bearbeiten', 'data-id="' + a.id + '"') +
            OS.ui.iconBtn('archive', 'system.areaArchive', 'Archivieren', 'data-id="' + a.id + '"') +
          '</div>' +
        '</div>').join('') + '</div>'
        : OS.ui.emptyState('Noch keine Lebensbereiche',
          'Lege die Bereiche an, die dein Leben beschreiben. Fünf bis acht genügen meistens.')) +

      (archived.length ? '<section class="section" style="margin-top:40px">' +
        '<div class="section-head"><h3>Archiviert</h3></div>' +
        '<div class="card card-quiet">' + archived.map(a =>
          '<div class="manage-row"><div class="mr-main"><span class="color-dot" style="background:' + U.esc(a.color) + '"></span>' +
          '<span class="muted">' + U.esc(a.name) + '</span></div>' +
          '<button class="btn btn-sm" data-act="system.areaRestore" data-id="' + a.id + '">Zurückholen</button></div>').join('') +
        '</div></section>' : '');
  }

  /* --- Tab: Gewohnheiten ---------------------------------------------------- */

  function habitTab() {
    const active = S.habits();
    const archived = S.state.habits.filter(h => h.archived);
    const days = U.weekDays(U.weekKey(U.today()));

    return '<p class="lede" style="max-width:60ch;margin-bottom:26px">Gewohnheiten sind klein und wiederholbar. ' +
      'Es gibt keine Serien und keine Strafen – nur eine ruhige Übersicht.</p>' +

      '<div class="row" style="margin-bottom:20px">' +
        '<button class="btn btn-sm" data-act="os.habitNew">Gewohnheit anlegen</button>' +
      '</div>' +

      (active.length ? '<div class="card">' + active.map(h => {
        const count = days.filter(k => S.habitDone(h, k)).length;
        return '<div class="manage-row">' +
          '<div class="mr-main">' +
            '<input class="line-input" value="' + U.esc(h.name) + '" data-store="habit:' + h.id + ':name">' +
          '</div>' +
          '<span class="tiny muted">' + count + '/7 diese Woche · ' + Object.keys(h.log || {}).length + ' gesamt</span>' +
          '<div class="li-actions">' +
            OS.ui.iconBtn('chevronL', 'system.habitMove', 'Nach oben', 'data-id="' + h.id + '" data-dir="-1"') +
            OS.ui.iconBtn('chevronR', 'system.habitMove', 'Nach unten', 'data-id="' + h.id + '" data-dir="1"') +
            OS.ui.iconBtn('archive', 'system.habitArchive', 'Archivieren', 'data-id="' + h.id + '"') +
            OS.ui.iconBtn('trash', 'system.habitDelete', 'Löschen', 'data-id="' + h.id + '"') +
          '</div>' +
        '</div>';
      }).join('') + '</div>'
        : OS.ui.emptyState('Noch keine Gewohnheiten', 'Eine oder zwei genügen für den Anfang.')) +

      (archived.length ? '<section class="section" style="margin-top:40px">' +
        '<div class="section-head"><h3>Archiviert</h3></div>' +
        '<div class="card card-quiet">' + archived.map(h =>
          '<div class="manage-row"><div class="mr-main"><span class="muted">' + U.esc(h.name) + '</span></div>' +
          '<button class="btn btn-sm" data-act="system.habitRestore" data-id="' + h.id + '">Zurückholen</button></div>').join('') +
        '</div></section>' : '');
  }

  /* --- Vorlagen --------------------------------------------------------------- */

  function parseQuestions(text) {
    return String(text || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, i) => ({ key: 'q' + (i + 1), text: line }));
  }

  const TEMPLATE_KIND_LABEL = { ziel: 'Zielvorlage', projekt: 'Projektvorlage', review: 'Reviewvorlage' };

  function templateDialog(kind, id) {
    const existing = id ? S.find('template', id) : null;
    const p = (existing && existing.payload) || {};

    const byKind = {
      ziel: [
        { name: 'title', label: 'Ziel', value: p.title || '', placeholder: 'Vorformulierter Zieltext' },
        { name: 'why', type: 'textarea', rows: 2, label: 'Warum', value: p.why || '' },
        { name: 'metric', type: 'textarea', rows: 2, label: 'Erfolgsdefinition', value: p.metric || '' },
        {
          type: 'row', fields: [
            {
              name: 'horizon', type: 'select', label: 'Zeithorizont', value: p.horizon || 'saison',
              options: Object.keys(S.HORIZON_LABEL).map(h => ({ value: h, label: S.HORIZON_LABEL[h] }))
            },
            {
              name: 'framework', type: 'select', label: 'Vorlage', value: p.framework || 'frei',
              options: Object.keys(OS.frameworks).map(k => ({ value: k, label: OS.frameworks[k].label }))
            }
          ]
        }
      ],
      projekt: [
        { name: 'projectName', label: 'Projektname', value: p.name || '', placeholder: 'z. B. Kurs vorbereiten' },
        { name: 'why', type: 'textarea', rows: 2, label: 'Warum', value: p.why || '' },
        { name: 'outcome', type: 'textarea', rows: 2, label: 'Gewünschtes Ergebnis', value: p.outcome || '' },
        { name: 'nextAction', label: 'Nächste konkrete Handlung', value: p.nextAction || '' }
      ],
      review: [
        {
          name: 'questions', type: 'textarea', rows: 6, label: 'Fragen',
          value: p.questions || '', placeholder: 'Eine Frage pro Zeile',
          help: 'Jede Zeile wird zu einer Frage mit eigenem Antwortfeld.'
        }
      ]
    };

    OS.ui.form({
      title: existing ? existing.name : ('Neue ' + TEMPLATE_KIND_LABEL[kind]),
      subtitle: 'Vorlagen füllen ein Formular vor. Alles bleibt änderbar.',
      submitLabel: existing ? 'Speichern' : 'Anlegen',
      fields: [
        { name: 'name', label: 'Name der Vorlage', value: existing ? existing.name : '', autofocus: true, placeholder: 'Wofür ist sie da?' },
        { type: 'section', label: TEMPLATE_KIND_LABEL[kind] }
      ].concat(byKind[kind] || []),
      onSubmit: function (v) {
        const name = String(v.name || '').trim();
        if (!name) { OS.ui.toast('Die Vorlage braucht einen Namen.'); return false; }
        const payload = {};
        Object.keys(v).forEach(k => { if (k !== 'name') payload[k] = v[k]; });
        if (kind === 'projekt') {
          payload.name = payload.projectName || '';
          delete payload.projectName;
        }
        S.update(() => {
          const target = existing || S.addTemplate({ kind: kind });
          target.name = name;
          target.kind = kind;
          target.payload = Object.assign({}, payload);
        });
      }
    });
  }

  /* --- Tab: Vorlagen --------------------------------------------------------- */

  function templateTab() {
    const groups = [
      { kind: 'ziel', label: 'Ziele' },
      { kind: 'projekt', label: 'Projekte' },
      { kind: 'review', label: 'Reviews' }
    ];

    return '<p class="lede" style="max-width:60ch;margin-bottom:26px">Eigene Vorlagen für wiederkehrende Ziele, Projekte und Reviews. ' +
      'Sie füllen ein Formular vor – mehr nicht.</p>' +

      '<div class="row" style="margin-bottom:26px">' +
        '<button class="btn btn-sm" data-act="system.templateNew" data-kind="ziel">Zielvorlage</button>' +
        '<button class="btn btn-sm" data-act="system.templateNew" data-kind="projekt">Projektvorlage</button>' +
        '<button class="btn btn-sm" data-act="system.templateNew" data-kind="review">Reviewvorlage</button>' +
      '</div>' +

      groups.map(g => {
        const list = S.state.templates.filter(t => t.kind === g.kind);
        if (!list.length) return '';
        return '<section class="section">' +
          '<div class="section-head"><h3>' + g.label + '</h3></div>' +
          '<div class="card">' + list.map(t => {
            const p = t.payload || {};
            const preview = t.kind === 'review'
              ? parseQuestions(p.questions).length + ' ' + U.plural(parseQuestions(p.questions).length, 'Frage', 'Fragen')
              : U.trunc(p.title || p.name || '', 52);
            return '<div class="manage-row">' +
              '<div class="mr-main is-stacked"><span>' + U.esc(t.name) + '</span>' +
                (preview ? '<span class="tiny muted">' + U.esc(preview) + '</span>' : '') +
              '</div>' +
              '<div class="row row-tight">' +
                '<button class="btn btn-sm" data-act="system.templateUse" data-id="' + t.id + '">Verwenden</button>' +
                OS.ui.iconBtn('edit', 'system.templateEdit', 'Bearbeiten', 'data-id="' + t.id + '"') +
                OS.ui.iconBtn('trash', 'system.templateDelete', 'Löschen', 'data-id="' + t.id + '"') +
              '</div>' +
            '</div>';
          }).join('') + '</div>' +
          '</section>';
      }).join('') +

      (!S.state.templates.length ? OS.ui.emptyState('Noch keine Vorlagen',
        'Vorlagen entstehen aus Wiederholung. Leg eine an, wenn dir eine Struktur zweimal begegnet ist.') : '');
  }

  /* --- Tab: Daten ------------------------------------------------------------- */

  /* --- Kopplung ---------------------------------------------------------------- */

  const SYNC_LABEL = {
    aus: 'Nicht eingerichtet',
    verbindet: 'Verbindet …',
    anmeldung: 'Anmeldung nötig',
    abgleich: 'Gleicht ab …',
    gekoppelt: 'Gekoppelt',
    fehler: 'Unterbrochen'
  };

  function syncSection() {
    const sync = OS.sync;
    const status = sync.status;
    const backup = sync.backupTime();

    let body = '';

    // In eingebetteten Umgebungen sind Verbindungen nach außen gesperrt.
    if (window.claude && typeof window.claude.use === 'function') {
      return '<section class="section">' +
        '<div class="section-head"><h2>Geräte</h2></div>' +
        '<div class="note note-quiet">Hier ist keine Kopplung möglich, weil diese Umgebung keine Verbindungen ' +
        'zu fremden Servern zulässt. Nutze dafür die installierte Fassung. ' +
        'Export und Import funktionieren auch hier.</div>' +
        '</section>';
    }

    if (status === 'aus') {
      body = '<p class="small muted" style="margin-bottom:14px">Ohne Kopplung bleibt jedes Gerät für sich. ' +
        'Mit Kopplung sehen iPhone und Mac denselben Stand.</p>' +
        '<button class="btn btn-sm" data-act="system.syncSetup">Kopplung einrichten</button>';
    } else if (status === 'anmeldung') {
      body = '<p class="small muted" style="margin-bottom:14px">Melde dich an. ' +
        'Auf dem zweiten Gerät nimmst du dieselben Angaben, dann laufen beide zusammen.</p>' +
        '<div class="stack" style="gap:8px;max-width:420px">' +
          '<input class="input" type="email" data-sync-mail placeholder="deine@adresse.de" autocomplete="username">' +
          '<input class="input" type="password" data-sync-pass placeholder="Passwort" autocomplete="current-password">' +
          '<button class="btn btn-sm btn-primary" data-act="system.syncPassword" style="align-self:flex-start">Anmelden</button>' +
        '</div>' +
        '<div class="field-help" style="margin-top:12px">Das Konto legst du einmal in deinem Supabase-Projekt an, ' +
        'unter Authentication, Users, Add user. Dort das Häkchen bei Auto Confirm User setzen.</div>' +
        '<div class="row" style="margin-top:12px;gap:16px">' +
          '<button class="link-btn" data-act="system.syncLogin">Stattdessen Link per E-Mail</button>' +
          '<button class="link-btn" data-act="system.syncSetup">Zugangsdaten ändern</button>' +
        '</div>';
    } else if (status === 'gekoppelt' || status === 'abgleich') {
      body = '<div class="stack" style="gap:10px">' +
        '<div class="small">Angemeldet als ' + U.esc(sync.email || '—') + '</div>' +
        (sync.lastSync ? '<div class="tiny muted">Zuletzt abgeglichen um ' +
          U.esc(new Date(sync.lastSync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })) + ' Uhr</div>' : '') +
        '<div class="row" style="margin-top:6px">' +
          '<button class="btn btn-sm" data-act="system.syncNow">Jetzt abgleichen</button>' +
          '<button class="btn btn-sm btn-quiet" data-act="system.syncLogout">Abmelden</button>' +
        '</div>' +
        '</div>';
    } else if (status === 'fehler') {
      body = '<div class="note" style="margin-bottom:14px">' + U.esc(sync.detail || 'Der Abgleich ruht gerade.') + '</div>' +
        '<div class="row">' +
          '<button class="btn btn-sm" data-act="system.syncNow">Erneut versuchen</button>' +
          '<button class="link-btn" data-act="system.syncSetup">Zugangsdaten ändern</button>' +
        '</div>';
    } else {
      body = '<p class="small muted">Einen Moment.</p>';
    }

    return '<section class="section">' +
      '<div class="section-head"><h2>Geräte</h2>' +
        '<span class="chip' + (status === 'gekoppelt' ? ' chip-green' : status === 'fehler' ? ' chip-warn' : '') + '">' +
        U.esc(SYNC_LABEL[status] || status) + '</span></div>' +
      '<div class="card">' + body +
        (backup ? '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">' +
          '<div class="tiny muted" style="margin-bottom:8px">Sicherung vom ' +
            U.esc(U.fmtMedium(String(backup).slice(0, 10))) + ', angelegt vor dem letzten Übernehmen.</div>' +
          '<button class="btn btn-sm btn-quiet" data-act="system.syncRestore">Vorherigen Stand zurückholen</button>' +
        '</div>' : '') +
      '</div>' +
      '</section>';
  }

  function syncSetupDialog() {
    const cfg = OS.sync.config() || { url: '', key: '' };
    OS.ui.form({
      title: 'Kopplung einrichten',
      subtitle: 'Einmal pro Gerät. Die beiden Werte findest du in deinem Supabase-Projekt unter Settings, API.',
      submitLabel: 'Verbinden',
      size: 'lg',
      extraFooter: cfg.url ? '<button class="btn btn-quiet btn-sm" data-clear type="button">Verbindung lösen</button>' : '',
      fields: [
        {
          type: 'note', tone: 'note-quiet',
          text: 'Der Projektschlüssel ist der öffentliche „anon public“. Er darf im Gerät liegen; ' +
            'geschützt werden die Daten durch die Zugriffsregeln der Datenbank.'
        },
        { name: 'url', label: 'Projekt-URL', value: cfg.url, placeholder: 'https://xxxxx.supabase.co', autofocus: true },
        { name: 'key', type: 'textarea', rows: 3, label: 'anon public key', value: cfg.key, placeholder: 'eyJhbGci…' }
      ],
      onMount: function (root, api) {
        const clear = root.querySelector('[data-clear]');
        if (clear) clear.addEventListener('click', function () {
          OS.sync.clearConfig();
          api.close();
          OS.app.render();
          OS.ui.toast('Verbindung gelöst. Deine Daten bleiben auf diesem Gerät.');
        });
      },
      onSubmit: function (v) {
        if (!OS.sync.setConfig(v.url, v.key)) {
          OS.ui.toast('Bitte beide Werte eintragen.');
          return false;
        }
        OS.sync.start();
        OS.ui.toast('Verbindung gespeichert.');
      }
    });
  }

  function dataTab() {
    const st = S.stats();
    const settings = S.state.settings;

    return syncSection() +

      '<section class="section">' +
        '<div class="section-head"><h2>Daten</h2></div>' +
        '<p class="small muted" style="margin-bottom:20px">Alles bleibt in diesem Browser. Kein Konto, kein Server. ' +
        'Ein Export ist deine Sicherung – und dein Umzugskarton.</p>' +
        '<div class="data-stats card">' +
          [['Bereiche', st.areas], ['Projekte', st.projects], ['Ziele', st.goals], ['Aufgaben', st.tasks],
           ['Ideen', st.ideas], ['Gewohnheiten', st.habits], ['Reviews', st.reviews], ['Tage', st.days]]
            .map(pair => '<div class="data-stat"><div class="ds-num">' + pair[1] + '</div>' +
              '<div class="ds-label">' + pair[0] + '</div></div>').join('') +
        '</div>' +
        '<div class="row" style="margin-top:20px">' +
          '<button class="btn btn-sm btn-primary" data-act="system.export">Export als JSON</button>' +
          '<button class="btn btn-sm" data-act="system.import">Import</button>' +
          '<button class="btn btn-sm btn-quiet btn-danger" data-act="system.reset" style="margin-left:auto">Alles löschen</button>' +
        '</div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head"><h3>Erscheinung</h3></div>' +
        '<div class="card">' +
          '<div class="manage-row">' +
            '<div class="mr-main is-stacked"><span>Akzentton</span></div>' +
            '<div class="swatches">' + S.ACCENTS.map(a =>
              '<button class="swatch' + (settings.accent === a.id ? ' is-on' : '') + '" style="background:' + a.value + '" ' +
              'data-act="system.accent" data-id="' + a.id + '" title="' + U.esc(a.label) + '" aria-label="' + U.esc(a.label) + '"></button>').join('') +
            '</div>' +
          '</div>' +
          '<div class="manage-row">' +
            '<div class="mr-main is-stacked"><span>Dunkle Oberfläche</span>' +
              '<span class="tiny muted">Für Abende. Gleiche Ruhe, andere Helligkeit.</span></div>' +
            '<button class="switch' + (settings.theme === 'dark' ? ' is-on' : '') + '" data-act="system.theme" ' +
              'aria-pressed="' + (settings.theme === 'dark') + '" aria-label="Dunkle Oberfläche"></button>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head"><h3>Maße</h3></div>' +
        '<div class="card">' +
          '<div class="manage-row">' +
            '<div class="mr-main is-stacked"><span>Aufgaben pro Tag</span>' +
              '<span class="tiny muted">Ab hier erscheint ein leiser Hinweis.</span></div>' +
            '<input class="input" type="number" min="1" max="10" style="width:80px" value="' + settings.maxTasksPerDay + '" ' +
              'data-store="settings::maxTasksPerDay" data-number data-rerender>' +
          '</div>' +
          '<div class="manage-row">' +
            '<div class="mr-main is-stacked"><span>Aktive Projekte</span>' +
              '<span class="tiny muted">Empfohlen sind fünf.</span></div>' +
            '<input class="input" type="number" min="1" max="12" style="width:80px" value="' + settings.maxActiveProjects + '" ' +
              'data-store="settings::maxActiveProjects" data-number data-rerender>' +
          '</div>' +
          '<div class="manage-row">' +
            '<div class="mr-main is-stacked"><span>Verfügbare Stunden pro Tag</span>' +
              '<span class="tiny muted">Grundlage der Kapazitätsansicht.</span></div>' +
            '<input class="input" type="number" min="1" max="16" step="0.5" style="width:80px" value="' + settings.dailyCapacityHours + '" ' +
              'data-store="settings::dailyCapacityHours" data-number data-rerender>' +
          '</div>' +
          '<div class="manage-row">' +
            '<div class="mr-main is-stacked"><span>Länge einer Saison in Wochen</span>' +
              '<span class="tiny muted">6 bis 12 Wochen.</span></div>' +
            '<input class="input" type="number" min="4" max="16" style="width:80px" value="' + settings.seasonWeeks + '" ' +
              'data-store="settings::seasonWeeks" data-number>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  /* --- Tab: Archiv -------------------------------------------------------------- */

  function archiveTab() {
    const projects = S.state.projects.filter(p => ['abgeschlossen', 'archiviert'].includes(p.status));
    const seasons = S.state.seasons.filter(s => s.archived);
    const tasks = S.state.tasks.filter(t => t.status === 'archived');
    const ideas = S.ideas({ status: 'archiviert' });
    const reviews = S.reviews();

    function section(title, items, renderRow) {
      return '<section class="section">' +
        '<div class="section-head"><h3>' + title + '</h3><span class="tiny muted">' + items.length + '</span></div>' +
        (items.length ? '<div class="card">' + items.map(renderRow).join('') + '</div>'
          : '<div class="empty">Nichts im Archiv.</div>') +
        '</section>';
    }

    return '<p class="lede" style="max-width:60ch;margin-bottom:30px">Abgeschlossenes bleibt lesbar. ' +
      'Das Archiv ist kein Papierkorb, sondern ein Gedächtnis.</p>' +

      section('Projekte', projects, p =>
        '<div class="manage-row"><div class="mr-main">' +
          '<button class="link-btn" data-act="os.projectOpen" data-id="' + p.id + '">' + U.esc(p.name) + '</button>' +
          OS.ui.statusChip(p.status) +
        '</div><button class="btn btn-sm" data-act="system.projectRestore" data-id="' + p.id + '">Zurückholen</button></div>') +

      section('Saisons', seasons, s =>
        '<div class="manage-row"><div class="mr-main is-stacked"><span>' + U.esc(s.title || 'Saison') + '</span>' +
          '<span class="tiny muted">' + U.esc(U.fmtRange(s.start, s.end)) + '</span></div>' +
          '<button class="btn btn-sm" data-act="system.seasonRestore" data-id="' + s.id + '">Zurückholen</button></div>') +

      section('Reviews', reviews, r =>
        '<div class="manage-row"><div class="mr-main">' +
          '<button class="link-btn" data-act="system.openReview" data-id="' + r.id + '">' +
            reviewLabel(r) +
          '</button></div>' +
          '<span class="tiny muted">' + U.esc(U.fmtMedium(r.createdAt.slice(0, 10))) + '</span></div>') +

      section('Aufgaben', tasks, t =>
        '<div class="manage-row"><div class="mr-main"><span class="muted">' + U.esc(t.title) + '</span></div>' +
          '<button class="btn btn-sm" data-act="system.taskRestore" data-id="' + t.id + '">Zurückholen</button></div>') +

      section('Ideen', ideas, i =>
        '<div class="manage-row"><div class="mr-main"><span class="muted">' + U.esc(i.title) + '</span></div>' +
          '<button class="btn btn-sm" data-act="system.ideaRestore" data-id="' + i.id + '">Zurückholen</button></div>');
  }

  /* --- Rendern ------------------------------------------------------------------- */

  function render(params) {
    const tab = tabOf(params);
    const head = '<div class="page-head">' +
      '<span class="overline">Review &amp; System</span>' +
      '<h1 style="margin-top:12px">Das System pflegen</h1>' +
      '<div class="page-sub">Regelmäßiges Aufräumen hält das OS leicht. Nichts hier ist Pflicht.</div>' +
      '</div>';

    let body = '';
    if (tab === 'review') body = reviewTab();
    else if (tab === 'bereiche') body = areaTab();
    else if (tab === 'gewohnheiten') body = habitTab();
    else if (tab === 'vorlagen') body = templateTab();
    else if (tab === 'daten') body = dataTab();
    else if (tab === 'archiv') body = archiveTab();

    return head + tabs(tab) + body;
  }

  /* --- Export / Import ---------------------------------------------------------------- */

  /** Wenn kein Speichern möglich ist: Text zum Kopieren zeigen. */
  function exportTextDialog(json, filename) {
    OS.ui.modal({
      title: 'Export',
      subtitle: 'Hier kann keine Datei gespeichert werden. Kopiere den Text und sichere ihn als ' + filename + '.',
      size: 'lg',
      body: '<div class="stack" style="gap:12px">' +
        '<textarea class="textarea" style="height:320px;font-family:var(--mono);font-size:11.5px" data-json readonly>' +
          U.esc(json) + '</textarea>' +
        '<div class="note note-quiet">Dieser Text ist deine vollständige Sicherung. ' +
        'Unter „Import“ kannst du ihn jederzeit wieder einfügen.</div>' +
        '</div>',
      footer: '<button class="btn" data-modal-close type="button">Schließen</button>' +
        '<button class="btn btn-primary" data-copy type="button">Text kopieren</button>',
      onMount: function (root) {
        const area = root.querySelector('[data-json]');
        root.querySelector('[data-copy]').addEventListener('click', function () {
          area.focus();
          area.select();
          const done = function () { OS.ui.toast('In die Zwischenablage kopiert.'); };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json).then(done, function () {
              OS.ui.toast('Bitte mit Strg+C oder Cmd+C kopieren.');
            });
          } else {
            OS.ui.toast('Bitte mit Strg+C oder Cmd+C kopieren.');
          }
        });
      }
    });
  }

  function importDialog() {
    OS.ui.modal({
      title: 'Daten importieren',
      subtitle: 'Wähle eine exportierte JSON-Datei oder füge den Text ein.',
      body: '<div class="stack" style="gap:16px">' +
        '<label class="field"><span class="field-label">Datei</span>' +
          '<input type="file" accept="application/json,.json" data-file class="input"></label>' +
        '<label class="field"><span class="field-label">Oder Text einfügen</span>' +
          '<textarea class="textarea" rows="5" data-paste placeholder="Den Inhalt einer Exportdatei hier einfügen"></textarea></label>' +
        '<label class="field"><span class="field-label">Vorgehen</span>' +
          '<select class="select" data-mode>' +
            '<option value="ersetzen">Vorhandene Daten ersetzen</option>' +
            '<option value="zusammenfuehren">Zusammenführen (nur Neues übernehmen)</option>' +
          '</select></label>' +
        '<div class="note note-quiet">Beim Ersetzen wird der aktuelle Stand überschrieben. ' +
        'Exportiere vorher, wenn du unsicher bist.</div>' +
        '</div>',
      footer: '<button class="btn" data-modal-close type="button">Abbrechen</button>' +
        '<button class="btn btn-primary" data-go type="button">Importieren</button>',
      onMount: function (root, api) {
        function apply(text, mode) {
          try {
            S.importData(text, mode);
            api.close();
            OS.ui.toast('Import abgeschlossen.');
            OS.app.applySettings();
          } catch (err) {
            OS.ui.toast(err.message || 'Import fehlgeschlagen.');
          }
        }

        root.querySelector('[data-go]').addEventListener('click', () => {
          const mode = root.querySelector('[data-mode]').value;
          const pasted = root.querySelector('[data-paste]').value.trim();
          if (pasted) { apply(pasted, mode); return; }

          const input = root.querySelector('[data-file]');
          const file = input.files && input.files[0];
          if (!file) { OS.ui.toast('Bitte eine Datei wählen oder Text einfügen.'); return; }
          const reader = new FileReader();
          reader.onload = function () { apply(String(reader.result), mode); };
          reader.onerror = function () { OS.ui.toast('Die Datei ließ sich nicht lesen.'); };
          reader.readAsText(file);
        });
      }
    });
  }

  /* --- Aktionen ---------------------------------------------------------------------- */

  const actions = {
    'system.weekReview': function () { weekReview(U.weekKey(U.today())); },
    'system.seasonReview': function (el, ds) {
      const season = S.currentSeason();
      seasonReview(season ? season.id : null, ds.type === 'mid' ? 'mid' : 'ende');
    },
    'system.openReview': function (el, ds) { openReview(ds.id); },

    'system.areaEdit': function (el, ds) { OS.forms.area(ds.id); },
    'system.areaArchive': function (el, ds) {
      S.update(() => { const a = S.find('area', ds.id); if (a) a.archived = true; });
    },
    'system.areaRestore': function (el, ds) {
      S.update(() => { const a = S.find('area', ds.id); if (a) a.archived = false; });
    },
    'system.areaMove': function (el, ds) {
      S.update(() => {
        const list = S.areas();
        const i = list.findIndex(a => a.id === ds.id);
        const j = i + Number(ds.dir);
        if (i < 0 || j < 0 || j >= list.length) return;
        U.move(list, i, j);
        list.forEach((a, idx) => { a.order = idx; });
      });
    },
    'system.areaSuggest': function () {
      const names = ['Arbeit', 'Gesundheit', 'Beziehungen', 'Finanzen', 'Lernen', 'Kreatives', 'Zuhause'];
      S.update(() => names.forEach(n => S.addArea({ name: n })));
      OS.ui.toast('Neutrale Bereiche eingefügt. Benenne sie um, wie es dir entspricht.');
    },

    'system.habitArchive': function (el, ds) {
      S.update(() => { const h = S.find('habit', ds.id); if (h) h.archived = true; });
    },
    'system.habitRestore': function (el, ds) {
      S.update(() => { const h = S.find('habit', ds.id); if (h) h.archived = false; });
    },
    'system.habitMove': function (el, ds) {
      S.update(() => {
        const list = S.habits();
        const i = list.findIndex(h => h.id === ds.id);
        const j = i + Number(ds.dir);
        if (i < 0 || j < 0 || j >= list.length) return;
        U.move(list, i, j);
        list.forEach((h, idx) => { h.order = idx; });
      });
    },
    'system.habitDelete': async function (el, ds) {
      const ok = await OS.ui.confirm({
        title: 'Gewohnheit löschen?',
        text: 'Auch die bisherigen Einträge werden entfernt. Archivieren bewahrt sie.',
        confirmLabel: 'Löschen', tone: 'danger'
      });
      if (ok) S.update(() => S.remove('habit', ds.id));
    },

    'system.templateNew': function (el, ds) { templateDialog(ds.kind || 'ziel'); },
    'system.templateEdit': function (el, ds) {
      const t = S.find('template', ds.id);
      if (t) templateDialog(t.kind, t.id);
    },
    'system.templateUse': function (el, ds) {
      const t = S.find('template', ds.id);
      if (!t) return;
      const p = t.payload || {};
      if (t.kind === 'ziel') {
        OS.forms.goal({
          title: p.title || '', why: p.why || '', metric: p.metric || '',
          horizon: p.horizon || 'saison', framework: p.framework || 'frei'
        });
      } else if (t.kind === 'projekt') {
        OS.forms.project({
          name: p.name || '', why: p.why || '', outcome: p.outcome || '', nextAction: p.nextAction || ''
        });
      } else {
        const questions = parseQuestions(p.questions);
        if (!questions.length) { OS.ui.toast('Diese Vorlage enthält noch keine Fragen.'); return; }
        reviewModal({
          title: t.name,
          subtitle: U.fmtLong(U.today()),
          type: 'eigen',
          periodKey: U.today(),
          templateId: t.id,
          questions: questions
        });
      }
    },
    'system.templateDelete': function (el, ds) {
      S.update(() => S.remove('template', ds.id));
    },

    'system.syncSetup': function () { syncSetupDialog(); },
    'system.syncPassword': function () {
      const mail = (document.querySelector('[data-sync-mail]') || {}).value || '';
      const pass = (document.querySelector('[data-sync-pass]') || {}).value || '';
      if (!mail.trim() || mail.indexOf('@') < 0) { OS.ui.toast('Bitte eine E-Mail-Adresse eintragen.'); return; }
      if (!pass) { OS.ui.toast('Bitte das Passwort eintragen.'); return; }
      OS.sync.signInWithPassword(mail, pass).then(function () {
        OS.ui.toast('Angemeldet.');
      }).catch(function (err) {
        const msg = err && err.message ? err.message : '';
        if (/Invalid login credentials/i.test(msg)) {
          OS.ui.toast('E-Mail oder Passwort stimmt nicht. Konto in Supabase unter Authentication, Users anlegen.');
        } else if (/Email not confirmed/i.test(msg)) {
          OS.ui.toast('Das Konto ist noch nicht bestätigt. In Supabase beim Anlegen Auto Confirm User setzen.');
        } else {
          OS.ui.toast(msg || 'Die Anmeldung hat nicht geklappt.');
        }
      });
    },
    'system.syncLogin': function () {
      const input = document.querySelector('[data-sync-mail]');
      const mail = input ? input.value.trim() : '';
      if (!mail || mail.indexOf('@') < 0) { OS.ui.toast('Bitte eine E-Mail-Adresse eintragen.'); return; }
      OS.sync.signIn(mail).then(function () {
        OS.ui.toast('Link verschickt. Öffne ihn auf diesem Gerät.');
      }).catch(function (err) {
        OS.ui.toast(err && err.message ? err.message : 'Der Link ließ sich nicht senden.');
      });
    },
    'system.syncLogout': async function () {
      const ok = await OS.ui.confirm({
        title: 'Abmelden?',
        text: 'Die Daten bleiben auf diesem Gerät. Der Abgleich pausiert, bis du dich wieder anmeldest.',
        confirmLabel: 'Abmelden'
      });
      if (ok) OS.sync.signOut();
    },
    'system.syncNow': function () { OS.sync.syncNow(); },
    'system.syncRestore': async function () {
      const ok = await OS.ui.confirm({
        title: 'Vorherigen Stand zurückholen?',
        text: 'Der aktuelle Stand wird durch die Sicherung ersetzt und anschließend auf die anderen Geräte übertragen.',
        confirmLabel: 'Zurückholen'
      });
      if (ok) OS.sync.restore();
    },

    'system.export': function () {
      const json = S.exportData();
      const name = S.exportFileName();
      S.exportFile().then(function (result) {
        if (result === 'saved' || result === 'local') OS.ui.toast('Export gespeichert.');
        else if (result === 'declined') OS.ui.toast('Export abgebrochen.');
        else exportTextDialog(json, name);
      });
    },
    'system.import': function () { importDialog(); },
    'system.reset': async function () {
      const ok = await OS.ui.confirm({
        title: 'Wirklich alles löschen?',
        text: 'Sämtliche Daten in diesem Browser werden entfernt. Exportiere vorher, wenn du sie behalten willst.',
        confirmLabel: 'Alles löschen', tone: 'danger'
      });
      if (!ok) return;
      S.reset();
      OS.app.applySettings();
      OS.ui.toast('Zurückgesetzt.');
    },
    'system.accent': function (el, ds) {
      S.update(() => { S.state.settings.accent = ds.id; });
      OS.app.applySettings();
    },
    'system.theme': function () {
      S.update(() => {
        S.state.settings.theme = S.state.settings.theme === 'dark' ? 'light' : 'dark';
      });
      OS.app.applySettings();
    },

    'system.projectRestore': function (el, ds) {
      S.update(() => { const p = S.find('project', ds.id); if (p) p.status = 'geplant'; });
    },
    'system.seasonRestore': function (el, ds) {
      S.update(() => { const s = S.find('season', ds.id); if (s) s.archived = false; });
    },
    'system.taskRestore': function (el, ds) {
      S.update(() => { const t = S.find('task', ds.id); if (t) { t.status = 'open'; t.date = null; } });
    },
    'system.ideaRestore': function (el, ds) {
      S.update(() => { const i = S.find('idea', ds.id); if (i) i.status = 'idee'; });
    }
  };

  return {
    render: render, actions: actions, title: 'Review & System',
    weekReview: weekReview, seasonReview: seasonReview, openReview: openReview
  };
})();
