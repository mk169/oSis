/* ===========================================================
   OS — Ansicht: Heute
   Nur das, was jetzt zählt.
   =========================================================== */

OS.views = OS.views || {};

OS.views.heute = (function () {
  'use strict';

  const U = OS.util;
  const S = OS.store;

  function dateOf(params) {
    return (params && params.d) || U.today();
  }

  /* --- Teilstücke ------------------------------------------------ */

  function head(key) {
    const season = S.currentSeason();
    const isToday = key === U.today();
    const day = S.getDay(key);
    const sp = season ? S.seasonProgress(season) : null;

    return '<div class="today-head">' +
      '<span class="overline">' + (isToday ? 'Heute' : 'Tag') + ' · KW ' + U.weekNumber(U.weekKey(key)) + '</span>' +
      '<div class="today-date" style="margin-top:10px">' + U.esc(U.fmtLong(key)) + '</div>' +
      '<div class="today-meta">' +
        (season ? '<span>' + U.esc(season.title) + (sp ? ' · Woche ' + sp.week + ' von ' + sp.weeks : '') + '</span>' : '<span>Keine Saison aktiv</span>') +
        (!isToday ? '<span><button class="link-btn" data-act="heute.goToday">Zurück zu heute</button></span>' : '') +
      '</div>' +
      '<div class="intention-line">' +
        '<input class="line-input" placeholder="Tagesintention – wie willst du heute sein?" value="' +
          U.esc(day.intention) + '" data-store="day:' + key + ':intention">' +
      '</div>' +
      '</div>';
  }

  function oneThing(key) {
    const day = S.getDay(key);
    return '<div class="one-thing">' +
      '<span class="overline">Die eine Sache, die heute zählt</span>' +
      '<textarea class="ghost-area" rows="1" placeholder="Wenn heute nur eines gelingt – was ist es?" ' +
        'data-store="day:' + key + ':oneThing" data-autosize>' + U.esc(day.oneThing) + '</textarea>' +
      '</div>';
  }

  function taskSection(key) {
    const max = S.state.settings.maxTasksPerDay || 3;
    const list = S.dayTasks(key);
    const open = list.filter(t => t.status === 'open');
    const rows = list.map(t => taskRow(t)).join('');
    const slots = Math.max(0, max - open.length);
    const emptySlots = list.length >= max ? '' : Array.from({ length: Math.min(slots, max - list.filter(x => x.status === 'open').length) })
      .map(() => '<button class="slot-empty" data-act="heute.pick" data-date="' + key + '">' +
        '<span class="slot-mark"></span><span>Aufgabe wählen</span></button>').join('');

    return '<section class="section">' +
      '<div class="section-head">' +
        '<h3>Heute</h3>' +
        '<div class="section-tools">' +
          '<span class="tiny muted">' + open.length + ' von ' + max + '</span>' +
          '<button class="link-btn" data-act="heute.pick" data-date="' + key + '">Wählen</button>' +
        '</div>' +
      '</div>' +
      (rows || '') +
      emptySlots +
      (open.length > max ? '<div class="note" style="margin-top:14px">Mehr als ' + max + ' Aufgaben für heute. Was darf warten?</div>' : '') +
      '</section>';
  }

  function taskRow(t) {
    const project = t.projectId ? S.find('project', t.projectId) : null;
    return '<div class="task-row' + (t.status === 'done' ? ' is-done' : '') + '">' +
      OS.ui.checkbox(t.status === 'done', 'data-act="os.taskToggle" data-id="' + t.id + '"') +
      '<div class="task-title">' + U.esc(t.title) +
        ((project || t.areaId) ? '<div class="task-meta">' +
          (project ? '<button class="chip chip-btn" data-act="os.projectOpen" data-id="' + project.id + '">' + U.esc(U.trunc(project.name, 28)) + '</button>' : '') +
          OS.ui.areaChip(t.areaId) + '</div>' : '') +
      '</div>' +
      '<div class="li-actions">' +
        OS.ui.iconBtn('calendar', 'os.taskPlan', 'Verschieben', 'data-id="' + t.id + '"') +
        OS.ui.iconBtn('edit', 'os.taskEdit', 'Bearbeiten', 'data-id="' + t.id + '"') +
        OS.ui.iconBtn('archive', 'os.taskArchive', 'Archivieren', 'data-id="' + t.id + '"') +
      '</div>' +
      '</div>';
  }

  function blockSection(key) {
    const blocks = S.dayBlocks(key);
    const planned = S.dayPlannedHours(key);

    return '<section class="section">' +
      '<div class="section-head">' +
        '<h3>Zeitblöcke</h3>' +
        '<div class="section-tools">' +
          (planned ? '<span class="tiny muted">' + U.fmtHours(planned) + ' geplant</span>' : '') +
          '<button class="link-btn" data-act="heute.addBlock" data-date="' + key + '">Block</button>' +
        '</div>' +
      '</div>' +
      (blocks.length ? '<div class="blocks">' + blocks.map(b => {
        const task = b.taskId ? S.find('task', b.taskId) : null;
        return '<div class="block-row type-' + U.esc(b.type) + '">' +
          '<span class="block-time">' + U.esc(b.start) + ' – ' + U.esc(b.end) + '</span>' +
          '<span class="block-label">' + U.esc(b.label) +
            (task ? '<span class="muted small"> · ' + U.esc(U.trunc(task.title, 34)) + '</span>' : '') + '</span>' +
          '<span class="li-actions">' +
            OS.ui.iconBtn('edit', 'heute.editBlock', 'Bearbeiten', 'data-date="' + key + '" data-block="' + b.id + '"') +
          '</span>' +
          '</div>';
      }).join('') + '</div>'
        : '<div class="empty">Noch keine Zeitblöcke. Ein Block genügt, um dem Tag Form zu geben.</div>') +
      '</section>';
  }

  function habitSection(key) {
    const habits = S.habits();
    if (!habits.length) {
      return '<section class="section">' +
        '<div class="section-head"><h3>Gewohnheiten</h3></div>' +
        '<div class="empty">Keine Gewohnheiten angelegt.' +
        '<div style="margin-top:12px"><button class="btn btn-sm" data-act="os.habitNew">Gewohnheit anlegen</button></div></div>' +
        '</section>';
    }
    return '<section class="section">' +
      '<div class="section-head"><h3>Gewohnheiten</h3>' +
        '<button class="link-btn" data-act="os.habitNew">Neu</button></div>' +
      '<div class="habit-list">' + habits.map(h => {
        const done = S.habitDone(h, key);
        return '<div class="habit-row' + (done ? ' is-done' : '') + '">' +
          OS.ui.checkbox(done, 'data-act="heute.toggleHabit" data-id="' + h.id + '" data-date="' + key + '"') +
          '<span class="habit-name">' + U.esc(h.name) + '</span>' +
          '</div>';
      }).join('') + '</div>' +
      '</section>';
  }

  function inboxSection() {
    const items = S.inbox().slice(0, 4);
    const total = S.state.inbox.length;
    return '<section class="section">' +
      '<div class="section-head"><h3>Inbox</h3>' +
        '<button class="link-btn" data-act="ui.inbox">' + (total ? total + ' offen' : 'Öffnen') + '</button></div>' +
      (items.length ? '<div class="list inbox-preview">' + items.map(item =>
        '<div class="list-item">' +
          '<div class="li-main">' +
            '<div class="li-title small">' + U.esc(U.trunc(item.text, 90)) + '</div>' +
            '<div class="li-meta"><span class="kind-mark">' + U.esc(S.INBOX_KIND_LABEL[item.kind] || '') + '</span></div>' +
          '</div>' +
          '<div class="li-actions">' +
            OS.ui.iconBtn('arrowRight', 'heute.inboxToToday', 'Für heute übernehmen', 'data-id="' + item.id + '"') +
          '</div>' +
        '</div>').join('') + '</div>'
        : '<div class="empty">Die Inbox ist leer.</div>') +
      '</section>';
  }

  function checkinSection(key) {
    const day = S.getDay(key);
    const moods = ['ruhig', 'wach', 'gedrückt', 'unruhig', 'zufrieden'];
    return '<section class="section">' +
      '<div class="section-head"><h3>Check-in</h3></div>' +
      '<div class="stack" style="gap:18px">' +
        '<div class="field"><span class="field-label">Energie</span>' +
          '<div class="scale">' + [1, 2, 3, 4, 5].map(n =>
            '<button class="scale-dot' + (day.checkin.energy === n ? ' is-on' : '') + '" data-act="heute.energy" data-date="' + key + '" data-value="' + n + '">' + n + '</button>').join('') +
          '</div></div>' +
        '<div class="field"><span class="field-label">Stimmung</span>' +
          '<div class="mood-row">' + moods.map(m =>
            '<button class="chip chip-btn' + (day.checkin.mood === m ? ' is-on' : '') + '" data-act="heute.mood" data-date="' + key + '" data-value="' + m + '">' + m + '</button>').join('') +
          '</div></div>' +
        '<label class="field"><span class="field-label">Notiz</span>' +
          '<textarea class="textarea" rows="2" placeholder="Ein Satz genügt." data-store="day:' + key + ':checkin.note">' + U.esc(day.checkin.note) + '</textarea></label>' +
      '</div>' +
      '</section>';
  }

  function closeSection(key) {
    const day = S.getDay(key);
    const done = S.tasks({ date: key, status: 'done' });
    const habitsDone = S.habits().filter(h => S.habitDone(h, key));

    return '<section class="close-day">' +
      '<span class="overline">Tagesabschluss</span>' +
      (done.length || habitsDone.length
        ? '<ul class="done-list">' +
          done.map(t => '<li>' + U.esc(t.title) + '</li>').join('') +
          habitsDone.map(h => '<li>' + U.esc(h.name) + '</li>').join('') +
          '</ul>'
        : '<p class="small muted" style="margin-top:10px">Noch nichts abgehakt. Das ist auch eine Antwort.</p>') +
      '<div class="grid grid-2" style="margin-top:22px">' +
        '<label class="field"><span class="field-label">Was wurde fertig?</span>' +
          '<textarea class="textarea" rows="3" placeholder="Auch Kleines zählt." data-store="day:' + key + ':close.done">' + U.esc(day.close.done) + '</textarea></label>' +
        '<label class="field"><span class="field-label">Was nehme ich mit?</span>' +
          '<textarea class="textarea" rows="3" placeholder="Eine Beobachtung, ein Satz." data-store="day:' + key + ':close.takeaway">' + U.esc(day.close.takeaway) + '</textarea></label>' +
      '</div>' +
      (S.tasks({ date: key, status: 'open' }).length
        ? '<div class="row" style="margin-top:20px;gap:8px">' +
          '<span class="small muted" style="margin-right:auto">Offen geblieben? Nichts davon ist verloren.</span>' +
          '<button class="btn btn-sm" data-act="heute.carryOver" data-date="' + key + '">Auf morgen verschieben</button>' +
          '<button class="btn btn-sm" data-act="heute.unplanRest" data-date="' + key + '">Datum entfernen</button>' +
          '</div>' : '') +
      '</section>';
  }

  /* --- Rendern ---------------------------------------------------- */

  function render(params) {
    const key = dateOf(params);
    return head(key) +
      oneThing(key) +
      '<div class="today-grid">' +
        '<div>' + taskSection(key) + blockSection(key) + '</div>' +
        '<div>' + habitSection(key) + checkinSection(key) + inboxSection() + '</div>' +
      '</div>' +
      closeSection(key);
  }

  /* --- Aktionen ---------------------------------------------------- */

  function pickModal(dateKey) {
    const max = S.state.settings.maxTasksPerDay || 3;
    const open = S.tasks({ date: dateKey, status: 'open' }).length;

    function body() {
      const candidates = S.tasks({ status: 'open' }).filter(t => t.date !== dateKey);
      const unplanned = candidates.filter(t => !t.date);
      const later = candidates.filter(t => t.date);
      const inbox = S.inbox().filter(i => i.kind === 'aufgabe');
      const projects = S.activeProjects().filter(p => (p.nextAction || '').trim());

      function taskList(list, label) {
        if (!list.length) return '';
        return '<div class="field"><span class="field-label">' + label + '</span><div class="list">' +
          list.slice(0, 12).map(t =>
            '<div class="list-item"><div class="li-main"><div class="li-title small">' + U.esc(t.title) + '</div>' +
              (t.date ? '<div class="li-meta"><span class="chip">' + U.esc(U.fmtRelative(t.date)) + '</span></div>' : '') +
            '</div><button class="btn btn-sm" data-take="' + t.id + '">Übernehmen</button></div>').join('') +
          '</div></div>';
      }

      return '<div class="stack" style="gap:20px">' +
        '<label class="field"><span class="field-label">Neue Aufgabe</span>' +
          '<input class="input" data-new-task placeholder="Was zählt heute?" data-autofocus></label>' +
        (open >= max ? '<div class="note">Für heute sind schon ' + open + ' Aufgaben gewählt. Mehr wird selten besser.</div>' : '') +
        taskList(unplanned, 'Ohne Datum') +
        taskList(later, 'Aus anderen Tagen') +
        (inbox.length ? '<div class="field"><span class="field-label">Aus der Inbox</span><div class="list">' +
          inbox.slice(0, 8).map(i =>
            '<div class="list-item"><div class="li-main"><div class="li-title small">' + U.esc(U.trunc(i.text, 80)) + '</div></div>' +
            '<button class="btn btn-sm" data-inbox="' + i.id + '">Übernehmen</button></div>').join('') +
          '</div></div>' : '') +
        (projects.length ? '<div class="field"><span class="field-label">Nächste Handlung aus Projekten</span><div class="list">' +
          projects.map(p =>
            '<div class="list-item"><div class="li-main"><div class="li-title small">' + U.esc(p.nextAction) + '</div>' +
            '<div class="li-meta"><span class="chip">' + U.esc(U.trunc(p.name, 28)) + '</span></div></div>' +
            '<button class="btn btn-sm" data-project="' + p.id + '">Übernehmen</button></div>').join('') +
          '</div></div>' : '') +
        (!unplanned.length && !later.length && !inbox.length && !projects.length
          ? '<div class="empty">Es gibt nichts zu wählen. Schreib oben eine Aufgabe.</div>' : '') +
        '</div>';
    }

    OS.ui.modal({
      title: 'Aufgabe für ' + (dateKey === U.today() ? 'heute' : U.fmtShort(dateKey)),
      subtitle: 'Höchstens ' + max + ' Aufgaben. Der Rest bleibt in Woche und Projekten.',
      body: body(),
      onMount: function (root, api) {
        const input = root.querySelector('[data-new-task]');
        input.addEventListener('keydown', e => {
          if (e.key !== 'Enter') return;
          const title = input.value.trim();
          if (!title) return;
          S.update(() => S.addTask({ title: title, date: dateKey }));
          api.close();
        });
        root.querySelectorAll('[data-take]').forEach(btn => btn.addEventListener('click', () => {
          S.update(() => {
            const t = S.find('task', btn.getAttribute('data-take'));
            if (t) t.date = dateKey;
          });
          api.close();
        }));
        root.querySelectorAll('[data-inbox]').forEach(btn => btn.addEventListener('click', () => {
          S.update(() => {
            const id = btn.getAttribute('data-inbox');
            const item = S.find('inbox', id);
            if (item) { S.addTask({ title: item.text, date: dateKey }); S.remove('inbox', id); }
          });
          api.close();
        }));
        root.querySelectorAll('[data-project]').forEach(btn => btn.addEventListener('click', () => {
          S.update(() => {
            const p = S.find('project', btn.getAttribute('data-project'));
            if (p) S.addTask({ title: p.nextAction, date: dateKey, projectId: p.id, areaId: p.areaId });
          });
          api.close();
        }));
      }
    });
  }

  const actions = {
    'heute.goToday': function () { OS.app.go('#/heute'); },
    'heute.pick': function (el, ds) { pickModal(ds.date || U.today()); },
    'heute.addBlock': function (el, ds) { OS.forms.block(ds.date || U.today()); },
    'heute.editBlock': function (el, ds) { OS.forms.block(ds.date, ds.block); },
    'heute.toggleHabit': function (el, ds) {
      S.update(() => S.toggleHabit(ds.id, ds.date));
    },
    'heute.energy': function (el, ds) {
      S.update(() => {
        const d = S.ensureDay(ds.date);
        const v = Number(ds.value);
        d.checkin.energy = d.checkin.energy === v ? null : v;
      });
    },
    'heute.mood': function (el, ds) {
      S.update(() => {
        const d = S.ensureDay(ds.date);
        d.checkin.mood = d.checkin.mood === ds.value ? '' : ds.value;
      });
    },
    'heute.inboxToToday': function (el, ds) {
      S.update(() => {
        const item = S.find('inbox', ds.id);
        if (!item) return;
        S.addTask({ title: item.text, date: U.today() });
        S.remove('inbox', ds.id);
      });
      OS.ui.toast('Für heute übernommen.');
    },
    'heute.carryOver': function (el, ds) {
      const next = U.addDays(ds.date, 1);
      let count = 0;
      S.update(() => {
        S.tasks({ date: ds.date, status: 'open' }).forEach(t => { t.date = next; count++; });
      });
      OS.ui.toast(count + ' ' + U.plural(count, 'Aufgabe', 'Aufgaben') + ' auf morgen verschoben.');
    },
    'heute.unplanRest': function (el, ds) {
      let count = 0;
      S.update(() => {
        S.tasks({ date: ds.date, status: 'open' }).forEach(t => { t.date = null; count++; });
      });
      OS.ui.toast(count + ' ' + U.plural(count, 'Aufgabe', 'Aufgaben') + ' ohne Datum abgelegt.');
    }
  };

  return { render: render, actions: actions, title: 'Heute' };
})();
