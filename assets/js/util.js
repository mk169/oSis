/* ===========================================================
   OS — Utilities
   Datum, Text, DOM. Keine Abhängigkeiten.
   =========================================================== */

window.OS = window.OS || {};

OS.util = (function () {
  'use strict';

  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  /* --- IDs & Text ---------------------------------------------- */

  function uid(prefix) {
    return (prefix || 'x') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function nl2br(value) {
    return esc(value).replace(/\n/g, '<br>');
  }

  function trunc(value, max) {
    const s = String(value || '');
    return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
  }

  function plural(n, one, many) {
    return n === 1 ? one : many;
  }

  /* --- Datum ---------------------------------------------------- */

  function pad2(n) { return String(n).padStart(2, '0'); }

  /** 'YYYY-MM-DD' aus Date */
  function dateKey(d) {
    const date = d instanceof Date ? d : new Date(d);
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  /** Date (lokal, 12:00 – vermeidet Zeitzonen-Kanten) aus 'YYYY-MM-DD' */
  function parseKey(key) {
    if (!key) return null;
    const parts = String(key).split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function today() { return dateKey(new Date()); }

  function addDays(key, n) {
    const d = parseKey(key);
    if (!d) return key;
    d.setDate(d.getDate() + n);
    return dateKey(d);
  }

  function diffDays(a, b) {
    const da = parseKey(a), db = parseKey(b);
    if (!da || !db) return 0;
    return Math.round((db - da) / 86400000);
  }

  /** Montag als Wochenanfang */
  function startOfWeek(key) {
    const d = parseKey(key) || new Date();
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return dateKey(d);
  }

  /** ISO-Wochenschlüssel 'YYYY-Wnn' */
  function weekKey(key) {
    const d = parseKey(key) || new Date();
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstDayNr = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
    const week = 1 + Math.round((target - firstThursday) / (7 * 86400000));
    return target.getFullYear() + '-W' + pad2(week);
  }

  /** Montags-Datum einer ISO-Woche */
  function weekStart(wKey) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(wKey || '');
    if (!m) return startOfWeek(today());
    const year = Number(m[1]), week = Number(m[2]);
    const jan4 = new Date(year, 0, 4, 12);
    const jan4Dow = (jan4.getDay() + 6) % 7;
    const mondayW1 = new Date(jan4);
    mondayW1.setDate(jan4.getDate() - jan4Dow);
    mondayW1.setDate(mondayW1.getDate() + (week - 1) * 7);
    return dateKey(mondayW1);
  }

  function weekDays(wKey) {
    const start = weekStart(wKey);
    return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(start, i));
  }

  function weekNumber(wKey) {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(wKey || '');
    return m ? Number(m[2]) : 0;
  }

  function shiftWeek(wKey, n) {
    return weekKey(addDays(weekStart(wKey), n * 7));
  }

  function dow(key) {
    const d = parseKey(key);
    return d ? (d.getDay() + 6) % 7 : 0;
  }

  function fmtWeekday(key, long) {
    const i = dow(key);
    return long ? WEEKDAYS_LONG[i] : WEEKDAYS[i];
  }

  /** 'Mittwoch, 9. September 2026' */
  function fmtLong(key) {
    const d = parseKey(key);
    if (!d) return '';
    return WEEKDAYS_LONG[dow(key)] + ', ' + d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  /** '9. Sep' */
  function fmtShort(key) {
    const d = parseKey(key);
    if (!d) return '';
    return d.getDate() + '. ' + MONTHS_SHORT[d.getMonth()];
  }

  /** '9. September 2026' */
  function fmtMedium(key) {
    const d = parseKey(key);
    if (!d) return '';
    return d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function fmtRange(a, b) {
    if (!a && !b) return '';
    if (!b) return 'ab ' + fmtShort(a);
    if (!a) return 'bis ' + fmtShort(b);
    return fmtShort(a) + ' – ' + fmtShort(b);
  }

  /** Weiche, nie mahnende Formulierung für Fristen */
  function fmtRelative(key) {
    if (!key) return '';
    const d = diffDays(today(), key);
    if (d === 0) return 'heute';
    if (d === 1) return 'morgen';
    if (d === -1) return 'gestern';
    if (d > 1 && d <= 14) return 'in ' + d + ' Tagen';
    if (d < -1 && d >= -14) return 'vor ' + Math.abs(d) + ' Tagen';
    return fmtShort(key);
  }

  function monthName(key) {
    const d = parseKey(key);
    return d ? MONTHS[d.getMonth()] : '';
  }

  /* --- Zeit ------------------------------------------------------ */

  function toMinutes(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function fromMinutes(min) {
    const v = Math.max(0, Math.min(24 * 60, Math.round(min || 0)));
    return pad2(Math.floor(v / 60)) + ':' + pad2(v % 60);
  }

  function blockHours(block) {
    const a = toMinutes(block && block.start);
    const b = toMinutes(block && block.end);
    if (a === null || b === null || b <= a) return 0;
    return (b - a) / 60;
  }

  function fmtHours(h) {
    const v = Math.round((h || 0) * 10) / 10;
    return String(v).replace('.', ',') + ' h';
  }

  /* --- Kleinkram ------------------------------------------------- */

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait || 220);
    };
  }

  function getPath(obj, path) {
    return String(path).split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);
  }

  function setPath(obj, path, value) {
    const keys = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    return obj;
  }

  function move(arr, from, to) {
    if (to < 0 || to >= arr.length) return arr;
    const item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
    return arr;
  }

  function byOrder(a, b) {
    return (a.order ?? 0) - (b.order ?? 0);
  }

  /**
   * Datei sichern – lokal über einen Download, in einer eingebetteten
   * Umgebung über die Speicherfunktion des Betrachters.
   * Ergebnis: 'local' | 'saved' | 'declined' | 'unavailable'
   */
  function saveFile(filename, text) {
    const hosted = !!(window.claude && typeof window.claude.use === 'function');
    if (!hosted) {
      download(filename, text);
      return Promise.resolve('local');
    }
    return window.claude.use('downloads').then(function (dl) {
      if (!dl || typeof dl.save !== 'function') return 'unavailable';
      return dl.save({ filename: filename, data: text })
        .then(function () { return 'saved'; })
        .catch(function (err) {
          return err && err.code === 'declined' ? 'declined' : 'unavailable';
        });
    }).catch(function () { return 'unavailable'; });
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function autosize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 2) + 'px';
  }

  function autosizeAll(root) {
    (root || document).querySelectorAll('.ghost-area, textarea[data-autosize]').forEach(autosize);
  }

  /** Kleines Icon-Set (inline SVG) */
  const icons = {
    check: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.4 4.6 9 10 3.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 14 14" width="12" height="12" aria-hidden="true"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.8l1.85 3.9 4.15.6-3 3 .71 4.25L8 11.5l-3.71 2.05L5 9.3 2 6.3l4.15-.6L8 1.8Z" fill="currentColor"/></svg>',
    starOutline: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.8l1.85 3.9 4.15.6-3 3 .71 4.25L8 11.5l-3.71 2.05L5 9.3 2 6.3l4.15-.6L8 1.8Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    arrowRight: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3 8h9m-3.5-3.5L12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevronL: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevronR: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    dots: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="3.5" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="12.5" cy="8" r="1.2" fill="currentColor"/></svg>',
    edit: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M11 2.5 13.5 5 5.5 13H3v-2.5L11 2.5Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.6 8h4.8l.6-8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    calendar: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    archive: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M2.5 5.5h11v8h-11v-8ZM2 3h12v2.5H2V3Zm4.5 5h3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    link: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l1.8-1.8a3 3 0 1 0-4.2-4.2L7.4 4.4M9.5 6.5a3 3 0 0 0-4.2 0L3.5 8.3a3 3 0 1 0 4.2 4.2l.9-.9" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
  };

  return {
    WEEKDAYS, WEEKDAYS_LONG, MONTHS, MONTHS_SHORT,
    uid, esc, nl2br, trunc, plural,
    pad2, dateKey, parseKey, today, addDays, diffDays,
    startOfWeek, weekKey, weekStart, weekDays, weekNumber, shiftWeek, dow,
    fmtWeekday, fmtLong, fmtShort, fmtMedium, fmtRange, fmtRelative, monthName,
    toMinutes, fromMinutes, blockHours, fmtHours,
    clamp, debounce, getPath, setPath, move, byOrder, download, saveFile, autosize, autosizeAll,
    icons
  };
})();
