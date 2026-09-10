/* ===========================================================
   OS — Kopplung über Supabase
   Hält den Stand zwischen mehreren Geräten gleich. Ohne
   eingerichtete Verbindung bleibt die App unverändert lokal.

   Regel bei gleichzeitiger Änderung: Der zuletzt gespeicherte
   Stand gewinnt. Vor jedem Übernehmen legt OS den bisherigen
   Stand als Sicherung ab, die sich zurückholen lässt.
   =========================================================== */

OS.sync = (function () {
  'use strict';

  const U = OS.util;
  const S = OS.store;

  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const CONFIG_KEY = 'os.sync.config';
  const BACKUP_KEY = 'os.sync.backup';
  const DEVICE_KEY = 'os.sync.device';
  const TABLE = 'os_state';
  const PUSH_DELAY = 1500;

  let client = null;
  let session = null;
  let channel = null;
  let device = '';
  let status = 'aus';        // aus | verbindet | anmeldung | gekoppelt | abgleich | fehler
  let detail = '';
  let lastSync = null;
  let applying = false;
  let lastPushed = null;
  let pushTimer = null;
  let sdkPromise = null;

  /* --- Einstellungen ---------------------------------------------- */

  function config() {
    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
      if (stored && stored.url && stored.key) return stored;
    } catch (err) { /* nichts hinterlegt */ }
    if (OS.config && OS.config.supabaseUrl && OS.config.supabaseKey) {
      return { url: OS.config.supabaseUrl, key: OS.config.supabaseKey };
    }
    return null;
  }

  function setConfig(url, key) {
    const clean = { url: String(url || '').trim().replace(/\/+$/, ''), key: String(key || '').trim() };
    if (!clean.url || !clean.key) return false;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
    return true;
  }

  function clearConfig() {
    localStorage.removeItem(CONFIG_KEY);
    if (channel) { try { channel.unsubscribe(); } catch (err) { /* egal */ } channel = null; }
    client = null;
    session = null;
    setStatus('aus');
  }

  function deviceId() {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) { id = U.uid('dev'); localStorage.setItem(DEVICE_KEY, id); }
      return id;
    } catch (err) { return U.uid('dev'); }
  }

  function setStatus(next, text) {
    status = next;
    detail = text || '';
    if (OS.app && OS.app.render && OS.app.current && OS.app.current.route === 'system') OS.app.render();
  }

  /* --- Sicherung ---------------------------------------------------- */

  function backup() {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify({
        savedAt: new Date().toISOString(), state: S.state
      }));
    } catch (err) { /* Zugabe, kein Muss */ }
  }

  function backupTime() {
    try {
      const raw = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
      return raw && raw.savedAt ? raw.savedAt : null;
    } catch (err) { return null; }
  }

  function restore() {
    try {
      const raw = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
      if (!raw || !raw.state) { OS.ui.toast('Keine Sicherung vorhanden.'); return; }
      S.importData(JSON.stringify({ state: raw.state }), 'ersetzen');
      OS.app.applySettings();
      OS.ui.toast('Vorheriger Stand wiederhergestellt.');
      schedulePush(true);
    } catch (err) {
      OS.ui.toast('Die Sicherung ließ sich nicht lesen.');
    }
  }

  /* --- SDK ----------------------------------------------------------- */

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      const tag = document.createElement('script');
      tag.src = SDK_URL;
      tag.onload = function () {
        if (window.supabase && window.supabase.createClient) resolve(window.supabase);
        else reject(new Error('Die Bibliothek ließ sich nicht laden.'));
      };
      tag.onerror = function () { reject(new Error('Keine Verbindung zur Bibliothek.')); };
      document.head.appendChild(tag);
    });
    return sdkPromise;
  }

  /* --- Daten ---------------------------------------------------------- */

  function payload() {
    return {
      version: S.state.version,
      meta: S.state.meta,
      settings: S.state.settings,
      areas: S.state.areas,
      seasons: S.state.seasons,
      goals: S.state.goals,
      projects: S.state.projects,
      tasks: S.state.tasks,
      inbox: S.state.inbox,
      ideas: S.state.ideas,
      habits: S.state.habits,
      days: S.state.days,
      weeks: S.state.weeks,
      reviews: S.state.reviews,
      method255: S.state.method255,
      templates: S.state.templates
    };
  }

  function applyRemote(remote) {
    if (!remote || typeof remote !== 'object') return false;
    applying = true;
    S.importData(JSON.stringify({ state: remote }), 'ersetzen');
    applying = false;
    lastPushed = JSON.stringify(remote);
    lastSync = new Date().toISOString();
    OS.app.applySettings();
    return true;
  }

  function push() {
    if (!client || !session || applying) return Promise.resolve();
    const body = payload();
    const serialized = JSON.stringify(body);
    if (serialized === lastPushed) return Promise.resolve();

    setStatus('abgleich');
    return client.from(TABLE).upsert({
      user_id: session.user.id,
      payload: body,
      device: device,
      updated_at: new Date().toISOString()
    }).then(function (res) {
      if (res.error) throw res.error;
      lastPushed = serialized;
      lastSync = new Date().toISOString();
      setStatus('gekoppelt');
    }).catch(function (err) {
      setStatus('fehler', meldung(err));
    });
  }

  function pull() {
    if (!client || !session) return Promise.resolve(null);
    return client.from(TABLE)
      .select('payload, updated_at, device')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || null;
      });
  }

  function schedulePush(immediate) {
    if (!client || !session || applying) return;
    clearTimeout(pushTimer);
    if (immediate) { push(); return; }
    pushTimer = setTimeout(push, PUSH_DELAY);
  }

  function meldung(err) {
    const msg = (err && (err.message || err.error_description)) || '';
    if (/relation .* does not exist|schema cache/i.test(msg)) return 'Die Tabelle os_state fehlt in deinem Projekt.';
    if (/row-level security|permission/i.test(msg)) return 'Die Zugriffsregeln lassen den Schreibzugriff nicht zu.';
    if (/Failed to fetch|NetworkError/i.test(msg)) return 'Keine Verbindung.';
    return msg || 'Der Abgleich ruht gerade.';
  }

  /* --- Anmeldung ------------------------------------------------------ */

  function signIn(email) {
    if (!client) return Promise.reject(new Error('Nicht eingerichtet.'));
    return client.auth.signInWithOtp({
      email: String(email || '').trim(),
      options: { emailRedirectTo: location.href.split('#')[0] }
    }).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  function signOut() {
    if (!client) return Promise.resolve();
    return client.auth.signOut().then(function () {
      session = null;
      if (channel) { try { channel.unsubscribe(); } catch (err) { /* egal */ } channel = null; }
      setStatus('anmeldung');
    });
  }

  /* --- Live-Verbindung -------------------------------------------------- */

  function listen() {
    if (!client || !session || channel) return;
    // Die Live-Verbindung braucht dasselbe Zugangstoken wie die Abfragen.
    try {
      if (client.realtime && typeof client.realtime.setAuth === 'function') {
        client.realtime.setAuth(session.access_token);
      }
    } catch (err) { /* neuere Fassungen erledigen das selbst */ }

    channel = client.channel('os-state-' + session.user.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: TABLE,
        filter: 'user_id=eq.' + session.user.id
      }, function (message) {
        const row = message && message.new;
        if (!row || !row.payload) return;
        if (row.device === device) return;                       // eigener Widerhall
        if (JSON.stringify(row.payload) === lastPushed) return;
        backup();
        if (applyRemote(row.payload)) {
          setStatus('gekoppelt');
          OS.ui.toast('Stand vom anderen Gerät übernommen.');
        }
      })
      .subscribe();
  }

  /* --- Start ------------------------------------------------------------- */

  function start() {
    const cfg = config();
    if (!cfg) { setStatus('aus'); return; }

    device = deviceId();
    setStatus('verbindet');

    loadSdk().then(function (sdk) {
      client = sdk.createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true }
      });

      client.auth.onAuthStateChange(function (event, next) {
        session = next;
        if (session) { afterLogin(); }
        else { setStatus('anmeldung'); }
      });

      return client.auth.getSession().then(function (res) {
        session = res.data ? res.data.session : null;
        if (!session) { setStatus('anmeldung'); return; }
        return afterLogin();
      });
    }).catch(function (err) {
      setStatus('fehler', meldung(err));
    });
  }

  function afterLogin() {
    setStatus('abgleich');
    return pull().then(function (row) {
      const localTime = S.state.meta.updatedAt || '';
      if (row && row.payload) {
        const remoteNewer = String(row.updated_at || '') > localTime;
        if (S.isEmpty() || remoteNewer) {
          backup();
          applyRemote(row.payload);
        }
      }
      listen();
      S.subscribe(function () { schedulePush(); });
      return push();
    }).then(function () {
      if (status !== 'fehler') setStatus('gekoppelt');
    }).catch(function (err) {
      setStatus('fehler', meldung(err));
    });
  }

  function syncNow() {
    if (!client || !session) { OS.ui.toast('Die Kopplung ist noch nicht eingerichtet.'); return; }
    lastPushed = null;
    pull().then(function (row) {
      if (row && row.payload && String(row.updated_at || '') > (S.state.meta.updatedAt || '')) {
        backup();
        applyRemote(row.payload);
      }
      return push();
    }).then(function () {
      OS.ui.toast('Abgeglichen.');
    }).catch(function (err) {
      setStatus('fehler', meldung(err));
    });
  }

  return {
    start: start,
    setConfig: setConfig,
    clearConfig: clearConfig,
    config: config,
    signIn: signIn,
    signOut: signOut,
    syncNow: syncNow,
    restore: restore,
    backupTime: backupTime,
    get status() { return status; },
    get detail() { return detail; },
    get lastSync() { return lastSync; },
    get email() { return session && session.user ? session.user.email : ''; }
  };
})();
