/* ===========================================================
   OS — Ansicht: Saison
   6 bis 12 Wochen. Nicht alles gleichzeitig.
   =========================================================== */

OS.views.saison = (function () {
  'use strict';

  const U = OS.util;
  const S = OS.store;

  function seasonOf(params) {
    if (params && params.s) {
      const found = S.find('season', params.s);
      if (found) return found;
    }
    return S.currentSeason();
  }

  /* --- Kopf --------------------------------------------------------- */

  function hero(season) {
    const p = S.seasonProgress(season);
    const goals = S.seasonGoals(season.id);
    const areas = [];
    goals.forEach(g => {
      const a = S.area(g.areaId);
      if (a && !areas.some(x => x.id === a.id)) areas.push(a);
    });

    return '<div class="season-hero">' +
      '<div class="spread" style="align-items:flex-start">' +
        '<div style="flex:1;min-width:0">' +
          '<span class="overline">Saison</span>' +
          '<input class="line-input season-title" style="margin-top:8px;display:block" value="' + U.esc(season.title) + '" ' +
            'placeholder="Titel der Saison" data-store="season:' + season.id + ':title">' +
          '<input class="line-input season-motto" style="display:block" value="' + U.esc(season.motto) + '" ' +
            'placeholder="Motto (optional)" data-store="season:' + season.id + ':motto">' +
          '<div class="season-dates">' +
            U.esc(U.fmtMedium(season.start)) + ' bis ' + U.esc(U.fmtMedium(season.end)) +
            ' · <button class="link-btn" data-act="saison.edit" data-id="' + season.id + '">Zeitraum ändern</button>' +
          '</div>' +
        '</div>' +
        '<div class="row row-tight">' + seasonSwitcher(season) + '</div>' +
      '</div>' +
      '<div class="season-timeline">' +
        OS.ui.progressBar(p.pct) +
        '<div class="season-time-meta">' +
          '<span>Woche ' + p.week + ' von ' + p.weeks + '</span>' +
          '<span>' + (p.daysLeft > 0 ? 'noch ' + p.daysLeft + ' ' + U.plural(p.daysLeft, 'Tag', 'Tage') : 'abgelaufen') + '</span>' +
        '</div>' +
      '</div>' +
      (areas.length ? '<div class="chips" style="margin-top:18px">' +
        areas.map(a => OS.ui.areaChip(a.id)).join('') + '</div>' : '') +
      '</div>';
  }

  function seasonSwitcher(current) {
    const list = S.state.seasons.filter(s => !s.archived);
    if (list.length < 2) return '<button class="btn btn-sm" data-act="saison.new">Neue Saison</button>';
    return '<select class="select" style="width:auto" data-act="saison.switch">' +
      list.map(s => '<option value="' + s.id + '"' + (s.id === current.id ? ' selected' : '') + '>' +
        U.esc(s.title || 'Saison') + '</option>').join('') +
      '</select>' +
      '<button class="btn btn-sm" data-act="saison.new">Neue Saison</button>';
  }

  /* --- Ziele --------------------------------------------------------- */

  function goalCard(goal) {
    const progress = S.goalProgress(goal);
    const linked = S.projects({ goalId: goal.id });

    return '<article class="card card-hover goal-card">' +
      '<div class="card-head">' +
        '<div>' +
          '<span class="overline">' + U.esc(S.GOAL_STATUS_LABEL[goal.status] || '') + '</span>' +
          '<h3 style="margin-top:6px">' + U.esc(goal.title || 'Ohne Titel') + '</h3>' +
        '</div>' +
        OS.ui.iconBtn('edit', 'os.goalOpen', 'Öffnen', 'data-id="' + goal.id + '"') +
      '</div>' +
      (goal.why ? '<div class="goal-why">' + U.nl2br(U.trunc(goal.why, 220)) + '</div>' : '') +
      (goal.metric ? '<div class="goal-metric">' + U.nl2br(U.trunc(goal.metric, 200)) + '</div>' : '') +
      (goal.summary ? '<div class="tiny muted" style="white-space:pre-wrap">' + U.esc(U.trunc(goal.summary, 260)) + '</div>' : '') +
      '<div class="goal-foot">' +
        '<div class="spread" style="margin-bottom:6px">' +
          '<span class="tiny muted">' + (goal.progressMode === 'abgeleitet' ? 'aus Meilensteinen' : 'Fortschritt') + '</span>' +
          '<span class="tiny muted">' + progress + ' %</span>' +
        '</div>' +
        OS.ui.progressBar(progress) +
        (linked.length
          ? '<div class="goal-projects">' + linked.map(p =>
            '<button class="goal-project-link" data-act="os.projectOpen" data-id="' + p.id + '">' +
              '<i class="dot dot-' + U.esc(p.status) + '"></i>' + U.esc(U.trunc(p.name, 34)) +
              '<span class="tiny muted" style="margin-left:auto">' + S.projectProgress(p) + ' %</span>' +
            '</button>').join('') + '</div>'
          : '<div class="tiny muted" style="margin-top:10px">Noch kein Projekt zugeordnet.</div>') +
        '<div class="chips" style="margin-top:12px">' +
          OS.ui.areaChip(goal.areaId) +
          '<button class="chip chip-btn" data-act="os.projectNew" data-goal="' + goal.id + '">' + U.icons.plus + ' Projekt</button>' +
        '</div>' +
      '</div>' +
      '</article>';
  }

  function goalSection(season) {
    const goals = S.seasonGoals(season.id);
    return '<section class="section">' +
      '<div class="section-head">' +
        '<h2>Saisonziele</h2>' +
        '<div class="section-tools">' +
          '<span class="tiny muted">' + goals.length + ' von 3–5</span>' +
          '<button class="btn btn-sm" data-act="saison.newGoal" data-id="' + season.id + '">Ziel</button>' +
        '</div>' +
      '</div>' +
      (goals.length
        ? '<div class="grid grid-auto">' + goals.map(goalCard).join('') + '</div>'
        : OS.ui.emptyState('Noch keine Saisonziele',
          'Drei bis fünf Ziele geben einer Saison Form. Weniger ist meistens klarer.',
          '<button class="btn btn-sm" data-act="saison.newGoal" data-id="' + season.id + '">Erstes Ziel</button>' +
          (S.topWishes().length ? ' <button class="btn btn-sm" data-act="saison.fromWishes">Aus den Top 5 wählen</button>' : ''))) +
      (goals.length > 5 ? '<div class="note" style="margin-top:16px">' + goals.length +
        ' Ziele in einer Saison. Was davon trägt wirklich – und was darf in die nächste Saison?</div>' : '') +
      '</section>';
  }

  /* --- Projekte ohne Ziel ---------------------------------------------- */

  function orphanSection() {
    const orphans = S.orphanProjects();
    if (!orphans.length) return '';
    return '<section class="section">' +
      '<div class="section-head"><h3>Ohne Ziel</h3></div>' +
      '<div class="note">Diese Projekte zahlen auf kein Ziel ein. Vielleicht ist dies eine Idee für später.</div>' +
      '<div class="list" style="margin-top:12px">' + orphans.map(p =>
        '<div class="list-item"><div class="li-main">' +
          '<button class="li-title link-btn" data-act="os.projectOpen" data-id="' + p.id + '">' + U.esc(p.name) + '</button>' +
          '<div class="li-meta">' + OS.ui.statusChip(p.status) + OS.ui.areaChip(p.areaId) + '</div>' +
        '</div>' +
        '<button class="btn btn-sm" data-act="saison.toIdea" data-id="' + p.id + '">In Ideen verschieben</button>' +
        '</div>').join('') + '</div>' +
      '</section>';
  }

  /* --- Nicht in dieser Saison ------------------------------------------- */

  function notSection(season) {
    const list = season.notList || [];
    return '<section class="section">' +
      '<div class="section-head"><h3>Nicht in dieser Saison</h3>' +
        '<button class="link-btn" data-act="saison.addNot" data-id="' + season.id + '">Hinzufügen</button></div>' +
      '<p class="small muted" style="margin-bottom:12px">Was du bewusst weglässt, macht den Rest möglich.</p>' +
      (list.length
        ? '<div class="list not-list">' + list.map(item =>
          '<div class="list-item"><div class="li-main"><div class="li-title">' + U.esc(item.text) + '</div></div>' +
          '<div class="li-actions">' + OS.ui.iconBtn('trash', 'saison.removeNot', 'Entfernen', 'data-id="' + season.id + '" data-item="' + item.id + '"') + '</div></div>').join('') + '</div>'
        : '<div class="empty">Noch nichts eingetragen.</div>') +
      '</section>';
  }

  /* --- Reviews ---------------------------------------------------------- */

  function reviewSection(season) {
    const list = S.reviews().filter(r => r.seasonId === season.id);
    if (!list.length) return '';
    return '<section class="section">' +
      '<div class="section-head"><h3>Reviews dieser Saison</h3></div>' +
      '<div class="list">' + list.map(r =>
        '<div class="list-item"><div class="li-main">' +
          '<div class="li-title">' + (r.type === 'saison' ? 'Saisonreview' : 'Mid-Season-Review') + '</div>' +
          '<div class="li-meta"><span class="tiny muted">' + U.esc(U.fmtMedium(r.createdAt.slice(0, 10))) + '</span></div>' +
        '</div>' +
        '<button class="btn btn-sm" data-act="system.openReview" data-id="' + r.id + '">Ansehen</button>' +
        '</div>').join('') + '</div>' +
      '</section>';
  }

  /* --- Rendern ----------------------------------------------------------- */

  function render(params) {
    const season = seasonOf(params);

    if (!season) {
      return '<div class="page-head"><span class="overline">Saison</span>' +
        '<h1 style="margin-top:12px">Noch keine Saison</h1>' +
        '<div class="page-sub">Eine Saison dauert 6 bis 12 Wochen und trägt drei bis fünf Ziele. ' +
        'Sie verhindert, dass alles gleichzeitig wichtig ist.</div></div>' +
        OS.ui.emptyState('Saison anlegen',
          'Gib ihr einen Titel, einen Zeitraum und – wenn du magst – ein Motto.',
          '<button class="btn btn-primary btn-sm" data-act="saison.new">Saison anlegen</button>');
    }

    return hero(season) +
      goalSection(season) +
      orphanSection() +
      '<div class="grid grid-2" style="align-items:start">' +
        '<div>' + notSection(season) + '</div>' +
        '<div>' + reviewSection(season) + '</div>' +
      '</div>' +
      '<div class="row" style="margin-top:40px;justify-content:flex-end">' +
        '<button class="btn btn-sm" data-act="saison.review" data-id="' + season.id + '">Mid-Season-Review</button>' +
        '<button class="btn btn-sm" data-act="saison.archive" data-id="' + season.id + '">Saison archivieren</button>' +
      '</div>';
  }

  /* --- Top-5-Auswahl ------------------------------------------------------ */

  function fromWishes(seasonId) {
    const top = S.topWishes();
    const season = S.find('season', seasonId) || S.currentSeason();
    if (!season) return;
    const alreadyFromWishes = S.seasonGoals(season.id).filter(g => g.fromWishId).length;

    OS.ui.modal({
      title: 'Aus den Top 5',
      subtitle: 'Aktiviere ein bis zwei dieser Ziele für diese Saison. Der Rest bleibt sichtbar, aber ruhig.',
      body: '<div class="stack" style="gap:10px">' +
        (alreadyFromWishes >= 2 ? '<div class="note">Zwei Top-Ziele sind bereits in dieser Saison. Mehr verwässert die Saison.</div>' : '') +
        top.map(w => {
          const used = S.state.goals.some(g => g.fromWishId === w.id && g.seasonId === season.id);
          return '<div class="list-item"><div class="li-main"><div class="li-title">' + U.esc(w.text) + '</div></div>' +
            (used ? '<span class="chip chip-green">in dieser Saison</span>'
              : '<button class="btn btn-sm" data-wish="' + w.id + '"' + (alreadyFromWishes >= 2 ? ' disabled' : '') + '>Aktivieren</button>') +
            '</div>';
        }).join('') +
        (!top.length ? '<div class="empty">Noch keine Top 5. Die 25/5-Methode findest du unter Projekte &amp; Ziele.</div>' : '') +
        '</div>',
      onMount: function (root, api) {
        root.querySelectorAll('[data-wish]').forEach(btn => btn.addEventListener('click', () => {
          const wish = S.find('wish', btn.getAttribute('data-wish'));
          if (!wish) return;
          api.close();
          OS.forms.goal({
            title: wish.text, horizon: 'saison', seasonId: season.id, fromWishId: wish.id
          });
        }));
      }
    });
  }

  /* --- Aktionen ------------------------------------------------------------ */

  const actions = {
    'saison.new': function () { OS.forms.season(); },
    'saison.edit': function (el, ds) { OS.forms.season(ds.id); },
    'saison.switch': function (el) { OS.app.go('#/saison?s=' + el.value); },
    'saison.newGoal': function (el, ds) {
      const season = S.find('season', ds.id) || S.currentSeason();
      OS.forms.goal({ horizon: 'saison', seasonId: season ? season.id : null });
    },
    'saison.fromWishes': function () {
      const season = S.currentSeason();
      if (season) fromWishes(season.id);
    },
    'saison.review': function (el, ds) { OS.views.system.seasonReview(ds.id, 'mid'); },
    'saison.addNot': async function (el, ds) {
      const text = await OS.ui.prompt({
        title: 'Nicht in dieser Saison',
        label: 'Was verschiebst du bewusst?',
        placeholder: 'Ein Thema, das später dran ist'
      });
      if (!text) return;
      S.update(() => {
        const season = S.find('season', ds.id);
        if (!season) return;
        if (!Array.isArray(season.notList)) season.notList = [];
        season.notList.push({ id: U.uid('nl'), text: text });
      });
    },
    'saison.removeNot': function (el, ds) {
      S.update(() => {
        const season = S.find('season', ds.id);
        if (!season) return;
        const i = season.notList.findIndex(x => x.id === ds.item);
        if (i >= 0) season.notList.splice(i, 1);
      });
    },
    'saison.toIdea': function (el, ds) {
      S.update(() => {
        const p = S.find('project', ds.id);
        if (!p) return;
        S.addIdea({ title: p.name, notes: p.why, areaId: p.areaId, status: 'idee' });
        S.remove('project', p.id);
      });
      OS.ui.toast('In Ideen & Backlog verschoben.');
    },
    'saison.archive': async function (el, ds) {
      const ok = await OS.ui.confirm({
        title: 'Saison archivieren?',
        text: 'Die Saison wandert ins Archiv. Ziele und Projekte bleiben erhalten.',
        confirmLabel: 'Archivieren'
      });
      if (!ok) return;
      S.update(() => {
        const season = S.find('season', ds.id);
        if (season) season.archived = true;
      });
      OS.app.go('#/saison');
    }
  };

  return { render: render, actions: actions, fromWishes: fromWishes, title: 'Saison' };
})();
