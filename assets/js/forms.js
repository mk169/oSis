/* ===========================================================
   OS — Gemeinsame Dialoge & Frameworks
   Aufgabe, Zeitblock, Projekt, Ziel, Idee, Saison, Bereich.
   =========================================================== */

OS.frameworks = {
  frei: {
    label: 'Ohne Vorlage',
    desc: 'Nur Name, Warum und Erfolgsdefinition. Nichts weiter.',
    fields: []
  },
  smart: {
    label: 'SMART',
    desc: 'Spezifisch, messbar, attraktiv, relevant, terminiert.',
    fields: [
      { key: 's', label: 'Spezifisch', placeholder: 'Was genau soll geschehen?' },
      { key: 'm', label: 'Messbar', placeholder: 'Woran erkennst du es?' },
      { key: 'a', label: 'Attraktiv / erreichbar', placeholder: 'Warum lohnt es sich – und ist es machbar?' },
      { key: 'r', label: 'Relevant', placeholder: 'Worauf zahlt es ein?' },
      { key: 't', label: 'Terminiert', placeholder: 'Bis wann?' }
    ]
  },
  outcome: {
    label: 'Outcome / Process',
    desc: 'Das gewünschte Ergebnis plus das wiederholbare Verhalten.',
    fields: [
      { key: 'outcome', label: 'Ergebnis', placeholder: 'Woran misst du das Ergebnis?' },
      { key: 'process', label: 'Verhalten', placeholder: 'Welches Verhalten wiederholst du dafür?' },
      { key: 'rhythm', label: 'Rhythmus', placeholder: 'Wie oft? Wann?' }
    ]
  },
  woop: {
    label: 'WOOP',
    desc: 'Wunsch, Ergebnis, Hindernis, Plan.',
    fields: [
      { key: 'wish', label: 'Wunsch', placeholder: 'Was wünschst du dir?' },
      { key: 'outcome', label: 'Ergebnis', placeholder: 'Wie fühlt sich das beste Ergebnis an?' },
      { key: 'obstacle', label: 'Hindernis', placeholder: 'Was in dir steht im Weg?' },
      { key: 'plan', label: 'Plan', placeholder: 'Wenn … dann …' }
    ]
  },
  twelve: {
    label: '12-Week-Year',
    desc: 'Ziel, Maßnahmen, wöchentlicher Score.',
    fields: [
      { key: 'goal', label: 'Ziel in 12 Wochen', placeholder: 'Was ist am Ende wahr?' },
      { key: 'actions', label: 'Wöchentliche Maßnahmen', placeholder: 'Eine Zeile pro Maßnahme', multiline: true },
      { key: 'score', label: 'Wochen-Score', placeholder: 'Ab wann gilt eine Woche als gelungen? z. B. 85 %' }
    ]
  },
  onething: {
    label: 'One-Thing',
    desc: 'Die eine Handlung mit dem größten Hebel.',
    fields: [
      { key: 'thing', label: 'Die eine Handlung', placeholder: 'Was macht alles andere leichter oder überflüssig?' },
      { key: 'when', label: 'Wann', placeholder: 'Wann tust du sie?' }
    ]
  }
};

OS.forms = (function () {
  'use strict';

  const U = OS.util;
  const S = OS.store;

  /* --- Zusammenfassung einer Framework-Vorlage ------------------- */

  function summarize(goal) {
    if (!goal) return '';
    const fw = OS.frameworks[goal.framework && goal.framework.type] || OS.frameworks.frei;
    const values = (goal.framework && goal.framework.fields) || {};
    const parts = fw.fields
      .map(f => (values[f.key] || '').trim())
      .filter(Boolean);
    if (!parts.length) return '';
    return fw.fields
      .filter(f => (values[f.key] || '').trim())
      .map(f => f.label + ': ' + values[f.key].trim())
      .join('\n');
  }

  /* --- Aufgabe ---------------------------------------------------- */

  function task(id, defaults) {
    const existing = id ? S.find('task', id) : null;
    const t = existing || Object.assign({
      title: '', notes: '', date: null, projectId: null, goalId: null, areaId: null
    }, defaults || {});

    OS.ui.form({
      title: existing ? 'Aufgabe' : 'Neue Aufgabe',
      submitLabel: existing ? 'Speichern' : 'Anlegen',
      extraFooter: existing ? '<button class="btn btn-quiet btn-sm" data-del type="button">Löschen</button>' : '',
      fields: [
        { name: 'title', label: 'Aufgabe', value: t.title, placeholder: 'Eine konkrete Handlung', autofocus: true },
        {
          type: 'row', fields: [
            { name: 'date', type: 'date', label: 'Geplant für', value: t.date || '' },
            { name: 'projectId', type: 'select', label: 'Projekt', value: t.projectId || '', options: OS.ui.projectOptions() }
          ]
        },
        {
          type: 'row', fields: [
            { name: 'goalId', type: 'select', label: 'Ziel', value: t.goalId || '', options: OS.ui.goalOptions() },
            { name: 'areaId', type: 'select', label: 'Lebensbereich', value: t.areaId || '', options: OS.ui.areaOptions() }
          ]
        },
        { name: 'notes', type: 'textarea', label: 'Notiz', value: t.notes, rows: 3, placeholder: 'Optional' }
      ],
      onMount: function (root, api) {
        const del = root.querySelector('[data-del]');
        if (del) del.addEventListener('click', async () => {
          const ok = await OS.ui.confirm({ title: 'Aufgabe löschen?', text: 'Die Aufgabe wird entfernt. Alternativ kannst du sie archivieren.', confirmLabel: 'Löschen', tone: 'danger' });
          if (ok) { S.update(() => S.remove('task', id)); api.close(); }
        });
      },
      onSubmit: function (v) {
        const title = String(v.title || '').trim();
        if (!title) { OS.ui.toast('Die Aufgabe braucht einen Satz.'); return false; }
        S.update(() => {
          const target = existing || S.addTask({});
          target.title = title;
          target.notes = v.notes || '';
          target.date = v.date || null;
          target.projectId = v.projectId || null;
          target.goalId = v.goalId || null;
          target.areaId = v.areaId || null;
        });
      }
    });
  }

  /* --- Zeitblock --------------------------------------------------- */

  function block(dateKey, blockId) {
    const day = S.getDay(dateKey);
    const existing = blockId ? day.blocks.find(b => b.id === blockId) : null;
    const b = existing || { start: '09:00', end: '10:30', label: '', type: 'fokus', taskId: null };

    OS.ui.form({
      title: existing ? 'Zeitblock' : 'Neuer Zeitblock',
      subtitle: U.fmtLong(dateKey),
      submitLabel: existing ? 'Speichern' : 'Anlegen',
      extraFooter: existing ? '<button class="btn btn-quiet btn-sm" data-del type="button">Entfernen</button>' : '',
      fields: [
        { name: 'label', label: 'Bezeichnung', value: b.label, placeholder: 'Woran arbeitest du?', autofocus: true },
        {
          type: 'row', fields: [
            { name: 'start', type: 'time', label: 'Von', value: b.start },
            { name: 'end', type: 'time', label: 'Bis', value: b.end }
          ]
        },
        {
          type: 'row', fields: [
            {
              name: 'type', type: 'select', label: 'Art', value: b.type, options: [
                { value: 'fokus', label: 'Fokusblock' },
                { value: 'termin', label: 'Termin' },
                { value: 'pause', label: 'Pause / Puffer' }
              ]
            },
            { name: 'taskId', type: 'select', label: 'Aufgabe', value: b.taskId || '', options: taskOptions(dateKey) }
          ]
        }
      ],
      onMount: function (root, api) {
        const del = root.querySelector('[data-del]');
        if (del) del.addEventListener('click', () => {
          S.update(() => {
            const d = S.ensureDay(dateKey);
            const i = d.blocks.findIndex(x => x.id === blockId);
            if (i >= 0) d.blocks.splice(i, 1);
          });
          api.close();
        });
      },
      onSubmit: function (v) {
        const start = v.start || '09:00';
        const end = v.end || '10:00';
        if (U.toMinutes(end) !== null && U.toMinutes(start) !== null && U.toMinutes(end) <= U.toMinutes(start)) {
          OS.ui.toast('Das Ende liegt vor dem Anfang.');
          return false;
        }
        S.update(() => {
          const d = S.ensureDay(dateKey);
          const target = existing || { id: U.uid('b') };
          target.start = start;
          target.end = end;
          target.label = String(v.label || '').trim() || (v.type === 'pause' ? 'Pause' : 'Fokus');
          target.type = v.type || 'fokus';
          target.taskId = v.taskId || null;
          if (!existing) d.blocks.push(target);
        });
      }
    });
  }

  function taskOptions(dateKey) {
    const list = S.tasks({ status: 'open' })
      .filter(t => !t.date || t.date === dateKey);
    return [{ value: '', label: 'Keine Aufgabe' }]
      .concat(list.map(t => ({ value: t.id, label: U.trunc(t.title, 46) })));
  }

  /* --- Projekt: anlegen -------------------------------------------- */

  function project(defaults) {
    const season = S.currentSeason();
    const seasonGoals = season ? S.seasonGoals(season.id) : [];
    const goalOpts = seasonGoals.map(g => ({ value: g.id, label: g.title || 'Ohne Titel' }));
    const otherGoals = S.goals({ open: true }).filter(g => !seasonGoals.includes(g));

    OS.ui.form({
      title: 'Neues Projekt',
      subtitle: 'Ein Projekt hat ein Ende. Es ist kein Lebensbereich.',
      submitLabel: 'Anlegen',
      size: 'lg',
      fields: [
        { name: 'name', label: 'Name', value: (defaults && defaults.name) || '', placeholder: 'Woran arbeitest du?', autofocus: true },
        { name: 'why', type: 'textarea', label: 'Warum', rows: 2, value: (defaults && defaults.why) || '', placeholder: 'Warum ist das wichtig – jetzt?' },
        { name: 'outcome', type: 'textarea', label: 'Gewünschtes Ergebnis', rows: 2, value: (defaults && defaults.outcome) || '', placeholder: 'Woran erkennst du, dass es fertig ist?' },
        { name: 'nextAction', label: 'Nächste konkrete Handlung', value: (defaults && defaults.nextAction) || '', placeholder: 'Der kleinste nächste Schritt' },
        {
          type: 'section', label: 'Einordnung',
          help: 'Auf welches Saisonziel zahlt das ein? Beides ist freiwillig.'
        },
        {
          name: 'goalIds', type: 'multiselect', label: 'Saisonziel',
          value: (defaults && defaults.goalIds) || [],
          options: goalOpts.concat(otherGoals.map(g => ({ value: g.id, label: (g.title || 'Ohne Titel') + ' · ' + (S.HORIZON_LABEL[g.horizon] || '') })))
        },
        {
          type: 'row', fields: [
            { name: 'areaId', type: 'select', label: 'Lebensbereich', value: (defaults && defaults.areaId) || '', options: OS.ui.areaOptions() },
            {
              name: 'status', type: 'select', label: 'Status', value: (defaults && defaults.status) || 'geplant',
              options: S.PROJECT_STATUS.filter(s => s !== 'archiviert').map(s => ({ value: s, label: S.PROJECT_STATUS_LABEL[s] }))
            }
          ]
        },
        {
          type: 'row', fields: [
            { name: 'start', type: 'date', label: 'Start', value: '' },
            { name: 'due', type: 'date', label: 'Frist', value: '' }
          ]
        }
      ],
      onSubmit: function (v) {
        const name = String(v.name || '').trim();
        if (!name) { OS.ui.toast('Das Projekt braucht einen Namen.'); return false; }
        if (v.status === 'aktiv' && !canActivate()) {
          OS.ui.toast('Fünf aktive Projekte sind genug. Es wird als geplant angelegt.');
          v.status = 'geplant';
        }
        let created;
        S.update(() => {
          created = S.addProject({
            name: name,
            why: v.why || '',
            outcome: v.outcome || '',
            nextAction: v.nextAction || '',
            areaId: v.areaId || null,
            goalIds: Array.isArray(v.goalIds) ? v.goalIds : [],
            status: v.status || 'geplant',
            start: v.start || null,
            due: v.due || null
          });
        });
        if (created && !created.goalIds.length) {
          OS.ui.toast('Dieses Projekt zahlt auf kein Ziel ein. Vielleicht ist dies eine Idee für später.');
        }
        if (created) setTimeout(() => projectDetail(created.id), 60);
      }
    });
  }

  function canActivate(excludeId) {
    const max = S.state.settings.maxActiveProjects || 5;
    return S.activeProjects().filter(p => p.id !== excludeId).length < max;
  }

  /* --- Projekt: Detail (lebendes Dokument) ------------------------- */

  let openDetail = null;

  function detailModal(renderFn, opts) {
    const api = OS.ui.modal(Object.assign({
      size: 'lg',
      body: renderFn(),
      onClose: function () { openDetail = null; }
    }, opts || {}));
    openDetail = {
      api: api,
      render: renderFn,
      refresh: function () {
        const body = api.root.querySelector('.modal-body');
        if (!body) return;
        const scroll = api.wrap.scrollTop;
        body.innerHTML = renderFn();
        U.autosizeAll(body);
        api.wrap.scrollTop = scroll;
      }
    };
    U.autosizeAll(api.root);
    return api;
  }

  function refresh() { if (openDetail) openDetail.refresh(); }

  function projectDetail(id) {
    const render = function () {
      const p = S.find('project', id);
      if (!p) return '<div class="empty">Dieses Projekt gibt es nicht mehr.</div>';
      const progress = S.projectProgress(p);
      const linkedGoals = (p.goalIds || []).map(gid => S.find('goal', gid)).filter(Boolean);
      const tasks = S.tasks({ projectId: p.id, notArchived: true });

      return '' +
        '<div class="stack" style="gap:6px">' +
          '<span class="overline">Projekt</span>' +
          '<input class="line-input serif-input" value="' + U.esc(p.name) + '" placeholder="Name des Projekts" data-store="project:' + p.id + ':name">' +
        '</div>' +

        '<div class="form-row">' +
          '<label class="field"><span class="field-label">Status</span>' +
            '<select class="select" data-store="project:' + p.id + ':status" data-rerender data-guard="project-status">' +
              S.PROJECT_STATUS.map(s => '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + S.PROJECT_STATUS_LABEL[s] + '</option>').join('') +
            '</select></label>' +
          '<label class="field"><span class="field-label">Lebensbereich</span>' +
            '<select class="select" data-store="project:' + p.id + ':areaId" data-rerender>' +
              OS.ui.areaOptions().map(o => '<option value="' + U.esc(o.value) + '"' + ((p.areaId || '') === o.value ? ' selected' : '') + '>' + U.esc(o.label) + '</option>').join('') +
            '</select></label>' +
        '</div>' +

        '<label class="field"><span class="field-label">Warum</span>' +
          '<textarea class="textarea" rows="2" placeholder="Warum ist das wichtig?" data-store="project:' + p.id + ':why">' + U.esc(p.why) + '</textarea></label>' +

        '<label class="field"><span class="field-label">Gewünschtes Ergebnis</span>' +
          '<textarea class="textarea" rows="2" placeholder="Woran erkennst du, dass es fertig ist?" data-store="project:' + p.id + ':outcome">' + U.esc(p.outcome) + '</textarea></label>' +

        '<label class="field"><span class="field-label">Nächste konkrete Handlung</span>' +
          '<input class="input" value="' + U.esc(p.nextAction) + '" placeholder="Der kleinste nächste Schritt" data-store="project:' + p.id + ':nextAction">' +
          '<span class="field-help">Diese Handlung erscheint in der Wochenansicht.</span></label>' +

        '<div class="form-row">' +
          '<label class="field"><span class="field-label">Start</span>' +
            '<input class="input" type="date" value="' + U.esc(p.start || '') + '" data-store="project:' + p.id + ':start"></label>' +
          '<label class="field"><span class="field-label">Frist oder Zeitraum</span>' +
            '<input class="input" type="date" value="' + U.esc(p.due || '') + '" data-store="project:' + p.id + ':due"></label>' +
        '</div>' +

        '<div class="field">' +
          '<span class="field-label">Zahlt ein auf</span>' +
          '<div class="chips">' +
            S.goals({ open: true }).map(g =>
              '<button class="chip chip-btn' + ((p.goalIds || []).includes(g.id) ? ' is-on' : '') + '" data-act="os.projectGoalToggle" data-id="' + p.id + '" data-goal="' + g.id + '">' +
              U.esc(U.trunc(g.title || 'Ohne Titel', 34)) + '</button>').join('') +
            '<button class="chip chip-btn" data-act="os.goalNew" data-project="' + p.id + '">' + U.icons.plus + ' Ziel</button>' +
          '</div>' +
          (!linkedGoals.length ? '<span class="field-help" style="color:var(--warn)">Dieses Projekt zahlt auf kein Ziel ein. Vielleicht ist dies eine Idee für später.</span>' : '') +
        '</div>' +

        '<div class="field">' +
          '<div class="spread"><span class="field-label">Meilensteine</span>' +
            '<span class="tiny muted">' + progress + ' %</span></div>' +
          OS.ui.progressBar(progress) +
          '<div style="margin-top:8px">' +
            (p.milestones || []).map(m =>
              '<div class="milestone-row' + (m.done ? ' is-done' : '') + '">' +
                OS.ui.checkbox(m.done, 'data-act="os.milestoneToggle" data-id="' + p.id + '" data-ms="' + m.id + '"') +
                '<input class="line-input ms-title" value="' + U.esc(m.title) + '" data-store="milestone:' + p.id + '.' + m.id + ':title">' +
                (m.due ? '<span class="tiny muted">' + U.fmtShort(m.due) + '</span>' : '') +
                OS.ui.iconBtn('trash', 'os.milestoneRemove', 'Entfernen', 'data-id="' + p.id + '" data-ms="' + m.id + '"') +
              '</div>').join('') +
            '<button class="btn btn-quiet btn-sm" style="margin-top:8px" data-act="os.milestoneAdd" data-id="' + p.id + '">' + U.icons.plus + ' Meilenstein</button>' +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<div class="spread"><span class="field-label">Aufgaben</span>' +
            '<button class="btn btn-quiet btn-sm" data-act="os.taskNew" data-project="' + p.id + '">' + U.icons.plus + ' Aufgabe</button></div>' +
          (tasks.length ? '<div class="list">' + tasks.map(t =>
            '<div class="list-item' + (t.status === 'done' ? ' is-done' : '') + '">' +
              OS.ui.checkbox(t.status === 'done', 'data-act="os.taskToggle" data-id="' + t.id + '"') +
              '<div class="li-main"><div class="li-title">' + U.esc(t.title) + '</div>' +
                (t.date ? '<div class="li-meta"><span class="chip">' + U.esc(U.fmtRelative(t.date)) + '</span></div>' : '') +
              '</div>' +
              '<div class="li-actions">' + OS.ui.iconBtn('edit', 'os.taskEdit', 'Bearbeiten', 'data-id="' + t.id + '"') + '</div>' +
            '</div>').join('') + '</div>'
            : '<span class="field-help">Noch keine Aufgaben.</span>') +
        '</div>' +

        '<label class="field"><span class="field-label">Notizen und Ressourcen</span>' +
          '<textarea class="textarea" rows="4" placeholder="Gedanken, Links, Material" data-store="project:' + p.id + ':notes">' + U.esc(p.notes) + '</textarea></label>' +

        '<div class="row" style="justify-content:flex-end;gap:8px;padding-top:6px;border-top:1px solid var(--line)">' +
          '<button class="btn btn-quiet btn-sm" data-act="os.projectDelete" data-id="' + p.id + '">Löschen</button>' +
          '<button class="btn btn-sm" data-act="os.projectArchive" data-id="' + p.id + '">Archivieren</button>' +
          '<button class="btn btn-sm btn-primary" data-modal-close>Fertig</button>' +
        '</div>';
    };

    detailModal(render, { title: null });
  }

  /* --- Ziel --------------------------------------------------------- */

  function goal(defaults) {
    const d = defaults || {};
    const season = S.currentSeason();

    OS.ui.form({
      title: 'Neues Ziel',
      subtitle: 'Ein Ziel ist noch kein Projekt. Es beschreibt, was wahr sein soll.',
      submitLabel: 'Anlegen',
      size: 'lg',
      fields: [
        { name: 'title', label: 'Ziel', value: d.title || '', placeholder: 'Was soll am Ende wahr sein?', autofocus: true },
        { name: 'why', type: 'textarea', rows: 2, label: 'Warum', value: d.why || '', placeholder: 'Was macht es dir wichtig?' },
        { name: 'metric', type: 'textarea', rows: 2, label: 'Messgröße oder Erfolgsdefinition', value: d.metric || '', placeholder: 'Woran erkennst du, dass es erreicht ist?' },
        {
          type: 'row', fields: [
            {
              name: 'horizon', type: 'select', label: 'Zeithorizont', value: d.horizon || 'saison',
              options: [
                { value: 'saison', label: 'Saison' },
                { value: 'jahr', label: 'Jahr' },
                { value: 'lang', label: 'Langfristig' }
              ]
            },
            { name: 'areaId', type: 'select', label: 'Lebensbereich', value: d.areaId || '', options: OS.ui.areaOptions() }
          ]
        },
        {
          type: 'row', fields: [
            {
              name: 'seasonId', type: 'select', label: 'Saison', value: d.seasonId || (season ? season.id : ''),
              options: [{ value: '', label: 'Keiner Saison zugeordnet' }].concat(
                S.state.seasons.filter(s => !s.archived).map(s => ({ value: s.id, label: s.title || 'Saison' })))
            },
            {
              name: 'framework', type: 'select', label: 'Vorlage (freiwillig)', value: d.framework || 'frei',
              options: Object.keys(OS.frameworks).map(k => ({ value: k, label: OS.frameworks[k].label }))
            }
          ]
        },
        {
          type: 'note', tone: 'note-quiet',
          text: 'Vorlagen helfen beim Denken. Du kannst sie später wechseln oder leer lassen.'
        }
      ],
      onSubmit: function (v) {
        const title = String(v.title || '').trim();
        if (!title) { OS.ui.toast('Das Ziel braucht einen Namen.'); return false; }
        let created;
        S.update(() => {
          created = S.addGoal({
            title: title,
            why: v.why || '',
            metric: v.metric || '',
            horizon: v.horizon || 'saison',
            areaId: v.areaId || null,
            seasonId: v.horizon === 'saison' ? (v.seasonId || null) : (v.seasonId || null),
            framework: { type: v.framework || 'frei', fields: {} },
            fromWishId: d.fromWishId || null
          });
          if (d.projectId) {
            const p = S.find('project', d.projectId);
            if (p && !p.goalIds.includes(created.id)) p.goalIds.push(created.id);
          }
        });
        if (created && (v.framework && v.framework !== 'frei')) setTimeout(() => goalDetail(created.id), 60);
      }
    });
  }

  function goalDetail(id) {
    const render = function () {
      const g = S.find('goal', id);
      if (!g) return '<div class="empty">Dieses Ziel gibt es nicht mehr.</div>';
      const fwType = (g.framework && g.framework.type) || 'frei';
      const fw = OS.frameworks[fwType] || OS.frameworks.frei;
      const values = (g.framework && g.framework.fields) || {};
      const linked = S.projects({ goalId: g.id });
      const progress = S.goalProgress(g);

      return '' +
        '<div class="stack" style="gap:6px">' +
          '<span class="overline">Ziel · ' + U.esc(S.HORIZON_LABEL[g.horizon] || '') + '</span>' +
          '<input class="line-input serif-input" value="' + U.esc(g.title) + '" placeholder="Name des Ziels" data-store="goal:' + g.id + ':title">' +
        '</div>' +

        '<div class="form-row">' +
          '<label class="field"><span class="field-label">Status</span>' +
            '<select class="select" data-store="goal:' + g.id + ':status" data-rerender>' +
              Object.keys(S.GOAL_STATUS_LABEL).map(s => '<option value="' + s + '"' + (g.status === s ? ' selected' : '') + '>' + S.GOAL_STATUS_LABEL[s] + '</option>').join('') +
            '</select></label>' +
          '<label class="field"><span class="field-label">Lebensbereich</span>' +
            '<select class="select" data-store="goal:' + g.id + ':areaId" data-rerender>' +
              OS.ui.areaOptions().map(o => '<option value="' + U.esc(o.value) + '"' + ((g.areaId || '') === o.value ? ' selected' : '') + '>' + U.esc(o.label) + '</option>').join('') +
            '</select></label>' +
        '</div>' +

        '<div class="form-row">' +
          '<label class="field"><span class="field-label">Zeithorizont</span>' +
            '<select class="select" data-store="goal:' + g.id + ':horizon" data-rerender>' +
              Object.keys(S.HORIZON_LABEL).map(h => '<option value="' + h + '"' + (g.horizon === h ? ' selected' : '') + '>' + S.HORIZON_LABEL[h] + '</option>').join('') +
            '</select></label>' +
          '<label class="field"><span class="field-label">Saison</span>' +
            '<select class="select" data-store="goal:' + g.id + ':seasonId" data-rerender>' +
              ['<option value="">Keiner Saison zugeordnet</option>'].concat(
                S.state.seasons.filter(s => !s.archived).map(s => '<option value="' + s.id + '"' + (g.seasonId === s.id ? ' selected' : '') + '>' + U.esc(s.title || 'Saison') + '</option>')).join('') +
            '</select></label>' +
        '</div>' +

        '<label class="field"><span class="field-label">Warum</span>' +
          '<textarea class="textarea" rows="2" data-store="goal:' + g.id + ':why" placeholder="Was macht es dir wichtig?">' + U.esc(g.why) + '</textarea></label>' +

        '<label class="field"><span class="field-label">Messgröße oder Erfolgsdefinition</span>' +
          '<textarea class="textarea" rows="2" data-store="goal:' + g.id + ':metric" placeholder="Woran erkennst du, dass es erreicht ist?">' + U.esc(g.metric) + '</textarea></label>' +

        '<div class="form-row">' +
          '<label class="field"><span class="field-label">Zeitraum von</span>' +
            '<input class="input" type="date" value="' + U.esc(g.start || '') + '" data-store="goal:' + g.id + ':start"></label>' +
          '<label class="field"><span class="field-label">bis</span>' +
            '<input class="input" type="date" value="' + U.esc(g.end || '') + '" data-store="goal:' + g.id + ':end"></label>' +
        '</div>' +

        '<div class="field">' +
          '<span class="field-label">Vorlage</span>' +
          '<div class="chips">' +
            Object.keys(OS.frameworks).map(k =>
              '<button class="chip chip-btn' + (fwType === k ? ' is-on' : '') + '" data-act="os.goalFramework" data-id="' + g.id + '" data-fw="' + k + '">' +
              U.esc(OS.frameworks[k].label) + '</button>').join('') +
          '</div>' +
          '<span class="field-help">' + U.esc(fw.desc) + '</span>' +
        '</div>' +

        (fw.fields.length ? '<div class="stack" style="gap:14px;padding:16px 18px;background:var(--surface-2);border-radius:var(--radius)">' +
          fw.fields.map(f =>
            '<label class="field"><span class="field-label">' + U.esc(f.label) + '</span>' +
            (f.multiline
              ? '<textarea class="textarea" rows="3" placeholder="' + U.esc(f.placeholder) + '" data-store="goal:' + g.id + ':framework.fields.' + f.key + '">' + U.esc(values[f.key] || '') + '</textarea>'
              : '<input class="input" value="' + U.esc(values[f.key] || '') + '" placeholder="' + U.esc(f.placeholder) + '" data-store="goal:' + g.id + ':framework.fields.' + f.key + '">') +
            '</label>').join('') +
          '<button class="btn btn-sm" style="align-self:flex-start" data-act="os.goalSummarize" data-id="' + g.id + '">Zu einer Zielkarte zusammenfassen</button>' +
        '</div>' : '') +

        (g.summary ? '<div class="note note-green"><div class="overline" style="margin-bottom:6px">Zielkarte</div>' + U.nl2br(g.summary) + '</div>' : '') +

        '<div class="field">' +
          '<span class="field-label">Fortschritt</span>' +
          '<div class="row" style="gap:16px">' +
            '<label class="row row-tight tiny"><input type="radio" name="pm-' + g.id + '" ' + (g.progressMode !== 'abgeleitet' ? 'checked' : '') + ' data-act="os.goalProgressMode" data-id="' + g.id + '" data-mode="manuell"> manuell</label>' +
            '<label class="row row-tight tiny"><input type="radio" name="pm-' + g.id + '" ' + (g.progressMode === 'abgeleitet' ? 'checked' : '') + ' data-act="os.goalProgressMode" data-id="' + g.id + '" data-mode="abgeleitet"> aus Meilensteinen</label>' +
          '</div>' +
          (g.progressMode === 'abgeleitet'
            ? '<div style="margin-top:10px">' + OS.ui.progressBar(progress) + '<span class="field-help">' + progress + ' % aus ' + linked.length + ' ' + U.plural(linked.length, 'Projekt', 'Projekten') + '</span></div>'
            : '<div class="progress-input" style="margin-top:10px">' +
              '<input type="range" min="0" max="100" step="5" value="' + progress + '" data-store="goal:' + g.id + ':progress" data-rerender>' +
              '<span class="progress-value">' + progress + ' %</span></div>') +
        '</div>' +

        '<div class="field">' +
          '<div class="spread"><span class="field-label">Zugeordnete Projekte</span>' +
            '<button class="btn btn-quiet btn-sm" data-act="os.projectNew" data-goal="' + g.id + '">' + U.icons.plus + ' Projekt</button></div>' +
          (linked.length ? '<div class="list">' + linked.map(p =>
            '<div class="list-item"><div class="li-main">' +
              '<button class="li-title link-btn" data-act="os.projectOpen" data-id="' + p.id + '">' + U.esc(p.name) + '</button>' +
              '<div class="li-meta">' + OS.ui.statusChip(p.status) + '<span class="chip">' + S.projectProgress(p) + ' %</span></div>' +
            '</div></div>').join('') + '</div>'
            : '<span class="field-help">Noch kein Projekt zugeordnet. Ziele dürfen auch ohne Projekt bestehen.</span>') +
        '</div>' +

        '<div class="row" style="justify-content:flex-end;gap:8px;padding-top:6px;border-top:1px solid var(--line)">' +
          '<button class="btn btn-quiet btn-sm" data-act="os.goalDelete" data-id="' + g.id + '">Löschen</button>' +
          '<button class="btn btn-sm btn-primary" data-modal-close>Fertig</button>' +
        '</div>';
    };

    detailModal(render);
  }

  /* --- Idee ---------------------------------------------------------- */

  function idea(id) {
    const existing = id ? S.find('idea', id) : null;
    const i = existing || { title: '', notes: '', tags: [], areaId: null, priority: 'mittel' };

    OS.ui.form({
      title: existing ? 'Idee' : 'Neue Idee',
      subtitle: existing ? '' : 'Ohne Verpflichtung. Ideen dürfen liegen bleiben.',
      submitLabel: existing ? 'Speichern' : 'Aufnehmen',
      fields: [
        { name: 'title', label: 'Idee', value: i.title, placeholder: 'Was ist dir eingefallen?', autofocus: true },
        { name: 'notes', type: 'textarea', rows: 3, label: 'Notiz', value: i.notes, placeholder: 'Optional' },
        {
          type: 'row', fields: [
            { name: 'areaId', type: 'select', label: 'Lebensbereich', value: i.areaId || '', options: OS.ui.areaOptions() },
            {
              name: 'priority', type: 'select', label: 'Priorität', value: i.priority, options: [
                { value: 'hoch', label: 'Hoch' }, { value: 'mittel', label: 'Mittel' }, { value: 'niedrig', label: 'Niedrig' }
              ]
            }
          ]
        },
        { name: 'tags', label: 'Tags', value: (i.tags || []).join(', '), placeholder: 'mit Komma getrennt' }
      ],
      onSubmit: function (v) {
        const title = String(v.title || '').trim();
        if (!title) { OS.ui.toast('Die Idee braucht einen Satz.'); return false; }
        S.update(() => {
          const target = existing || S.addIdea({});
          target.title = title;
          target.notes = v.notes || '';
          target.areaId = v.areaId || null;
          target.priority = v.priority || 'mittel';
          target.tags = String(v.tags || '').split(',').map(s => s.trim()).filter(Boolean);
        });
      }
    });
  }

  /* --- Saison --------------------------------------------------------- */

  function season(id) {
    const existing = id ? S.find('season', id) : null;
    const weeks = S.state.settings.seasonWeeks || 12;
    const s = existing || {
      title: '', motto: '', start: U.today(), end: U.addDays(U.today(), weeks * 7 - 1)
    };

    OS.ui.form({
      title: existing ? 'Saison bearbeiten' : 'Neue Saison',
      subtitle: 'Eine Saison dauert 6 bis 12 Wochen. Sie schützt davor, alles gleichzeitig zu wollen.',
      submitLabel: existing ? 'Speichern' : 'Saison starten',
      fields: [
        { name: 'title', label: 'Titel', value: s.title, placeholder: 'z. B. Herbst', autofocus: true },
        { name: 'motto', label: 'Motto (optional)', value: s.motto, placeholder: 'Ein Satz, der die Saison trägt' },
        {
          type: 'row', fields: [
            { name: 'start', type: 'date', label: 'Start', value: s.start || '' },
            { name: 'end', type: 'date', label: 'Ende', value: s.end || '' }
          ]
        },
        { type: 'note', tone: 'note-quiet', text: 'Empfohlen sind 6 bis 12 Wochen. Kürzere Saisons wirken oft klarer.' }
      ],
      onSubmit: function (v) {
        const title = String(v.title || '').trim();
        if (!title) { OS.ui.toast('Die Saison braucht einen Titel.'); return false; }
        if (v.start && v.end && v.end < v.start) { OS.ui.toast('Das Ende liegt vor dem Start.'); return false; }
        S.update(() => {
          const target = existing || S.addSeason({});
          target.title = title;
          target.motto = v.motto || '';
          target.start = v.start || U.today();
          target.end = v.end || U.addDays(target.start, 12 * 7 - 1);
        });
      }
    });
  }

  /* --- Lebensbereich & Gewohnheit -------------------------------------- */

  function area(id) {
    const existing = id ? S.find('area', id) : null;
    const a = existing || { name: '', color: S.AREA_COLORS[S.state.areas.length % S.AREA_COLORS.length] };

    OS.ui.form({
      title: existing ? 'Lebensbereich' : 'Neuer Lebensbereich',
      submitLabel: existing ? 'Speichern' : 'Anlegen',
      size: 'sm',
      fields: [
        { name: 'name', label: 'Name', value: a.name, placeholder: 'Wie nennst du diesen Bereich?', autofocus: true },
        {
          name: 'color', type: 'select', label: 'Farbe', value: a.color,
          options: S.AREA_COLORS.map((c, i) => ({ value: c, label: 'Ton ' + (i + 1) }))
        }
      ],
      onSubmit: function (v) {
        const name = String(v.name || '').trim();
        if (!name) return false;
        S.update(() => {
          const target = existing || S.addArea({});
          target.name = name;
          target.color = v.color || target.color;
        });
      }
    });
  }

  function habit(id) {
    const existing = id ? S.find('habit', id) : null;
    OS.ui.form({
      title: existing ? 'Gewohnheit' : 'Neue Gewohnheit',
      submitLabel: existing ? 'Speichern' : 'Anlegen',
      size: 'sm',
      fields: [
        { name: 'name', label: 'Gewohnheit', value: existing ? existing.name : '', placeholder: 'Klein, täglich machbar', autofocus: true }
      ],
      onSubmit: function (v) {
        const name = String(v.name || '').trim();
        if (!name) return false;
        S.update(() => {
          const target = existing || S.addHabit({});
          target.name = name;
        });
      }
    });
  }

  /* --- Aufgabe planen --------------------------------------------------- */

  function planTask(id) {
    const t = S.find('task', id);
    if (!t) return;
    const today = U.today();

    OS.ui.modal({
      title: 'Verschieben',
      subtitle: U.trunc(t.title, 60),
      size: 'sm',
      body: '<div class="stack" style="gap:8px">' +
        [
          { label: 'Heute', date: today },
          { label: 'Morgen', date: U.addDays(today, 1) },
          { label: 'Nächster Montag', date: U.addDays(U.startOfWeek(today), 7) },
          { label: 'Ohne Datum', date: '' }
        ].map(opt =>
          '<button class="btn btn-block" data-plan="' + opt.date + '">' + opt.label +
          (opt.date ? '<span class="muted tiny" style="margin-left:auto">' + U.fmtShort(opt.date) + '</span>' : '') + '</button>').join('') +
        '<label class="field" style="margin-top:6px"><span class="field-label">Anderes Datum</span>' +
        '<input class="input" type="date" data-plan-date value="' + U.esc(t.date || '') + '"></label>' +
        '<button class="btn btn-quiet btn-block" data-archive style="margin-top:4px">Archivieren</button>' +
        '</div>',
      onMount: function (root, api) {
        root.querySelectorAll('[data-plan]').forEach(btn => {
          btn.addEventListener('click', () => {
            S.update(() => { t.date = btn.getAttribute('data-plan') || null; });
            api.close();
          });
        });
        root.querySelector('[data-plan-date]').addEventListener('change', e => {
          S.update(() => { t.date = e.target.value || null; });
          api.close();
        });
        root.querySelector('[data-archive]').addEventListener('click', () => {
          S.update(() => { t.status = 'archived'; });
          api.close();
          OS.ui.toast('Archiviert.');
        });
      }
    });
  }

  return {
    task, block, project, projectDetail, canActivate,
    goal, goalDetail, summarize,
    idea, season, area, habit, planTask,
    detailModal, refresh,
    get openDetail() { return openDetail; }
  };
})();
