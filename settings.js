/* ============================================================================
   EINSTELLUNGEN
   ----------------------------------------------------------------------------
   Speichert die angepassten Fastenzeiten lokal im Browser (localStorage).
   Es verlässt nichts das Gerät. Die Voreinstellung steht in config.js und
   bleibt unverändert – "Zurücksetzen" löscht nur den lokalen Eintrag.

   Bewusst schlank gehalten: gespeichert wird ausschließlich, was von der
   Voreinstellung abweicht. Weitere Einstellungen lassen sich später ergänzen,
   indem sie in OVERRIDABLE aufgenommen werden.
   ========================================================================== */

const Settings = (function () {
  'use strict';

  const STORAGE_KEY = 'intervallfasten.settings';
  const OVERRIDABLE = ['fastStart', 'fastEnd'];
  const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

  function isValidTime(value) {
    return typeof value === 'string' && TIME_PATTERN.test(value.trim());
  }

  function storage() {
    try {
      // Im privaten Modus mancher Browser wirft schon der Zugriff.
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (error) {
      return null;
    }
  }

  /** Gespeicherte Abweichungen lesen – defekte Einträge werden ignoriert. */
  function readOverrides() {
    const store = storage();
    if (!store) return {};
    try {
      const parsed = JSON.parse(store.getItem(STORAGE_KEY) || '{}');
      if (!parsed || typeof parsed !== 'object') return {};
      const clean = {};
      OVERRIDABLE.forEach(function (key) {
        if (isValidTime(parsed[key])) clean[key] = parsed[key].trim();
      });
      return clean;
    } catch (error) {
      return {};
    }
  }

  /**
   * Prüft ein Zeitenpaar, bevor es gespeichert wird.
   * @returns {{ok: boolean, message?: string}}
   */
  function validate(fastStart, fastEnd) {
    if (!isValidTime(fastStart) || !isValidTime(fastEnd)) {
      return { ok: false, message: 'Bitte beide Zeiten im Format HH:MM angeben.' };
    }
    if (fastStart.trim() === fastEnd.trim()) {
      return { ok: false, message: 'Beginn und Ende dürfen nicht identisch sein.' };
    }
    return { ok: true };
  }

  /** Voreinstellung + gespeicherte Abweichungen als vollständige Konfiguration. */
  function load(defaults) {
    return Object.assign({}, defaults, readOverrides());
  }

  /** Speichert die Zeiten. Gibt das Prüfergebnis zurück. */
  function save(values) {
    const result = validate(values.fastStart, values.fastEnd);
    if (!result.ok) return result;

    const store = storage();
    if (!store) {
      return { ok: false, message: 'Dieser Browser erlaubt kein lokales Speichern.' };
    }
    try {
      store.setItem(
        STORAGE_KEY,
        JSON.stringify({
          fastStart: values.fastStart.trim(),
          fastEnd: values.fastEnd.trim()
        })
      );
    } catch (error) {
      return { ok: false, message: 'Die Zeiten konnten nicht gespeichert werden.' };
    }
    return { ok: true };
  }

  /** Löscht die lokalen Abweichungen – danach gilt wieder config.js. */
  function reset() {
    const store = storage();
    if (!store) return;
    try {
      store.removeItem(STORAGE_KEY);
    } catch (error) {
      /* nichts zu tun */
    }
  }

  /** Wurden die Zeiten gegenüber der Voreinstellung geändert? */
  function isCustomised() {
    return Object.keys(readOverrides()).length > 0;
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    isValidTime: isValidTime,
    validate: validate,
    load: load,
    save: save,
    reset: reset,
    isCustomised: isCustomised
  };
})();

/* Für Tests unter Node.js – im Browser ohne Wirkung. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Settings;
}
