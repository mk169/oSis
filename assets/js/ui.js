/* ===========================================================
   OS — UI-Bausteine
   Modal, Formular, Bestätigung, Toast, Drawer, Bausteine.
   =========================================================== */

OS.ui = (function () {
  'use strict';

  const U = OS.util;

  /* --- Toast ---------------------------------------------------- */

  function toast(message, action) {
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span>' + U.esc(message) + '</span>';
    if (action && action.label) {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.addEventListener('click', () => { close(); action.onClick && action.onClick(); });
      el.appendChild(btn);
    }
    wrap.appendChild(el);
    let timer = setTimeout(close, action ? 7000 : 3600);
    function close() {
      clearTimeout(timer);
      el.style.transition = 'opacity 160ms';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 180);
    }
    return close;
  }

  /* --- Modal ---------------------------------------------------- */

  let openModals = [];

  function closeTopModal() {
    const top = openModals.pop();
    if (!top) return false;
    top.el.remove();
    if (top.onClose) top.onClose();
    if (!openModals.length) document.body.style.overflow = '';
    return true;
  }

  function closeAllModals() {
    while (openModals.length) closeTopModal();
  }

  /**
   * modal({ title, subtitle, body(html), footer(html), size, onMount(root, api) })
   * Rückgabe: { root, close }
   */
  function modal(opts) {
    const o = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';

    const box = document.createElement('div');
    box.className = 'modal' + (o.size === 'lg' ? ' modal-lg' : o.size === 'sm' ? ' modal-sm' : '');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');

    box.innerHTML =
      '<button class="icon-btn modal-close" data-modal-close aria-label="Schließen">' + U.icons.close + '</button>' +
      (o.title || o.subtitle ? '<div class="modal-head">' +
        (o.title ? '<h2>' + U.esc(o.title) + '</h2>' : '') +
        (o.subtitle ? '<div class="modal-sub">' + U.esc(o.subtitle) + '</div>' : '') +
        '</div>' : '') +
      '<div class="modal-body">' + (o.body || '') + '</div>' +
      (o.footer ? '<div class="modal-foot">' + o.footer + '</div>' : '');

    wrap.appendChild(box);
    document.getElementById('modal-root').appendChild(wrap);
    document.body.style.overflow = 'hidden';

    const entry = { el: wrap, onClose: o.onClose };
    openModals.push(entry);

    const api = {
      root: box,
      wrap: wrap,
      close: function () {
        const i = openModals.indexOf(entry);
        if (i >= 0) openModals.splice(i, 1);
        wrap.remove();
        if (o.onClose) o.onClose();
        if (!openModals.length) document.body.style.overflow = '';
      }
    };

    wrap.addEventListener('mousedown', e => { if (e.target === wrap && o.dismissable !== false) api.close(); });
    box.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', api.close));

    if (o.onMount) o.onMount(box, api);

    setTimeout(() => {
      const focusable = box.querySelector('[data-autofocus], input:not([type=hidden]), textarea, select, button.btn-primary');
      if (focusable) focusable.focus();
      U.autosizeAll(box);
    }, 30);

    return api;
  }

  /* --- Formular-Modal -------------------------------------------- */

  /**
   * Feldtypen: text, textarea, select, multiselect, date, number, range,
   *            checkbox, chips, note, section, hidden, tags
   */
  function fieldHtml(f) {
    const name = U.esc(f.name);
    const label = f.label ? '<span class="field-label">' + U.esc(f.label) + '</span>' : '';
    const help = f.help ? '<span class="field-help">' + U.esc(f.help) + '</span>' : '';
    const val = f.value === null || f.value === undefined ? '' : f.value;

    switch (f.type) {
      case 'section':
        return '<div class="field"><div class="overline" style="margin-top:6px">' + U.esc(f.label) + '</div>' +
          (f.help ? '<div class="field-help">' + U.esc(f.help) + '</div>' : '') + '</div>';

      case 'note':
        return '<div class="note ' + U.esc(f.tone || 'note-quiet') + '">' + (f.html || U.esc(f.text || '')) + '</div>';

      case 'hidden':
        return '<input type="hidden" name="' + name + '" value="' + U.esc(val) + '">';

      case 'textarea':
        return '<label class="field">' + label +
          '<textarea class="textarea" name="' + name + '" rows="' + (f.rows || 3) + '" placeholder="' + U.esc(f.placeholder || '') + '"' +
          (f.autofocus ? ' data-autofocus' : '') + '>' + U.esc(val) + '</textarea>' + help + '</label>';

      case 'select': {
        const options = (f.options || []).map(opt =>
          '<option value="' + U.esc(opt.value) + '"' + (String(opt.value) === String(val) ? ' selected' : '') + '>' +
          U.esc(opt.label) + '</option>').join('');
        return '<label class="field">' + label +
          '<select class="select" name="' + name + '"' + (f.autofocus ? ' data-autofocus' : '') + '>' + options + '</select>' + help + '</label>';
      }

      case 'multiselect': {
        const chosen = Array.isArray(val) ? val.map(String) : [];
        const chips = (f.options || []).map(opt =>
          '<button type="button" class="chip chip-btn' + (chosen.includes(String(opt.value)) ? ' is-on' : '') +
          '" data-multi="' + name + '" data-value="' + U.esc(opt.value) + '">' + U.esc(opt.label) + '</button>').join('');
        return '<div class="field">' + label +
          '<div class="chips" data-multi-group="' + name + '">' + (chips || '<span class="field-help">Noch nichts vorhanden.</span>') + '</div>' +
          '<input type="hidden" name="' + name + '" value="' + U.esc(chosen.join(',')) + '">' + help + '</div>';
      }

      case 'checkbox':
        return '<label class="field"><span class="switch-row">' +
          '<input type="checkbox" name="' + name + '"' + (val ? ' checked' : '') + '>' +
          '<span>' + U.esc(f.label) + '</span></span>' + help + '</label>';

      case 'date':
        return '<label class="field">' + label +
          '<input class="input" type="date" name="' + name + '" value="' + U.esc(val) + '">' + help + '</label>';

      case 'time':
        return '<label class="field">' + label +
          '<input class="input" type="time" name="' + name + '" value="' + U.esc(val) + '">' + help + '</label>';

      case 'number':
        return '<label class="field">' + label +
          '<input class="input" type="number" name="' + name + '" value="' + U.esc(val) + '"' +
          (f.min !== undefined ? ' min="' + f.min + '"' : '') +
          (f.max !== undefined ? ' max="' + f.max + '"' : '') +
          (f.step !== undefined ? ' step="' + f.step + '"' : '') + '>' + help + '</label>';

      case 'row':
        return '<div class="form-row">' + (f.fields || []).map(fieldHtml).join('') + '</div>';

      default:
        return '<label class="field">' + label +
          '<input class="input" type="text" name="' + name + '" value="' + U.esc(val) + '" placeholder="' +
          U.esc(f.placeholder || '') + '"' + (f.autofocus ? ' data-autofocus' : '') + '>' + help + '</label>';
    }
  }

  function collectValues(root) {
    const values = {};
    root.querySelectorAll('input, textarea, select').forEach(el => {
      if (!el.name) return;
      if (el.type === 'checkbox') values[el.name] = el.checked;
      else values[el.name] = el.value;
    });
    root.querySelectorAll('[data-multi-group]').forEach(group => {
      const name = group.getAttribute('data-multi-group');
      values[name] = Array.from(group.querySelectorAll('.chip.is-on')).map(c => c.getAttribute('data-value'));
    });
    return values;
  }

  /**
   * form({ title, subtitle, fields, submitLabel, onSubmit(values, api), extraFooter, size })
   */
  function form(opts) {
    const o = opts || {};
    const fields = (o.fields || []).filter(Boolean);
    const body = '<form data-os-form>' +
      '<div class="stack" style="gap:18px">' + fields.map(fieldHtml).join('') + '</div>' +
      '</form>';

    const footer =
      (o.extraFooter ? '<div class="foot-left">' + o.extraFooter + '</div>' : '') +
      '<button class="btn" data-modal-close type="button">' + U.esc(o.cancelLabel || 'Abbrechen') + '</button>' +
      '<button class="btn btn-primary" data-submit type="button">' + U.esc(o.submitLabel || 'Speichern') + '</button>';

    return modal({
      title: o.title,
      subtitle: o.subtitle,
      body: body,
      footer: footer,
      size: o.size,
      onClose: o.onClose,
      onMount: function (root, api) {
        const formEl = root.querySelector('[data-os-form]');

        root.querySelectorAll('[data-multi]').forEach(chip => {
          chip.addEventListener('click', () => chip.classList.toggle('is-on'));
        });

        function submit() {
          const values = collectValues(formEl);
          const result = o.onSubmit ? o.onSubmit(values, api) : undefined;
          if (result !== false) api.close();
        }

        root.querySelector('[data-submit]').addEventListener('click', submit);
        formEl.addEventListener('submit', e => { e.preventDefault(); submit(); });
        formEl.addEventListener('keydown', e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
          if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); submit(); }
        });

        if (o.onMount) o.onMount(root, api);
      }
    });
  }

  /* --- Bestätigung ------------------------------------------------ */

  function confirm(opts) {
    const o = opts || {};
    return new Promise(resolve => {
      let decided = false;
      const api = modal({
        title: o.title || 'Sicher?',
        size: 'sm',
        body: '<p class="small" style="color:var(--ink-2);line-height:1.6">' + U.esc(o.text || '') + '</p>',
        footer: '<button class="btn" data-modal-close type="button">' + U.esc(o.cancelLabel || 'Abbrechen') + '</button>' +
          '<button class="btn ' + (o.tone === 'danger' ? 'btn-danger' : 'btn-primary') + '" data-ok type="button">' +
          U.esc(o.confirmLabel || 'Ja') + '</button>',
        onClose: () => { if (!decided) resolve(false); },
        onMount: function (root) {
          root.querySelector('[data-ok]').addEventListener('click', () => {
            decided = true;
            api.close();
            resolve(true);
          });
        }
      });
    });
  }

  /** Einzeiliger Text-Dialog */
  function prompt(opts) {
    const o = opts || {};
    return new Promise(resolve => {
      let decided = false;
      form({
        title: o.title,
        subtitle: o.subtitle,
        size: 'sm',
        submitLabel: o.submitLabel || 'Übernehmen',
        fields: [{
          name: 'value',
          type: o.multiline ? 'textarea' : 'text',
          label: o.label,
          value: o.value || '',
          placeholder: o.placeholder || '',
          autofocus: true,
          rows: o.rows
        }],
        onSubmit: values => {
          decided = true;
          resolve(String(values.value || '').trim());
        },
        onClose: () => { if (!decided) resolve(null); }
      });
    });
  }

  /* --- Drawer ------------------------------------------------------ */

  let drawerState = { open: false, render: null };

  function openDrawer(renderFn) {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    drawerState = { open: true, render: renderFn };
    drawer.hidden = false;
    drawer.removeAttribute('aria-hidden');
    overlay.hidden = false;
    renderDrawer();
    setTimeout(() => {
      const input = drawer.querySelector('[data-autofocus]');
      if (input) input.focus();
    }, 40);
  }

  function renderDrawer() {
    if (!drawerState.open || !drawerState.render) return;
    const drawer = document.getElementById('drawer');
    drawer.innerHTML = drawerState.render();
  }

  function closeDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    drawerState.open = false;
    drawer.hidden = true;
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = '';
    overlay.hidden = true;
  }

  function isDrawerOpen() { return drawerState.open; }

  /* --- Bausteine ---------------------------------------------------- */

  function checkbox(done, attrs) {
    return '<button class="check' + (done ? ' is-done' : '') + '" ' + (attrs || '') +
      ' aria-pressed="' + (done ? 'true' : 'false') + '" aria-label="' + (done ? 'Erledigt' : 'Offen') + '">' +
      U.icons.check + '</button>';
  }

  function areaChip(areaId) {
    const a = OS.store.area(areaId);
    if (!a) return '';
    return '<span class="chip" style="color:' + U.esc(a.color) + '">' +
      '<i class="chip-dot"></i>' + U.esc(a.name) + '</span>';
  }

  function projectChip(projectId) {
    const p = OS.store.find('project', projectId);
    if (!p) return '';
    return '<span class="chip">' + U.esc(U.trunc(p.name || 'Projekt', 30)) + '</span>';
  }

  function statusChip(status) {
    const label = OS.store.PROJECT_STATUS_LABEL[status] || status;
    return '<span class="chip"><i class="dot dot-' + U.esc(status) + '"></i>' + U.esc(label) + '</span>';
  }

  function progressBar(pct, variant) {
    const v = U.clamp(Math.round(pct || 0), 0, 100);
    return '<div class="progress ' + (variant || '') + '"><i style="width:' + v + '%"></i></div>';
  }

  function emptyState(title, text, actionHtml) {
    return '<div class="empty">' +
      (title ? '<div class="empty-title">' + U.esc(title) + '</div>' : '') +
      (text ? '<div>' + U.esc(text) + '</div>' : '') +
      (actionHtml ? '<div style="margin-top:14px">' + actionHtml + '</div>' : '') +
      '</div>';
  }

  function iconBtn(icon, action, title, data) {
    return '<button class="icon-btn" style="width:26px;height:26px" data-act="' + U.esc(action) + '" ' +
      (data || '') + ' title="' + U.esc(title || '') + '" aria-label="' + U.esc(title || '') + '">' +
      U.icons[icon] + '</button>';
  }

  function areaOptions(selectedId, emptyLabel) {
    const list = OS.store.areas();
    return [{ value: '', label: emptyLabel || 'Kein Lebensbereich' }]
      .concat(list.map(a => ({ value: a.id, label: a.name })));
  }

  function goalOptions(emptyLabel) {
    const season = OS.store.currentSeason();
    const list = OS.store.goals({ open: true });
    return [{ value: '', label: emptyLabel || 'Kein Ziel' }].concat(list.map(g => ({
      value: g.id,
      label: (g.seasonId && season && g.seasonId === season.id ? '◆ ' : '') + (g.title || 'Ohne Titel')
    })));
  }

  function projectOptions(emptyLabel) {
    const list = OS.store.projects({ live: true });
    return [{ value: '', label: emptyLabel || 'Kein Projekt' }]
      .concat(list.map(p => ({ value: p.id, label: p.name || 'Ohne Titel' })));
  }

  return {
    toast, modal, form, confirm, prompt, closeTopModal, closeAllModals,
    openDrawer, closeDrawer, renderDrawer, isDrawerOpen,
    checkbox, areaChip, projectChip, statusChip, progressBar, emptyState, iconBtn,
    areaOptions, goalOptions, projectOptions, collectValues
  };
})();
