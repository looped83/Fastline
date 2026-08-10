/* ============================================================================
   FASTEN-LOGIK
   ----------------------------------------------------------------------------
   Reine Berechnungen ohne DOM-Zugriff: aus "jetzt" + Konfiguration wird ein
   vollständiges Zustandsobjekt abgeleitet. Alles rechnet mit der lokalen
   Gerätezeit; Tageswechsel und Zeitumstellungen werden über Kalenderdaten
   (nicht über feste Millisekunden-Offsets) abgebildet.
   ========================================================================== */

const Fasting = (function () {
  'use strict';

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;

  /* ---- Hilfsfunktionen: Zeit -------------------------------------------- */

  /** "19:00" -> 1140 (Minuten seit Mitternacht) */
  function parseTimeToMinutes(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
    if (!match) throw new Error('Ungültige Zeitangabe: ' + value);
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) throw new Error('Ungültige Zeitangabe: ' + value);
    return hours * 60 + minutes;
  }

  /** Datum am selben Kalendertag (+ dayOffset) zur Uhrzeit "minutesOfDay". */
  function dateAt(reference, minutesOfDay, dayOffset) {
    return new Date(
      reference.getFullYear(),
      reference.getMonth(),
      reference.getDate() + (dayOffset || 0),
      Math.floor(minutesOfDay / 60),
      minutesOfDay % 60,
      0,
      0
    );
  }

  function pad2(value) {
    return value < 10 ? '0' + value : String(value);
  }

  /** Date -> "07:05" */
  function formatClock(date) {
    return pad2(date.getHours()) + ':' + pad2(date.getMinutes());
  }

  /**
   * Zerlegt eine Dauer in Stunden/Minuten.
   * rounding: 'floor' für bereits Vergangenes, 'ceil' für Verbleibendes.
   */
  function splitDuration(ms, rounding) {
    const safe = Math.max(0, ms);
    const totalMinutes =
      rounding === 'ceil' ? Math.ceil(safe / MINUTE) : Math.floor(safe / MINUTE);
    return {
      totalMinutes: totalMinutes,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }

  /** Dauer als "10:42" (für große Zahlen im Ring). */
  function formatDurationDigits(ms, rounding) {
    const parts = splitDuration(ms, rounding);
    return parts.hours + ':' + pad2(parts.minutes);
  }

  /** Dauer als "10 Stunden 42 Minuten" (für Fließtext). */
  function formatDurationWords(ms, rounding) {
    const parts = splitDuration(ms, rounding);
    const words = [];
    if (parts.hours > 0) {
      words.push(parts.hours + (parts.hours === 1 ? ' Stunde' : ' Stunden'));
    }
    if (parts.minutes > 0) {
      words.push(parts.minutes + (parts.minutes === 1 ? ' Minute' : ' Minuten'));
    }
    if (words.length === 0) return 'weniger als 1 Minute';
    return words.join(' ');
  }

  /* ---- Konfiguration aufbereiten ---------------------------------------- */

  /** Schneidet die Phasenliste auf ein Fenster von "hours" Stunden zu. */
  function clampPhases(phases, hours) {
    return phases
      .filter(function (phase) {
        return phase.from < hours;
      })
      .map(function (phase) {
        return Object.assign({}, phase, { to: Math.min(phase.to, hours) });
      });
  }

  /**
   * Leitet aus der Konfiguration die abgeleiteten Werte ab und passt die
   * Phasen an die eingestellte Fastendauer an (falls die Zeiten geändert
   * werden, bleibt die Timeline dadurch konsistent).
   */
  function resolveConfig(config) {
    const startMinutes = parseTimeToMinutes(config.fastStart);
    const endMinutes = parseTimeToMinutes(config.fastEnd);

    let fastMinutes = (endMinutes - startMinutes + 1440) % 1440;
    if (fastMinutes === 0) fastMinutes = 1440; // Sonderfall: durchgehendes Fasten
    const eatMinutes = 1440 - fastMinutes;
    const fastHours = fastMinutes / 60;

    return {
      raw: config,
      startMinutes: startMinutes,
      endMinutes: endMinutes,
      fastMinutes: fastMinutes,
      eatMinutes: eatMinutes,
      fastMs: fastMinutes * MINUTE,
      eatMs: eatMinutes * MINUTE,
      fastStartLabel: pad2(Math.floor(startMinutes / 60)) + ':' + pad2(startMinutes % 60),
      fastEndLabel: pad2(Math.floor(endMinutes / 60)) + ':' + pad2(endMinutes % 60),
      goalSoonMs: (config.goalSoonMinutes != null ? config.goalSoonMinutes : 60) * MINUTE,
      phases: clampPhases(config.phases || [], fastHours),
      // Ungekürzt, damit an Tagen mit Zeitumstellung auch auf ein längeres
      // Fenster zugeschnitten werden kann.
      allPhases: config.phases || []
    };
  }

  /* ---- Zustand berechnen ------------------------------------------------- */

  /**
   * Ermittelt den kompletten Fastenzustand zum Zeitpunkt "now".
   * @param {Date} now
   * @param {object} resolved – Ergebnis von resolveConfig()
   */
  function computeState(now, resolved) {
    const startToday = dateAt(now, resolved.startMinutes, 0);

    // Läuft das aktuelle bzw. zuletzt begonnene Fasten seit heute oder gestern?
    const fastStart = now >= startToday ? startToday : dateAt(now, resolved.startMinutes, -1);
    // Über Kalenderdatum statt Millisekunden, damit die Uhrzeit auch bei
    // Sommer-/Winterzeitwechsel exakt auf fastEnd (z. B. 12:00) liegt.
    const endDayOffset = resolved.endMinutes > resolved.startMinutes ? 0 : 1;
    const fastEnd = dateAt(fastStart, resolved.endMinutes, endDayOffset);

    const isFasting = now < fastEnd;

    /* An Tagen mit Zeitumstellung ist das Fenster tatsächlich eine Stunde
       länger oder kürzer als die Uhrzeiten vermuten lassen. Angezeigt wird
       die echte Länge – sonst stünde dort z. B. "17:01 h von 17:00 h". */
    const fastTotalMs = fastEnd - fastStart;
    const windowHours = fastTotalMs / HOUR;
    const nominalHours = resolved.fastMinutes / 60;
    const phases = Math.abs(windowHours - nominalHours) < 0.001
      ? resolved.phases
      : clampPhases(resolved.allPhases, windowHours);

    const state = {
      now: now,
      clock: formatClock(now),
      isFasting: isFasting,
      mode: isFasting ? 'fasting' : 'eating',
      fastStart: fastStart,
      fastEnd: fastEnd,
      fastStartLabel: resolved.fastStartLabel,
      fastEndLabel: resolved.fastEndLabel,
      fastTotalMs: fastTotalMs,
      fastTotalDigits: formatDurationDigits(fastTotalMs, 'floor'),
      fastTotalWords: formatDurationWords(fastTotalMs, 'floor'),
      phases: isFasting ? phases : resolved.phases
    };

    if (isFasting) {
      const elapsedMs = Math.max(0, now - fastStart);
      const remainingMs = Math.max(0, fastEnd - now);
      const progress = clamp01(elapsedMs / state.fastTotalMs);

      state.elapsedMs = elapsedMs;
      state.remainingMs = remainingMs;
      state.progress = progress;
      state.percent = formatPercent(progress);
      state.goalIsNear = remainingMs <= resolved.goalSoonMs;

      // Beginn des Fastens, das auf das folgende Essensfenster wartet.
      const nextFastStart = dateAt(
        fastEnd,
        resolved.startMinutes,
        resolved.startMinutes > resolved.endMinutes ? 0 : 1
      );
      state.nextFastStart = nextFastStart;
      state.nextFastStartLabel = formatClock(nextFastStart);

      Object.assign(state, resolvePhase(elapsedMs, phases));
    } else {
      // Essensfenster: von fastEnd bis zum nächsten Fastenbeginn.
      const eatingStart = fastEnd;
      const nextFastStart = dateAt(now, resolved.startMinutes, 0) > now
        ? dateAt(now, resolved.startMinutes, 0)
        : dateAt(now, resolved.startMinutes, 1);

      state.nextFastStart = nextFastStart;
      state.nextFastStartLabel = formatClock(nextFastStart);
      state.eatingElapsedMs = Math.max(0, now - eatingStart);
      state.eatingRemainingMs = Math.max(0, nextFastStart - now);
      state.eatingTotalMs = Math.max(1, nextFastStart - eatingStart);
      state.progress = clamp01(state.eatingElapsedMs / state.eatingTotalMs);
      state.percent = formatPercent(state.progress);

      // Das zuletzt abgeschlossene Fasten
      state.elapsedMs = state.fastTotalMs;
      state.remainingMs = 0;
      state.phase = null;
      state.phaseIndex = -1;
      state.nextPhase = null;
    }

    return state;
  }

  /** Aktuelle Phase, nächste Phase und Zeit bis zum nächsten Meilenstein. */
  function resolvePhase(elapsedMs, phases) {
    if (!phases.length) {
      return {
        phase: null,
        phaseIndex: -1,
        nextPhase: null,
        msToNextPhase: null
      };
    }

    const elapsedHours = elapsedMs / HOUR;
    let index = phases.findIndex(function (phase) {
      return elapsedHours >= phase.from && elapsedHours < phase.to;
    });
    if (index === -1) index = elapsedHours < phases[0].from ? 0 : phases.length - 1;

    const phase = phases[index];
    const nextPhase = index + 1 < phases.length ? phases[index + 1] : null;
    const msToNextPhase = nextPhase ? Math.max(0, phase.to * HOUR - elapsedMs) : null;

    return {
      phase: phase,
      phaseIndex: index,
      nextPhase: nextPhase,
      msToNextPhase: msToNextPhase
    };
  }

  function clamp01(value) {
    if (!isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  /** Prozent für die Anzeige: nie 100 %, solange noch etwas fehlt. */
  function formatPercent(progress) {
    const rounded = Math.round(progress * 100);
    if (progress < 1 && rounded >= 100) return 99;
    if (progress > 0 && rounded <= 0) return 1;
    return rounded;
  }

  return {
    HOUR: HOUR,
    formatClock: formatClock,
    formatDurationDigits: formatDurationDigits,
    formatDurationWords: formatDurationWords,
    resolveConfig: resolveConfig,
    computeState: computeState
  };
})();

/* Für Tests unter Node.js – im Browser ohne Wirkung. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Fasting;
}
