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
    statusLead: document.getElementById('statusLead'),
    statusValue: document.getElementById('statusValue'),
    clock: document.getElementById('clock'),
    modeLabel: document.getElementById('modeLabel'),

    ringValue: document.getElementById('ringValue'),
    ringHead: document.getElementById('ringHead'),
    ringPrimary: document.getElementById('ringPrimary'),
    ringLink: document.getElementById('ringLink'),
    ringSecondary: document.getElementById('ringSecondary'),
    ringCaption: document.getElementById('ringCaption'),

    anchorStartTime: document.getElementById('anchorStartTime'),
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

    anchorsBlock: document.getElementById('anchorsBlock'),
    anchorsEditor: document.getElementById('anchorsEditor'),
    editStart: document.getElementById('editStart'),
    editEnd: document.getElementById('editEnd'),
    inputStart: document.getElementById('inputStart'),
    inputEnd: document.getElementById('inputEnd'),
    settingsReset: document.getElementById('settingsReset'),
    settingsDone: document.getElementById('settingsDone'),
    settingsSummary: document.getElementById('settingsSummary'),
    settingsError: document.getElementById('settingsError')
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

  /* ---- Phasen-Timeline ----------------------------------------------------
     Die Liste wird nur dann neu aufgebaut, wenn sie sich tatsächlich ändert –
     nach geänderten Fastenzeiten oder an Tagen mit Zeitumstellung, an denen
     das Fenster eine Stunde länger oder kürzer ist.
     ---------------------------------------------------------------------- */
  let phaseNodes = [];
  let renderedPhases = '';

  function phaseSignature(phases) {
    return phases
      .map(function (phase) {
        return phase.from + '-' + phase.to + ':' + phase.title;
      })
      .join('|');
  }

  function buildPhaseList(phases) {
    el.phaseList.textContent = '';
    phaseNodes = phases.map(function (phase) {
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
    const signature = phaseSignature(state.phases);
    if (signature !== renderedPhases) {
      buildPhaseList(state.phases);
      renderedPhases = signature;
    }

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

  /* ---- Ring ---------------------------------------------------------------
     Bogen und Punkt werden immer gemeinsam aus demselben Fortschrittswert
     gesetzt – getrennt überblendete cx/cy würden den Punkt auf einer Geraden
     quer durch den Ring schicken statt auf der Kreisbahn.

     Bewusst ohne Aufbau-Animation: der Ring steht beim Laden sofort auf dem
     richtigen Stand. Ein Punkt, der bei jedem Öffnen erst einmal um den Ring
     wandert, lenkt von der eigentlichen Aussage ab.
     ---------------------------------------------------------------------- */
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

    // Die Eckpunkte zeigen immer das eingestellte Fastenfenster – sie sind
    // zugleich die Bedienelemente dafür.
    setText(el.anchorStartTime, config.fastStartLabel);
    setText(el.anchorEndTime, config.fastEndLabel);

    if (state.isFasting) renderFasting(state);
    else renderEating(state);

    return state;
  }

  function renderFasting(state) {
    /* Kopf */
    setText(el.statusLead, 'Du fastest seit');
    setText(el.statusValue, words(state.elapsedMs, 'floor'));
    setText(el.modeLabel, 'Fasten bis ' + state.fastEndLabel + ' Uhr');

    /* Ring */
    setText(el.ringPrimary, digits(state.elapsedMs, 'floor') + ' h');
    setText(el.ringLink, 'von');
    setText(el.ringSecondary, state.fastTotalDigits + ' h');
    setText(el.ringCaption, state.percent + ' % geschafft');

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
        'Phase ' + (state.phaseIndex + 1) + ' von ' + state.phases.length + ' · ' +
          rangeLabel(phase) + ' · ' +
          phaseClock(state.fastStart, phase.from) + '–' +
          phaseClock(state.fastStart, phase.to) + ' Uhr'
      );
    } else {
      setText(el.nowMeta, '');
    }
    // Die Fastendauer steht bereits in der Überschrift – hier keine Wiederholung.
    el.nowLead.hidden = true;
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
    setText(el.statusLead, 'Dein Essensfenster');
    setText(el.statusValue, 'ist geöffnet');
    setText(el.modeLabel, 'Essen bis ' + state.nextFastStartLabel + ' Uhr');

    /* Ring: zählt auf den nächsten Fastenbeginn zu */
    setText(el.ringPrimary, digits(remaining, 'ceil') + ' h');
    setText(el.ringLink, 'bis');
    setText(el.ringSecondary, state.nextFastStartLabel + ' Uhr');
    setText(el.ringCaption, 'Noch ' + words(remaining, 'ceil'));

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
    el.nowLead.hidden = false;
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

  /* ---- Fastenzeiten anpassen ---------------------------------------------
     Kein Overlay: Ein Tippen auf die Uhrzeit unter dem Ring macht beide
     Eckpunkte direkt an Ort und Stelle änderbar. Änderungen greifen sofort.
     ---------------------------------------------------------------------- */
  let editing = false;

  function applyConfig(values) {
    config = Fasting.resolveConfig(values);
    tick();   // renderPhases baut die Timeline bei Bedarf selbst neu auf
  }

  function showError(message) {
    setText(el.settingsError, message);
    el.settingsError.hidden = !message;
  }

  function updateSummary() {
    const check = Settings.validate(el.inputStart.value, el.inputEnd.value);
    if (!check.ok) {
      setText(el.settingsSummary, 'Fastendauer –');
      return;
    }

    const preview = Fasting.resolveConfig({
      fastStart: el.inputStart.value,
      fastEnd: el.inputEnd.value,
      phases: []
    });
    setText(
      el.settingsSummary,
      'Fastendauer ' + words(preview.fastMs, 'floor') +
        ' · Essensfenster ' + words(preview.eatMs, 'floor')
    );
  }

  function fillInputs() {
    el.inputStart.value = config.fastStartLabel;
    el.inputEnd.value = config.fastEndLabel;
    updateSummary();
  }

  function focusField(which) {
    const input = which === 'end' ? el.inputEnd : el.inputStart;
    input.focus();
    try {
      // Öffnet auf unterstützenden Browsern direkt die Zeitauswahl.
      if (typeof input.showPicker === 'function') input.showPicker();
    } catch (error) {
      /* z. B. ohne Nutzergeste – dann genügt der Fokus */
    }
  }

  function setEditing(on, which) {
    if (editing !== on) {
      editing = on;
      el.anchorsBlock.classList.toggle('anchors--editing', on);
      el.editStart.hidden = on;
      el.editEnd.hidden = on;
      el.inputStart.hidden = !on;
      el.inputEnd.hidden = !on;
      el.anchorsEditor.hidden = !on;
      el.editStart.setAttribute('aria-expanded', String(on));
      el.editEnd.setAttribute('aria-expanded', String(on));

      if (on) {
        fillInputs();
        showError('');
        document.addEventListener('click', onDocumentClick, true);
        document.addEventListener('keydown', onDocumentKeydown);
      } else {
        showError('');
        document.removeEventListener('click', onDocumentClick, true);
        document.removeEventListener('keydown', onDocumentKeydown);
      }
    }

    if (on && which) focusField(which);
  }

  function onDocumentClick(event) {
    if (!el.anchorsBlock.contains(event.target)) setEditing(false);
  }

  function onDocumentKeydown(event) {
    if (event.key === 'Escape') {
      setEditing(false);
      el.editStart.focus();
    }
  }

  /** Übernimmt die eingegebenen Zeiten, sobald sie gültig sind. */
  function commitTimes() {
    updateSummary();

    const values = { fastStart: el.inputStart.value, fastEnd: el.inputEnd.value };
    const check = Settings.validate(values.fastStart, values.fastEnd);
    if (!check.ok) {
      showError(check.message);
      return;
    }

    const saved = Settings.save(values);
    if (!saved.ok) {
      showError(saved.message);
      return;
    }

    showError('');
    applyConfig(Settings.load(FASTING_CONFIG));
  }

  el.editStart.addEventListener('click', function () { setEditing(true, 'start'); });
  el.editEnd.addEventListener('click', function () { setEditing(true, 'end'); });

  [el.inputStart, el.inputEnd].forEach(function (input) {
    input.addEventListener('change', commitTimes);
    input.addEventListener('input', updateSummary);
  });

  el.settingsDone.addEventListener('click', function () {
    setEditing(false);
    el.editStart.focus();
  });

  el.settingsReset.addEventListener('click', function () {
    Settings.reset();
    applyConfig(Settings.load(FASTING_CONFIG));
    fillInputs();
    showError('');
  });

  /* ---- Takt --------------------------------------------------------------
     Die Anzeige kennt keine Sekunden: Uhrzeit, Dauern und Phasenwechsel
     ändern sich ausschließlich auf vollen Minuten. Deshalb wird auch nur
     dann gerechnet – einmal pro Minute statt sechzigmal.

     Im Hintergrund läuft gar kein Timer. Beim Zurückkehren wird sofort neu
     gerechnet, die Anzeige ist damit nie veraltet.
     ---------------------------------------------------------------------- */
  const MINUTE_MS = 60 * 1000;
  let timer = null;

  function tick() {
    render(new Date());
    schedule();
  }

  function schedule() {
    stop();
    if (document.visibilityState === 'hidden') return;

    // Etwas Zuschlag, damit der Wecker sicher in der neuen Minute landet
    // und nicht kurz davor ein zweites Mal für dieselbe Minute anspringt.
    const untilNextMinute = MINUTE_MS - (Date.now() % MINUTE_MS) + 50;
    timer = setTimeout(tick, untilNextMinute);
  }

  function stop() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') stop();
    else tick();
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pageshow', tick);

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
