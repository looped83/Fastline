/* ============================================================================
   Intervallfasten – Anzeige
   Verbindet die reine Logik aus fasting.js mit dem DOM. Es wird ausschließlich
   Text/Attribut-weise aktualisiert, damit die Anzeige ruhig bleibt und nicht
   bei jedem Tick neu aufgebaut wird.
   ========================================================================== */

(function () {
  'use strict';

  const words = Fasting.formatDurationWords;
  const digits = Fasting.formatDurationDigits;
  const clock = Fasting.formatClock;

  /* Voreinstellung aus config.js, überschrieben von lokalen Einstellungen. */
  let config = Fasting.resolveConfig(Settings.load(FASTING_CONFIG));

  /* ---- DOM-Referenzen ---------------------------------------------------- */
  const el = {
    app: document.getElementById('app'),
    statusHeadline: document.getElementById('statusHeadline'),
    clock: document.getElementById('clock'),
    modeLabel: document.getElementById('modeLabel'),

    ringValue: document.getElementById('ringValue'),
    ringHead: document.getElementById('ringHead'),
    ringPrimary: document.getElementById('ringPrimary'),
    ringLink: document.getElementById('ringLink'),
    ringSecondary: document.getElementById('ringSecondary'),
    ringCaption: document.getElementById('ringCaption'),

    anchorStartLabel: document.getElementById('anchorStartLabel'),
    anchorStartTime: document.getElementById('anchorStartTime'),
    anchorEndLabel: document.getElementById('anchorEndLabel'),
    anchorEndTime: document.getElementById('anchorEndTime'),

    goalCard: document.getElementById('goalCard'),
    goalTitle: document.getElementById('goalTitle'),
    goalBody: document.getElementById('goalBody'),

    nowTitle: document.getElementById('nowTitle'),
    nowMeta: document.getElementById('nowMeta'),
    nowLead: document.getElementById('nowLead'),
    nowBody: document.getElementById('nowBody'),

    nextTitle: document.getElementById('nextTitle'),
    nextLead: document.getElementById('nextLead'),
    nextBody: document.getElementById('nextBody'),

    phaseList: document.getElementById('phaseList'),

    settingsOpen: document.getElementById('settingsOpen'),
    settingsClose: document.getElementById('settingsClose'),
    settingsDialog: document.getElementById('settingsDialog'),
    settingsForm: document.getElementById('settingsForm'),
    settingsReset: document.getElementById('settingsReset'),
    settingsSummary: document.getElementById('settingsSummary'),
    settingsError: document.getElementById('settingsError'),
    inputStart: document.getElementById('inputStart'),
    inputEnd: document.getElementById('inputEnd')
  };

  /* Fortschrittsring: Radius 86 im viewBox 200×200, Start oben (12 Uhr). */
  const RING_RADIUS = 86;
  const RING_CENTER = 100;
  const RING_LENGTH =
    typeof el.ringValue.getTotalLength === 'function'
      ? el.ringValue.getTotalLength()
      : 2 * Math.PI * RING_RADIUS;

  el.ringValue.setAttribute('stroke-dasharray', String(RING_LENGTH));
  el.ringValue.setAttribute('stroke-dashoffset', String(RING_LENGTH));

  /* ---- kleine Helfer ----------------------------------------------------- */
  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function setAttr(node, name, value) {
    if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
  }

  /** "0–4 h" bzw. "16–17 h" */
  function rangeLabel(phase) {
    const format = function (value) {
      return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
    };
    return format(phase.from) + '–' + format(phase.to) + ' h';
  }

  /** Uhrzeit, zu der eine Phase (bezogen auf einen Fastenbeginn) beginnt/endet. */
  function phaseClock(base, hours) {
    return clock(new Date(base.getTime() + hours * Fasting.HOUR));
  }

  /* ---- Phasen-Timeline aufbauen ------------------------------------------
     Wird nach dem Ändern der Fastenzeiten neu erzeugt, weil sich damit auch
     die Anzahl der Phasen ändern kann.
     ---------------------------------------------------------------------- */
  let phaseNodes = [];

  function buildPhaseList() {
    el.phaseList.textContent = '';
    phaseNodes = config.phases.map(function (phase) {
      const item = document.createElement('li');
      item.className = 'phase';

      const dot = document.createElement('span');
      dot.className = 'phase__dot';

      const content = document.createElement('div');
      content.className = 'phase__content';

      const range = document.createElement('p');
      range.className = 'phase__range';

      const hours = document.createElement('span');
      hours.className = 'phase__hours';
      hours.textContent = rangeLabel(phase);

      const times = document.createElement('span');
      times.className = 'phase__clock';

      const name = document.createElement('h3');
      name.className = 'phase__name';
      name.textContent = phase.title;

      const text = document.createElement('p');
      text.className = 'phase__text';
      text.textContent = phase.description;

      range.append(hours, times);
      content.append(range, name, text);
      item.append(dot, content);
      el.phaseList.append(item);

      return { item: item, times: times, phase: phase };
    });
  }

  function renderPhases(state) {
    // Im Essensfenster zeigt die Timeline den kommenden Zyklus.
    const base = state.isFasting ? state.fastStart : state.nextFastStart;

    phaseNodes.forEach(function (node, index) {
      let modifier;
      if (!state.isFasting) {
        modifier = 'phase--upcoming';
      } else if (index === state.phaseIndex) {
        modifier = 'phase--current';
      } else if (index < state.phaseIndex) {
        modifier = 'phase--done';
      } else {
        modifier = 'phase--upcoming';
      }

      const className = 'phase ' + modifier;
      if (node.item.className !== className) node.item.className = className;

      if (modifier === 'phase--current') node.item.setAttribute('aria-current', 'step');
      else node.item.removeAttribute('aria-current');

      setText(
        node.times,
        phaseClock(base, node.phase.from) + '–' + phaseClock(base, node.phase.to) + ' Uhr'
      );
    });
  }

  /* ---- Ring -------------------------------------------------------------- */
  function renderRing(progress) {
    setAttr(el.ringValue, 'stroke-dashoffset', (RING_LENGTH * (1 - progress)).toFixed(2));

    const angle = (progress * 360 - 90) * (Math.PI / 180);
    setAttr(el.ringHead, 'cx', (RING_CENTER + RING_RADIUS * Math.cos(angle)).toFixed(2));
    setAttr(el.ringHead, 'cy', (RING_CENTER + RING_RADIUS * Math.sin(angle)).toFixed(2));
    setAttr(el.ringHead, 'opacity', progress > 0.004 ? '1' : '0');
  }

  /* ---- Zustand rendern --------------------------------------------------- */
  function render(now) {
    const state = Fasting.computeState(now, config);

    if (el.app.dataset.mode !== state.mode) el.app.dataset.mode = state.mode;

    setText(el.clock, state.clock + ' Uhr');
    renderRing(state.progress);
    renderPhases(state);

    if (state.isFasting) renderFasting(state);
    else renderEating(state);

    return state;
  }

  function renderFasting(state) {
    /* Kopf */
    setText(el.statusHeadline, 'Du fastest seit ' + words(state.elapsedMs, 'floor'));
    setText(el.modeLabel, 'Fasten bis ' + state.fastEndLabel + ' Uhr');

    /* Ring */
    setText(el.ringPrimary, digits(state.elapsedMs, 'floor') + ' h');
    setText(el.ringLink, 'von');
    setText(el.ringSecondary, state.fastTotalDigits + ' h');
    setText(el.ringCaption, state.percent + ' % geschafft');

    /* Eckpunkte */
    setText(el.anchorStartLabel, 'Fastenbeginn');
    setText(el.anchorStartTime, state.fastStartLabel);
    setText(el.anchorEndLabel, 'Fastenende');
    setText(el.anchorEndTime, state.fastEndLabel);

    /* Fastenziel */
    if (state.goalIsNear) {
      el.goalCard.hidden = false;
      setText(el.goalTitle, 'Fastenziel fast erreicht');
      setText(
        el.goalBody,
        'Noch ' + words(state.remainingMs, 'ceil') + ' bis zu deinen ' + state.fastTotalWords +
          ' – um ' + state.fastEndLabel + ' Uhr ist es geschafft.'
      );
    } else {
      el.goalCard.hidden = true;
    }

    /* Jetzt */
    const phase = state.phase;
    setText(el.nowTitle, phase ? phase.title : 'Fastenfenster');
    if (phase) {
      setText(
        el.nowMeta,
        'Phase ' + (state.phaseIndex + 1) + ' von ' + config.phases.length + ' · ' +
          rangeLabel(phase) + ' · ' +
          phaseClock(state.fastStart, phase.from) + '–' +
          phaseClock(state.fastStart, phase.to) + ' Uhr'
      );
    } else {
      setText(el.nowMeta, '');
    }
    setText(el.nowLead, 'Du fastest seit ' + words(state.elapsedMs, 'floor') + '.');
    setText(el.nowBody, phase ? phase.detail : '');

    /* Als Nächstes */
    if (state.nextPhase) {
      setText(el.nextTitle, state.nextPhase.title);
      setText(
        el.nextLead,
        'In ' + words(state.msToNextPhase, 'ceil') + ', um ' +
          phaseClock(state.fastStart, state.nextPhase.from) +
          ' Uhr, erreichst du die nächste Fastenphase.'
      );
      setText(el.nextBody, state.nextPhase.description);
    } else {
      setText(el.nextTitle, 'Fastenziel: ' + state.fastTotalWords);
      setText(
        el.nextLead,
        'In ' + words(state.remainingMs, 'ceil') + ', um ' + state.fastEndLabel +
          ' Uhr, hast du dein Fastenziel erreicht.'
      );
      setText(
        el.nextBody,
        'Danach öffnet sich dein Essensfenster von ' +
          state.fastEndLabel + ' bis ' + state.nextFastStartLabel + ' Uhr.'
      );
    }
  }

  function renderEating(state) {
    const remaining = state.eatingRemainingMs;

    /* Kopf */
    setText(el.statusHeadline, 'Dein Essensfenster ist geöffnet');
    setText(el.modeLabel, 'Essen bis ' + state.nextFastStartLabel + ' Uhr');

    /* Ring: zählt auf den nächsten Fastenbeginn zu */
    setText(el.ringPrimary, digits(remaining, 'ceil') + ' h');
    setText(el.ringLink, 'bis');
    setText(el.ringSecondary, state.nextFastStartLabel + ' Uhr');
    setText(el.ringCaption, 'Noch ' + words(remaining, 'ceil'));

    /* Eckpunkte */
    setText(el.anchorStartLabel, 'Fasten beendet');
    setText(el.anchorStartTime, state.fastEndLabel);
    setText(el.anchorEndLabel, 'Nächstes Fasten');
    setText(el.anchorEndTime, state.nextFastStartLabel);

    /* Fastenziel – abgeschlossen */
    el.goalCard.hidden = false;
    setText(el.goalTitle, 'Fasten abgeschlossen');
    setText(
      el.goalBody,
      state.fastTotalWords + ' geschafft. Dein Essensfenster läuft bis ' +
        state.nextFastStartLabel + ' Uhr.'
    );

    /* Jetzt */
    setText(el.nowTitle, 'Essensfenster');
    setText(
      el.nowMeta,
      state.fastEndLabel + '–' + state.nextFastStartLabel + ' Uhr · ' +
        words(state.eatingTotalMs, 'floor')
    );
    setText(el.nowLead, 'Geöffnet seit ' + words(state.eatingElapsedMs, 'floor') + '.');
    setText(
      el.nowBody,
      'Nutze dein Fenster von ' + state.fastEndLabel + ' bis ' + state.nextFastStartLabel +
        ' Uhr in Ruhe – danach beginnt der nächste Fastenzyklus.'
    );

    /* Als Nächstes */
    setText(el.nextTitle, 'Fastenbeginn um ' + state.nextFastStartLabel + ' Uhr');
    setText(el.nextLead, 'Nächstes Fasten beginnt in ' + words(remaining, 'ceil') + '.');
    setText(
      el.nextBody,
      'Dann startet dein Fastenfenster über ' + state.fastTotalWords + ' bis ' +
        state.fastEndLabel + ' Uhr.'
    );
  }

  /* ---- Einstellungen ------------------------------------------------------
     Öffnet das Sheet, prüft die Eingaben und übernimmt sie ohne Neuladen.
     ---------------------------------------------------------------------- */
  function applyConfig(values) {
    config = Fasting.resolveConfig(values);
    buildPhaseList();
    tick();
  }

  function updateSummary() {
    const start = el.inputStart.value;
    const end = el.inputEnd.value;
    const check = Settings.validate(start, end);

    if (!check.ok) {
      setText(el.settingsSummary, '');
      return;
    }

    const preview = Fasting.resolveConfig({ fastStart: start, fastEnd: end, phases: [] });
    setText(
      el.settingsSummary,
      'Fastendauer ' + words(preview.fastMs, 'floor') +
        ' · Essensfenster ' + words(preview.eatMs, 'floor')
    );
    showError('');
  }

  function showError(message) {
    setText(el.settingsError, message);
    el.settingsError.hidden = !message;
  }

  function openSettings() {
    el.inputStart.value = config.fastStartLabel;
    el.inputEnd.value = config.fastEndLabel;
    showError('');
    updateSummary();

    if (typeof el.settingsDialog.showModal === 'function') el.settingsDialog.showModal();
    else el.settingsDialog.setAttribute('open', '');
  }

  function closeSettings() {
    if (typeof el.settingsDialog.close === 'function') el.settingsDialog.close();
    else el.settingsDialog.removeAttribute('open');
  }

  el.settingsOpen.addEventListener('click', openSettings);
  el.settingsClose.addEventListener('click', closeSettings);

  // Tippen neben dem Sheet schließt es (Klicks auf den Backdrop treffen den Dialog selbst).
  el.settingsDialog.addEventListener('click', function (event) {
    if (event.target === el.settingsDialog) closeSettings();
  });
  el.inputStart.addEventListener('input', updateSummary);
  el.inputEnd.addEventListener('input', updateSummary);

  el.settingsForm.addEventListener('submit', function (event) {
    const values = { fastStart: el.inputStart.value, fastEnd: el.inputEnd.value };
    const result = Settings.save(values);

    if (!result.ok) {
      event.preventDefault(); // Sheet bleibt offen, Hinweis wird angezeigt
      showError(result.message);
      return;
    }

    applyConfig(Settings.load(FASTING_CONFIG));
    // method="dialog" schließt das Sheet anschließend selbst.
  });

  el.settingsReset.addEventListener('click', function () {
    Settings.reset();
    applyConfig(Settings.load(FASTING_CONFIG));
    el.inputStart.value = config.fastStartLabel;
    el.inputEnd.value = config.fastEndLabel;
    showError('');
    updateSummary();
  });

  /* ---- Takt --------------------------------------------------------------
     Sekundengenau, aber auf die Sekundengrenze ausgerichtet. Nach Rückkehr
     aus dem Hintergrund wird sofort neu berechnet, damit die Anzeige nie
     veraltet ist.
     ---------------------------------------------------------------------- */
  let timer = null;

  function tick() {
    render(new Date());
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    const interval = config.raw.tickIntervalMs || 1000;
    const drift = Date.now() % interval;
    timer = setTimeout(tick, interval - drift);
  }

  function refreshNow() {
    if (document.visibilityState === 'hidden') return;
    tick();
  }

  document.addEventListener('visibilitychange', refreshNow);
  window.addEventListener('focus', refreshNow);
  window.addEventListener('pageshow', refreshNow);

  buildPhaseList();
  tick();

  /* ---- Service Worker ----------------------------------------------------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        /* Offline-Betrieb ist optional – Fehler bewusst ignorieren. */
      });
    });
  }
})();
