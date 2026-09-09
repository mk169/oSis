/* ===========================================================
   OS — Ansicht: Woche
   Planung trifft ehrliche Kapazität.
   =========================================================== */

OS.views.woche = (function () {
  'use strict';

  const U = OS.util;
  const S = OS.store;

  function weekOf(params) {
    return (params && params.w) || U.weekKey(U.today());
  }

  /* --- Kopf ------------------------------------------------------- */

  function head(wKey) {
    const days = U.weekDays(wKey);
    const week = S.getWeek(wKey);
    const isCurrent = wKey === U.weekKey(U.today());

    return '<div class="page-head">' +
      '<div class="page-head-row">' +
        '<div>' +
          '<span class="overline">Woche</span>' +
          '<h1 style="margin-top:12px">KW ' + U.weekNumber(wKey) + '</h1>' +
          '<div class="page-sub">' + U.esc(U.fmtMedium(days[0])) + ' – ' + U.esc(U.fmtMedium(days[6])) + '</div>' +
        '</div>' +
        '<div class="week-nav">' +
          '<button class="icon-btn" data-act="woche.prev" data-w="' + wKey + '" title="Vorige Woche">' + U.icons.chevronL + '</button>' +
          (isCurrent ? '' : '<button class="btn btn-sm" data-act="woche.now">Diese Woche</button>') +
          '<button class="icon-btn" data-act="woche.next" data-w="' + wKey + '" title="Nächste Woche">' + U.icons.chevronR + '</button>' +
          '<button class="btn btn-sm" data-act="woche.review" data-w="' + wKey + '" style="margin-left:8px">Wochenreview</button>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:26px">' +
        '<span class="overline">Wochenfokus</span>' +
        '<textarea class="ghost-area serif-input" rows="1" style="margin-top:8px" placeholder="Ein Satz für diese Woche." ' +
          'data-store="week:' + wKey + ':focus" data-autosize>' + U.esc(week.focus) + '</textarea>' +
      '</div>' +
      '</div>';
  }

  function top3(wKey) {
    const week = S.getWeek(wKey);
    return '<section class="section">' +
      '<div class="section-head"><h3>Drei Prioritäten</h3></div>' +
      '<div class="stack" style="gap:2px">' +
        week.top3.map((value, i) =>
          '<div class="task-row" style="align-items:center">' +
            '<span class="nav-num" style="width:16px">' + (i + 1) + '</span>' +
            '<input class="line-input" style="flex:1" placeholder="Priorität ' + (i + 1) + '" value="' + U.esc(value) + '" ' +
              'data-store="week:' + wKey + ':top3.' + i + '">' +
          '</div>').join('') +
      '</div>' +
      '</section>';
  }

  function capacity(wKey) {
    const cap = S.weekCapacity(wKey);
    const items = [
      { num: cap.focusBlocks, label: 'Fokusblöcke' },
      { num: U.fmtHours(cap.focusHours), label: 'Fokuszeit' },
      { num: cap.termine, label: 'Termine' },
      { num: cap.taskCount, label: 'Offene Aufgaben' },
      { num: U.fmtHours(cap.free), label: 'Freie Zeit' }
    ];
    return '<div class="capacity-bar">' +
      items.map(i => '<div class="cap-item"><span class="cap-num">' + U.esc(i.num) + '</span>' +
        '<span class="cap-label">' + U.esc(i.label) + '</span></div>').join('') +
      '<div class="cap-spacer"></div>' +
      '<div class="cap-item" style="min-width:150px">' +
        '<span class="cap-label" style="margin-bottom:6px">Auslastung</span>' +
        OS.ui.progressBar(cap.load * 100, cap.load > 0.85 ? 'progress-accent' : '') +
      '</div>' +
      '</div>';
  }

  function dayColumn(key, wKey) {
    const today = U.today();
    const blocks = S.dayBlocks(key);
    const tasks = S.dayTasks(key);
    const open = tasks.filter(t => t.status === 'open');
    const maxTasks = S.state.settings.maxTasksPerDay || 3;
    const planned = S.dayPlannedHours(key);
    const capH = S.state.settings.dailyCapacityHours || 6;
    const load = capH ? U.clamp(planned / capH, 0, 1) : 0;
    const isWeekend = U.dow(key) >= 5;

    const termine = blocks.filter(b => b.type === 'termin');
    const fokus = blocks.filter(b => b.type !== 'termin');

    function blockHtml(b) {
      return '<div class="mini-block type-' + U.esc(b.type) + '" data-act="heute.editBlock" data-date="' + key + '" data-block="' + b.id + '">' +
        '<span class="mb-time">' + U.esc(b.start) + '–' + U.esc(b.end) + '</span>' + U.esc(U.trunc(b.label, 40)) +
        '</div>';
    }

    return '<div class="day-col' + (key === today ? ' is-today' : '') + (isWeekend ? ' is-weekend' : '') +
      '" data-day="' + key + '" data-drop="' + key + '">' +
      '<div class="day-head">' +
        '<span class="day-name">' + U.esc(U.fmtWeekday(key)) + '</span>' +
        '<span class="day-num">' + (U.parseKey(key) ? U.parseKey(key).getDate() : '') + '</span>' +
      '</div>' +
      '<div class="day-cap' + (load >= 1 ? ' is-full' : '') + '"><i style="width:' + Math.round(load * 100) + '%"></i></div>' +
      (open.length > maxTasks ? '<div class="day-warn">Viel geplant – ' + open.length + ' Aufgaben.</div>' : '') +
      (termine.length ? '<div class="day-section"><div class="ds-label">Termine</div>' + termine.map(blockHtml).join('') + '</div>' : '') +
      (fokus.length ? '<div class="day-section"><div class="ds-label">Fokus</div>' + fokus.map(blockHtml).join('') + '</div>' : '') +
      '<div class="day-section">' +
        (tasks.length ? '<div class="ds-label">Aufgaben</div>' : '') +
        tasks.map(taskChip).join('') +
      '</div>' +
      '<div class="day-add">' +
        '<button data-act="woche.addTask" data-date="' + key + '">+ Aufgabe</button>' +
        '<button data-act="heute.addBlock" data-date="' + key + '">+ Block</button>' +
      '</div>' +
      '</div>';
  }

  function taskChip(t) {
    const project = t.projectId ? S.find('project', t.projectId) : null;
    return '<div class="task-chip' + (t.status === 'done' ? ' is-done' : '') + '" draggable="true" data-task="' + t.id + '">' +
      OS.ui.checkbox(t.status === 'done', 'data-act="os.taskToggle" data-id="' + t.id + '"') +
      '<span class="tc-title" data-act="os.taskEdit" data-id="' + t.id + '">' + U.esc(t.title) +
        (project ? '<span class="muted tiny" style="display:block">' + U.esc(U.trunc(project.name, 22)) + '</span>' : '') +
      '</span>' +
      '</div>';
  }

  function grid(wKey) {
    return '<div class="week-grid">' + U.weekDays(wKey).map(k => dayColumn(k, wKey)).join('') + '</div>';
  }

  function pool() {
    const list = S.unplannedTasks();
    return '<section class="section">' +
      '<div class="section-head"><h3>Ohne Tag</h3>' +
        '<div class="section-tools"><span class="tiny muted">Ziehen, um zu planen</span>' +
        '<button class="link-btn" data-act="woche.addTask">Neu</button></div></div>' +
      (list.length
        ? '<div class="pool" data-drop="">' + list.map(taskChip).join('') + '</div>'
        : '<div class="empty" data-drop="">Alles hat einen Platz. Aufgaben ohne Tag landen hier.</div>') +
      '</section>';
  }

  function nextActions() {
    const list = S.activeProjects();
    if (!list.length) return '';
    return '<section class="section">' +
      '<div class="section-head"><h3>Nächste Handlungen</h3>' +
        '<button class="link-btn" data-act="ui.goProjects">Projekte</button></div>' +
      list.map(p =>
        '<div class="next-action-row">' +
          '<div>' +
            '<button class="na-project link-btn" data-act="os.projectOpen" data-id="' + p.id + '">' + U.esc(p.name) + '</button>' +
            '<div class="na-text' + (p.nextAction ? '' : ' na-empty') + '">' +
              U.esc(p.nextAction || 'Noch keine nächste Handlung festgelegt.') + '</div>' +
          '</div>' +
          (p.nextAction
            ? '<button class="btn btn-sm" data-act="woche.planNext" data-id="' + p.id + '">Einplanen</button>'
            : '<button class="btn btn-sm" data-act="os.projectOpen" data-id="' + p.id + '">Festlegen</button>') +
        '</div>').join('') +
      '</section>';
  }

  function habitMatrix(wKey) {
    const habits = S.habits();
    const days = U.weekDays(wKey);
    const today = U.today();
    if (!habits.length) return '';

    return '<section class="section">' +
      '<div class="section-head"><h3>Gewohnheiten</h3>' +
        '<button class="link-btn" data-act="ui.goHabits">Verwalten</button></div>' +
      '<table class="habit-matrix"><thead><tr><th class="hm-name"></th>' +
        days.map(k => '<th>' + U.esc(U.fmtWeekday(k)) + '</th>').join('') + '<th></th></tr></thead><tbody>' +
      habits.map(h => {
        const count = days.filter(k => S.habitDone(h, k)).length;
        return '<tr><td class="hm-name">' + U.esc(h.name) + '</td>' +
          days.map(k => '<td><button class="hm-cell' + (S.habitDone(h, k) ? ' is-on' : '') + (k > today ? ' is-future' : '') +
            '" data-act="heute.toggleHabit" data-id="' + h.id + '" data-date="' + k + '" aria-label="' + U.esc(h.name + ' ' + U.fmtShort(k)) + '"></button></td>').join('') +
          '<td class="hm-count">' + count + '/7</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '</section>';
  }

  function notThisWeek(wKey) {
    const week = S.getWeek(wKey);
    return '<section class="section">' +
      '<div class="section-head"><h3>Diese Woche nicht</h3>' +
        '<button class="link-btn" data-act="woche.addNot" data-w="' + wKey + '">Hinzufügen</button></div>' +
      '<p class="small muted" style="margin-bottom:12px">Bewusst nicht priorisiert. Das ist eine Entscheidung, kein Versäumnis.</p>' +
      (week.notThisWeek.length
        ? '<div class="list not-list">' + week.notThisWeek.map(item =>
          '<div class="list-item"><div class="li-main"><div class="li-title">' + U.esc(item.text) + '</div></div>' +
          '<div class="li-actions">' + OS.ui.iconBtn('trash', 'woche.removeNot', 'Entfernen', 'data-w="' + wKey + '" data-id="' + item.id + '"') + '</div></div>').join('') + '</div>'
        : '<div class="empty">Noch nichts eingetragen.</div>') +
      '</section>';
  }

  /* --- Rendern ------------------------------------------------------ */

  function render(params) {
    const wKey = weekOf(params);
    return head(wKey) +
      capacity(wKey) +
      grid(wKey) +
      '<div class="grid grid-2" style="margin-top:46px;align-items:start">' +
        '<div>' + top3(wKey) + pool() + '</div>' +
        '<div>' + habitMatrix(wKey) + notThisWeek(wKey) + '</div>' +
      '</div>' +
      nextActions();
  }

  /* --- Drag & Drop ---------------------------------------------------- */

  function mount(root, params) {
    let draggedId = null;

    root.querySelectorAll('[data-task]').forEach(chip => {
      chip.addEventListener('dragstart', e => {
        draggedId = chip.getAttribute('data-task');
        chip.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', draggedId); } catch (err) { /* egal */ }
      });
      chip.addEventListener('dragend', () => {
        draggedId = null;
        chip.classList.remove('is-dragging');
        root.querySelectorAll('.is-over').forEach(el => el.classList.remove('is-over'));
      });
    });

    root.querySelectorAll('[data-drop]').forEach(zone => {
      const col = zone.closest('.day-col') || zone;

      zone.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('is-over');
      });
      zone.addEventListener('dragleave', () => col.classList.remove('is-over'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        col.classList.remove('is-over');
        const id = draggedId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
        if (!id) return;
        const date = zone.getAttribute('data-drop') || null;
        S.update(() => {
          const t = S.find('task', id);
          if (t) t.date = date || null;
        });
      });
    });
  }

  /* --- Aktionen -------------------------------------------------------- */

  const actions = {
    'woche.prev': function (el, ds) { OS.app.go('#/woche?w=' + U.shiftWeek(ds.w, -1)); },
    'woche.next': function (el, ds) { OS.app.go('#/woche?w=' + U.shiftWeek(ds.w, 1)); },
    'woche.now': function () { OS.app.go('#/woche'); },
    'woche.review': function (el, ds) { OS.views.system.weekReview(ds.w); },
    'woche.addTask': function (el, ds) { OS.forms.task(null, { date: ds.date || null }); },
    'woche.planNext': function (el, ds) {
      const p = S.find('project', ds.id);
      if (!p) return;
      OS.forms.task(null, {
        title: p.nextAction, projectId: p.id, areaId: p.areaId, date: U.today()
      });
    },
    'woche.addNot': async function (el, ds) {
      const text = await OS.ui.prompt({
        title: 'Diese Woche nicht',
        label: 'Was schiebst du bewusst weg?',
        placeholder: 'z. B. ein Thema, das warten darf'
      });
      if (!text) return;
      S.update(() => {
        const w = S.ensureWeek(ds.w);
        w.notThisWeek.push({ id: U.uid('nw'), text: text });
      });
    },
    'woche.removeNot': function (el, ds) {
      S.update(() => {
        const w = S.ensureWeek(ds.w);
        const i = w.notThisWeek.findIndex(x => x.id === ds.id);
        if (i >= 0) w.notThisWeek.splice(i, 1);
      });
    }
  };

  return { render: render, mount: mount, actions: actions, title: 'Woche' };
})();
