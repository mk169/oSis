/* ===========================================================
   OS — Store
   Datenmodell, lokale Persistenz, Selektoren, Export/Import.
   Die App startet leer. Nichts wird vorbefüllt.
   =========================================================== */

OS.store = (function () {
  'use strict';

  const U = OS.util;
  const KEY = 'os.state.v1';
  const VERSION = 1;

  const PROJECT_STATUS = ['idee', 'geplant', 'aktiv', 'pausiert', 'abgeschlossen', 'archiviert'];
  const PROJECT_STATUS_LABEL = {
    idee: 'Idee', geplant: 'Geplant', aktiv: 'Aktiv',
    pausiert: 'Pausiert', abgeschlossen: 'Abgeschlossen', archiviert: 'Archiviert'
  };
  const GOAL_STATUS_LABEL = {
    offen: 'Offen', laeuft: 'Läuft', erreicht: 'Erreicht', verworfen: 'Verworfen'
  };
  const HORIZON_LABEL = { saison: 'Saison', jahr: 'Jahr', lang: 'Langfristig' };
  const IDEA_STATUS_LABEL = { idee: 'Idee', geparkt: 'Geparkt', archiviert: 'Archiviert' };
  const INBOX_KIND_LABEL = { aufgabe: 'Aufgabe', idee: 'Idee', sorge: 'Sorge' };

  const ACCENTS = [
    { id: 'terracotta', label: 'Terracotta', value: '#B4643C', soft: '#F4E7DE', dark: '#D08B62', darkSoft: '#2E241E' },
    { id: 'ocker', label: 'Ocker', value: '#A17C36', soft: '#F3EBDA', dark: '#C6A05B', darkSoft: '#2B2619' },
    { id: 'indigo', label: 'Indigo', value: '#4F5F86', soft: '#E6E9F1', dark: '#8296C4', darkSoft: '#1E2230' },
    { id: 'pflaume', label: 'Pflaume', value: '#7A4E63', soft: '#F2E7EC', dark: '#B0819A', darkSoft: '#2A1F26' },
    { id: 'salbei', label: 'Salbei', value: '#5B7A62', soft: '#E8EFE8', dark: '#8FB294', darkSoft: '#1E2620' }
  ];

  const AREA_COLORS = ['#57705C', '#B4643C', '#4F5F86', '#7A4E63', '#A17C36', '#5E6A70', '#7C6A55', '#48706F'];

  /* --- Grundzustand ------------------------------------------- */

  function blank() {
    const now = new Date().toISOString();
    return {
      version: VERSION,
      meta: { createdAt: now, updatedAt: now },
      settings: {
        accent: 'terracotta',
        theme: 'light',
        dailyCapacityHours: 6,
        maxTasksPerDay: 3,
        maxActiveProjects: 5,
        seasonWeeks: 12
      },
      areas: [],
      seasons: [],
      goals: [],
      projects: [],
      tasks: [],
      inbox: [],
      ideas: [],
      habits: [],
      days: {},
      weeks: {},
      reviews: [],
      method255: { wishes: [], step: 1, completedAt: null },
      templates: []
    };
  }

  /* --- Persistenz ---------------------------------------------- */

  let state = blank();
  let ready = false;
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return migrate(parsed);
    } catch (err) {
      console.warn('OS: Zustand konnte nicht gelesen werden.', err);
      return null;
    }
  }

  function migrate(data) {
    const base = blank();
    const next = Object.assign({}, base, data || {});
    next.settings = Object.assign({}, base.settings, data && data.settings);
    next.meta = Object.assign({}, base.meta, data && data.meta);
    next.method255 = Object.assign({}, base.method255, data && data.method255);
    ['areas', 'seasons', 'goals', 'projects', 'tasks', 'inbox', 'ideas', 'habits', 'reviews', 'templates']
      .forEach(k => { if (!Array.isArray(next[k])) next[k] = []; });
    if (!next.days || typeof next.days !== 'object') next.days = {};
    if (!next.weeks || typeof next.weeks !== 'object') next.weeks = {};
    if (!Array.isArray(next.method255.wishes)) next.method255.wishes = [];
    next.version = VERSION;
    return next;
  }

  let saveTimer = null;
  function save(immediate) {
    state.meta.updatedAt = new Date().toISOString();
    const write = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (err) {
        console.error('OS: Speichern fehlgeschlagen.', err);
        if (OS.ui && OS.ui.toast) OS.ui.toast('Speichern fehlgeschlagen. Speicher voll?');
      }
    };
    if (immediate) { clearTimeout(saveTimer); write(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(write, 180);
  }

  function init() {
    if (ready) return state;
    const loaded = load();
    state = loaded || blank();
    ready = true;
    if (!loaded) save(true);
    return state;
  }

  function subscribe(fn) { listeners.push(fn); return () => {
    const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1);
  }; }

  function emit() { listeners.slice().forEach(fn => fn(state)); }

  /** Mutation mit Neuzeichnen */
  function update(mutator) {
    const result = mutator ? mutator(state) : undefined;
    save();
    emit();
    return result;
  }

  /** Mutation ohne Neuzeichnen (z. B. laufende Texteingabe) */
  function silent(mutator) {
    const result = mutator ? mutator(state) : undefined;
    save();
    return result;
  }

  function isEmpty() {
    return !state.areas.length && !state.projects.length && !state.goals.length &&
      !state.tasks.length && !state.inbox.length && !state.ideas.length &&
      !state.seasons.length && !state.habits.length && !state.method255.wishes.length;
  }

  /* --- Tagesobjekte / Wochenobjekte ---------------------------- */

  function dayDefaults() {
    return {
      intention: '',
      oneThing: '',
      checkin: { energy: null, mood: '', note: '' },
      close: { done: '', takeaway: '', closedAt: null },
      blocks: []
    };
  }

  function weekDefaults() {
    return { focus: '', top3: ['', '', ''], notThisWeek: [] };
  }

  /** Lesend – legt nichts an */
  function getDay(key) {
    const d = state.days[key];
    if (!d) return Object.assign(dayDefaults(), { _key: key });
    return Object.assign(dayDefaults(), d, {
      checkin: Object.assign(dayDefaults().checkin, d.checkin),
      close: Object.assign(dayDefaults().close, d.close),
      blocks: Array.isArray(d.blocks) ? d.blocks : [],
      _key: key
    });
  }

  /** Schreibend – legt bei Bedarf an */
  function ensureDay(key) {
    if (!state.days[key]) state.days[key] = dayDefaults();
    const d = state.days[key];
    if (!d.checkin) d.checkin = dayDefaults().checkin;
    if (!d.close) d.close = dayDefaults().close;
    if (!Array.isArray(d.blocks)) d.blocks = [];
    return d;
  }

  function getWeek(key) {
    const w = state.weeks[key];
    if (!w) return Object.assign(weekDefaults(), { _key: key });
    return Object.assign(weekDefaults(), w, {
      top3: Array.isArray(w.top3) ? w.top3.concat(['', '', '']).slice(0, 3) : ['', '', ''],
      notThisWeek: Array.isArray(w.notThisWeek) ? w.notThisWeek : [],
      _key: key
    });
  }

  function ensureWeek(key) {
    if (!state.weeks[key]) state.weeks[key] = weekDefaults();
    const w = state.weeks[key];
    if (!Array.isArray(w.top3)) w.top3 = ['', '', ''];
    while (w.top3.length < 3) w.top3.push('');
    if (!Array.isArray(w.notThisWeek)) w.notThisWeek = [];
    return w;
  }

  /* --- Generischer Feldzugriff --------------------------------- */

  const COLLECTIONS = {
    task: 'tasks', project: 'projects', goal: 'goals', idea: 'ideas',
    area: 'areas', habit: 'habits', season: 'seasons', inbox: 'inbox',
    review: 'reviews', template: 'templates'
  };

  function find(kind, id) {
    if (kind === 'day') return ensureDay(id);
    if (kind === 'week') return ensureWeek(id);
    if (kind === 'settings') return state.settings;
    if (kind === 'method') return state.method255;
    if (kind === 'wish') return state.method255.wishes.find(w => w.id === id);
    const coll = COLLECTIONS[kind];
    if (!coll) return null;
    return state[coll].find(item => item.id === id);
  }

  function all(kind) {
    const coll = COLLECTIONS[kind];
    return coll ? state[coll] : [];
  }

  /** data-store="kind:id:pfad" */
  function setField(kind, id, path, value, opts) {
    const target = find(kind, id);
    if (!target) return null;
    U.setPath(target, path, value);
    if (target.updatedAt !== undefined || COLLECTIONS[kind]) target.updatedAt = new Date().toISOString();
    if (opts && opts.rerender) { save(); emit(); } else { save(); }
    return target;
  }

  function remove(kind, id) {
    const coll = COLLECTIONS[kind];
    if (!coll) return;
    const i = state[coll].findIndex(item => item.id === id);
    if (i >= 0) state[coll].splice(i, 1);
  }

  /* --- Fabriken ------------------------------------------------ */

  function nextOrder(list) {
    return list.reduce((max, item) => Math.max(max, (item.order ?? 0) + 1), 0);
  }

  function addTask(data) {
    const task = Object.assign({
      id: U.uid('t'),
      title: '',
      notes: '',
      status: 'open',
      date: null,
      projectId: null,
      goalId: null,
      areaId: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      order: nextOrder(state.tasks)
    }, data || {});
    state.tasks.push(task);
    return task;
  }

  function addProject(data) {
    const project = Object.assign({
      id: U.uid('p'),
      name: '',
      why: '',
      outcome: '',
      nextAction: '',
      milestones: [],
      start: null,
      due: null,
      status: 'geplant',
      goalIds: [],
      areaId: null,
      notes: '',
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      order: nextOrder(state.projects)
    }, data || {});
    if (!Array.isArray(project.goalIds)) project.goalIds = project.goalIds ? [project.goalIds] : [];
    state.projects.push(project);
    return project;
  }

  function addGoal(data) {
    const goal = Object.assign({
      id: U.uid('g'),
      title: '',
      why: '',
      metric: '',
      horizon: 'saison',
      seasonId: null,
      areaId: null,
      status: 'offen',
      progress: 0,
      progressMode: 'manuell',
      framework: { type: 'frei', fields: {} },
      summary: '',
      start: null,
      end: null,
      fromWishId: null,
      createdAt: new Date().toISOString(),
      order: nextOrder(state.goals)
    }, data || {});
    if (!goal.framework) goal.framework = { type: 'frei', fields: {} };
    state.goals.push(goal);
    return goal;
  }

  function addIdea(data) {
    const idea = Object.assign({
      id: U.uid('i'),
      title: '',
      notes: '',
      tags: [],
      areaId: null,
      priority: 'mittel',
      status: 'idee',
      createdAt: new Date().toISOString(),
      order: nextOrder(state.ideas)
    }, data || {});
    state.ideas.push(idea);
    return idea;
  }

  function addInbox(data) {
    const item = Object.assign({
      id: U.uid('n'),
      text: '',
      kind: 'aufgabe',
      createdAt: new Date().toISOString()
    }, data || {});
    state.inbox.unshift(item);
    return item;
  }

  function addArea(data) {
    const area = Object.assign({
      id: U.uid('a'),
      name: '',
      color: AREA_COLORS[state.areas.length % AREA_COLORS.length],
      archived: false,
      order: nextOrder(state.areas)
    }, data || {});
    state.areas.push(area);
    return area;
  }

  function addHabit(data) {
    const habit = Object.assign({
      id: U.uid('h'),
      name: '',
      archived: false,
      log: {},
      order: nextOrder(state.habits)
    }, data || {});
    state.habits.push(habit);
    return habit;
  }

  function addSeason(data) {
    const season = Object.assign({
      id: U.uid('s'),
      title: '',
      motto: '',
      start: U.today(),
      end: U.addDays(U.today(), 12 * 7 - 1),
      notList: [],
      archived: false,
      createdAt: new Date().toISOString()
    }, data || {});
    if (!Array.isArray(season.notList)) season.notList = [];
    state.seasons.push(season);
    return season;
  }

  function addReview(data) {
    const review = Object.assign({
      id: U.uid('r'),
      type: 'woche',
      periodKey: U.weekKey(U.today()),
      seasonId: null,
      answers: {},
      goalRatings: {},
      createdAt: new Date().toISOString()
    }, data || {});
    state.reviews.unshift(review);
    return review;
  }

  function addTemplate(data) {
    const tpl = Object.assign({
      id: U.uid('tpl'),
      kind: 'ziel',
      name: '',
      payload: {},
      createdAt: new Date().toISOString()
    }, data || {});
    state.templates.push(tpl);
    return tpl;
  }

  /* --- Selektoren ---------------------------------------------- */

  function areas(includeArchived) {
    return state.areas
      .filter(a => includeArchived || !a.archived)
      .slice().sort(U.byOrder);
  }

  function area(id) { return state.areas.find(a => a.id === id) || null; }

  function habits(includeArchived) {
    return state.habits
      .filter(h => includeArchived || !h.archived)
      .slice().sort(U.byOrder);
  }

  function habitDone(habit, dateKey) {
    return !!(habit && habit.log && habit.log[dateKey]);
  }

  function toggleHabit(habitId, dateKey) {
    const h = find('habit', habitId);
    if (!h) return;
    if (!h.log) h.log = {};
    if (h.log[dateKey]) delete h.log[dateKey];
    else h.log[dateKey] = true;
  }

  function tasks(filter) {
    let list = state.tasks.slice();
    const f = filter || {};
    if (f.date !== undefined) list = list.filter(t => t.date === f.date);
    if (f.status) list = list.filter(t => (Array.isArray(f.status) ? f.status.includes(t.status) : t.status === f.status));
    if (f.projectId) list = list.filter(t => t.projectId === f.projectId);
    if (f.notArchived) list = list.filter(t => t.status !== 'archived');
    return list.sort((a, b) => {
      const s = (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0);
      return s !== 0 ? s : U.byOrder(a, b);
    });
  }

  function dayTasks(dateKey) {
    return tasks({ date: dateKey, notArchived: true });
  }

  function openDayTasks(dateKey) {
    return tasks({ date: dateKey, status: 'open' });
  }

  function unplannedTasks() {
    return state.tasks
      .filter(t => !t.date && t.status === 'open')
      .sort(U.byOrder);
  }

  function toggleTask(taskId) {
    const t = find('task', taskId);
    if (!t) return;
    if (t.status === 'done') { t.status = 'open'; t.completedAt = null; }
    else { t.status = 'done'; t.completedAt = new Date().toISOString(); }
  }

  function projects(filter) {
    const f = filter || {};
    let list = state.projects.slice();
    if (f.status) list = list.filter(p => (Array.isArray(f.status) ? f.status.includes(p.status) : p.status === f.status));
    if (f.goalId) list = list.filter(p => (p.goalIds || []).includes(f.goalId));
    if (f.areaId) list = list.filter(p => p.areaId === f.areaId);
    if (f.live) list = list.filter(p => !['abgeschlossen', 'archiviert'].includes(p.status));
    return list.sort(U.byOrder);
  }

  function activeProjects() { return projects({ status: 'aktiv' }); }

  function projectProgress(project) {
    if (!project) return 0;
    const ms = project.milestones || [];
    if (!ms.length) return project.status === 'abgeschlossen' ? 100 : 0;
    return Math.round(ms.filter(m => m.done).length / ms.length * 100);
  }

  function goals(filter) {
    const f = filter || {};
    let list = state.goals.slice();
    if (f.horizon) list = list.filter(g => g.horizon === f.horizon);
    if (f.seasonId) list = list.filter(g => g.seasonId === f.seasonId);
    if (f.areaId) list = list.filter(g => g.areaId === f.areaId);
    if (f.open) list = list.filter(g => !['erreicht', 'verworfen'].includes(g.status));
    return list.sort(U.byOrder);
  }

  function seasonGoals(seasonId) {
    return state.goals.filter(g => g.seasonId === seasonId).sort(U.byOrder);
  }

  function goalProgress(goal) {
    if (!goal) return 0;
    if (goal.progressMode !== 'abgeleitet') return U.clamp(Number(goal.progress) || 0, 0, 100);
    const linked = projects({ goalId: goal.id });
    if (!linked.length) return 0;
    let done = 0, total = 0;
    linked.forEach(p => {
      const ms = p.milestones || [];
      if (ms.length) { total += ms.length; done += ms.filter(m => m.done).length; }
      else { total += 1; done += p.status === 'abgeschlossen' ? 1 : 0; }
    });
    return total ? Math.round(done / total * 100) : 0;
  }

  function currentSeason() {
    const today = U.today();
    const live = state.seasons.filter(s => !s.archived);
    const running = live.find(s => s.start && s.end && s.start <= today && today <= s.end);
    if (running) return running;
    const upcoming = live.filter(s => s.start && s.start > today).sort((a, b) => a.start.localeCompare(b.start))[0];
    if (upcoming) return upcoming;
    return live.slice().sort((a, b) => String(b.start).localeCompare(String(a.start)))[0] || null;
  }

  function seasonProgress(season) {
    if (!season || !season.start || !season.end) return { pct: 0, week: 0, weeks: 0, daysLeft: 0 };
    const total = Math.max(1, U.diffDays(season.start, season.end) + 1);
    const passed = U.clamp(U.diffDays(season.start, U.today()) + 1, 0, total);
    return {
      pct: Math.round(passed / total * 100),
      week: Math.max(1, Math.ceil(passed / 7)),
      weeks: Math.ceil(total / 7),
      daysLeft: Math.max(0, total - passed)
    };
  }

  function orphanProjects() {
    return projects({ status: ['aktiv', 'geplant'] }).filter(p => !(p.goalIds || []).length);
  }

  function ideas(filter) {
    const f = filter || {};
    let list = state.ideas.slice();
    if (f.status) list = list.filter(i => (Array.isArray(f.status) ? f.status.includes(i.status) : i.status === f.status));
    if (f.areaId) list = list.filter(i => i.areaId === f.areaId);
    return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function inbox() { return state.inbox.slice(); }

  function reviews(type) {
    return state.reviews
      .filter(r => !type || r.type === type)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function wishes() { return state.method255.wishes.slice(); }
  function topWishes() { return state.method255.wishes.filter(w => w.top); }
  function avoidWishes() { return state.method255.wishes.filter(w => !w.top); }

  function dayBlocks(dateKey) {
    return getDay(dateKey).blocks.slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
  }

  function dayPlannedHours(dateKey) {
    return dayBlocks(dateKey).reduce((sum, b) => sum + U.blockHours(b), 0);
  }

  function weekCapacity(wKey) {
    const days = U.weekDays(wKey);
    let focusBlocks = 0, focusHours = 0, termine = 0, plannedHours = 0, taskCount = 0;
    days.forEach(key => {
      dayBlocks(key).forEach(b => {
        const h = U.blockHours(b);
        plannedHours += h;
        if (b.type === 'fokus') { focusBlocks++; focusHours += h; }
        if (b.type === 'termin') termine++;
      });
      taskCount += tasks({ date: key, status: 'open' }).length;
    });
    const capacity = (state.settings.dailyCapacityHours || 6) * 7;
    return {
      focusBlocks, focusHours, termine, plannedHours, taskCount,
      capacity,
      free: Math.max(0, capacity - plannedHours),
      load: capacity ? U.clamp(plannedHours / capacity, 0, 1) : 0
    };
  }

  /* --- Archiv ---------------------------------------------------- */

  function archiveCounts() {
    return {
      projects: state.projects.filter(p => ['abgeschlossen', 'archiviert'].includes(p.status)).length,
      seasons: state.seasons.filter(s => s.archived).length,
      reviews: state.reviews.length,
      tasks: state.tasks.filter(t => t.status === 'archived').length,
      ideas: state.ideas.filter(i => i.status === 'archiviert').length
    };
  }

  function stats() {
    return {
      areas: state.areas.length,
      projects: state.projects.length,
      goals: state.goals.length,
      tasks: state.tasks.length,
      ideas: state.ideas.length,
      habits: state.habits.length,
      reviews: state.reviews.length,
      days: Object.keys(state.days).length,
      inbox: state.inbox.length
    };
  }

  /* --- Export / Import -------------------------------------------- */

  function exportData() {
    return JSON.stringify({
      app: 'OS',
      version: VERSION,
      exportedAt: new Date().toISOString(),
      state: state
    }, null, 2);
  }

  function exportFile() {
    U.download('os-export-' + U.today() + '.json', exportData());
  }

  /** mode: 'ersetzen' | 'zusammenfuehren' */
  function importData(json, mode) {
    let parsed;
    try { parsed = JSON.parse(json); }
    catch (err) { throw new Error('Die Datei ist kein gültiges JSON.'); }

    const incoming = parsed && parsed.state ? parsed.state : parsed;
    if (!incoming || typeof incoming !== 'object') throw new Error('Die Datei enthält keine OS-Daten.');
    const clean = migrate(incoming);

    if (mode === 'zusammenfuehren') {
      const merged = migrate(JSON.parse(JSON.stringify(state)));
      Object.keys(COLLECTIONS).forEach(kind => {
        const coll = COLLECTIONS[kind];
        const known = new Set(merged[coll].map(x => x.id));
        (clean[coll] || []).forEach(item => { if (!known.has(item.id)) merged[coll].push(item); });
      });
      Object.keys(clean.days || {}).forEach(k => { if (!merged.days[k]) merged.days[k] = clean.days[k]; });
      Object.keys(clean.weeks || {}).forEach(k => { if (!merged.weeks[k]) merged.weeks[k] = clean.weeks[k]; });
      const knownWishes = new Set(merged.method255.wishes.map(w => w.id));
      (clean.method255.wishes || []).forEach(w => { if (!knownWishes.has(w.id)) merged.method255.wishes.push(w); });
      state = merged;
    } else {
      state = clean;
    }
    save(true);
    emit();
    return true;
  }

  function reset() {
    state = blank();
    save(true);
    emit();
  }

  /* --- Öffentliche API --------------------------------------------- */

  return {
    VERSION, PROJECT_STATUS, PROJECT_STATUS_LABEL, GOAL_STATUS_LABEL,
    HORIZON_LABEL, IDEA_STATUS_LABEL, INBOX_KIND_LABEL, ACCENTS, AREA_COLORS,

    init, subscribe, emit, update, silent, save, isEmpty,
    get state() { return state; },

    getDay, ensureDay, getWeek, ensureWeek,
    find, all, setField, remove, nextOrder,

    addTask, addProject, addGoal, addIdea, addInbox, addArea, addHabit,
    addSeason, addReview, addTemplate,

    areas, area, habits, habitDone, toggleHabit,
    tasks, dayTasks, openDayTasks, unplannedTasks, toggleTask,
    projects, activeProjects, projectProgress,
    goals, seasonGoals, goalProgress, currentSeason, seasonProgress, orphanProjects,
    ideas, inbox, reviews, wishes, topWishes, avoidWishes,
    dayBlocks, dayPlannedHours, weekCapacity,
    archiveCounts, stats,

    exportData, exportFile, importData, reset
  };
})();
