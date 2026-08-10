/* ============================================================================
   Tests für die Fasten-Logik – ohne Abhängigkeiten ausführbar:
       node tests/fasting.test.js
   ========================================================================== */

const assert = require('assert');
const CONFIG = require('../config.js');
const Fasting = require('../fasting.js');
const Settings = require('../settings.js');

const resolved = Fasting.resolveConfig(CONFIG);

/** Lokales Datum bauen: at('2026-08-10 10:42') */
function at(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(text);
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
}

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push(['ok', name]);
  } catch (error) {
    results.push(['FEHLER', name + ' – ' + error.message]);
  }
}

/* ---- Grundwerte --------------------------------------------------------- */
test('Fastendauer beträgt 17 Stunden, Essensfenster 7 Stunden', function () {
  assert.strictEqual(resolved.fastMinutes, 17 * 60);
  assert.strictEqual(resolved.eatMinutes, 7 * 60);
  assert.strictEqual(resolved.fastStartLabel, '19:00');
  assert.strictEqual(resolved.fastEndLabel, '12:00');
});

/* ---- Modus-Erkennung ---------------------------------------------------- */
test('20:30 abends liegt im Fastenfenster', function () {
  const state = Fasting.computeState(at('2026-08-10 20:30'), resolved);
  assert.strictEqual(state.mode, 'fasting');
  assert.strictEqual(Fasting.formatDurationWords(state.elapsedMs, 'floor'), '1 Stunde 30 Minuten');
  assert.strictEqual(state.fastStart.getDate(), 10);
  assert.strictEqual(state.fastEnd.getDate(), 11);
});

test('05:42 morgens gehört zum Fasten des Vortags', function () {
  const state = Fasting.computeState(at('2026-08-11 05:42'), resolved);
  assert.strictEqual(state.mode, 'fasting');
  assert.strictEqual(state.fastStart.getDate(), 10);
  assert.strictEqual(state.fastStart.getHours(), 19);
  assert.strictEqual(Fasting.formatDurationDigits(state.elapsedMs, 'floor'), '10:42');
  assert.strictEqual(state.percent, 63);
});

test('Genau 19:00 startet ein neues Fasten bei 0', function () {
  const state = Fasting.computeState(at('2026-08-10 19:00'), resolved);
  assert.strictEqual(state.mode, 'fasting');
  assert.strictEqual(state.elapsedMs, 0);
  assert.strictEqual(state.progress, 0);
  assert.strictEqual(state.phaseIndex, 0);
});

test('Genau 12:00 öffnet das Essensfenster', function () {
  const state = Fasting.computeState(at('2026-08-11 12:00'), resolved);
  assert.strictEqual(state.mode, 'eating');
  assert.strictEqual(state.eatingElapsedMs, 0);
  assert.strictEqual(state.nextFastStartLabel, '19:00');
  assert.strictEqual(Fasting.formatDurationWords(state.eatingRemainingMs, 'ceil'), '7 Stunden');
});

test('14:37 liegt im Essensfenster mit Countdown bis 19:00', function () {
  const state = Fasting.computeState(at('2026-08-11 14:37'), resolved);
  assert.strictEqual(state.mode, 'eating');
  assert.strictEqual(Fasting.formatDurationWords(state.eatingRemainingMs, 'ceil'), '4 Stunden 23 Minuten');
  assert.strictEqual(Fasting.formatDurationWords(state.eatingElapsedMs, 'floor'), '2 Stunden 37 Minuten');
  assert.strictEqual(state.phase, null);
});

test('18:59 ist noch Essensfenster, 19:01 bereits Fasten', function () {
  assert.strictEqual(Fasting.computeState(at('2026-08-11 18:59'), resolved).mode, 'eating');
  assert.strictEqual(Fasting.computeState(at('2026-08-11 19:01'), resolved).mode, 'fasting');
});

test('11:59 ist noch Fasten, 12:01 bereits Essensfenster', function () {
  assert.strictEqual(Fasting.computeState(at('2026-08-11 11:59'), resolved).mode, 'fasting');
  assert.strictEqual(Fasting.computeState(at('2026-08-11 12:01'), resolved).mode, 'eating');
});

/* ---- Phasen ------------------------------------------------------------- */
test('Phasen werden korrekt zugeordnet', function () {
  const cases = [
    ['2026-08-10 19:30', 0, 'Verdauungsphase'],
    ['2026-08-10 23:00', 1, 'Übergang in den Fastenstoffwechsel'],
    ['2026-08-11 01:00', 2, 'Zuckerspeicher werden genutzt'],
    ['2026-08-11 04:00', 3, 'Fettstoffwechsel nimmt zu'],
    ['2026-08-11 06:00', 4, 'Ketonkörper nehmen zu'],
    ['2026-08-11 08:00', 5, 'Zelluläre Reinigung (Autophagie)'],
    ['2026-08-11 10:00', 6, 'Autophagie und Ketose vertiefen sich'],
    ['2026-08-11 11:30', 7, 'Längere Fastenphase']
  ];
  cases.forEach(function (entry) {
    const state = Fasting.computeState(at(entry[0]), resolved);
    assert.strictEqual(state.phaseIndex, entry[1], entry[0]);
    assert.strictEqual(state.phase.title, entry[2], entry[0]);
  });
});

test('Nächste Phase und Restzeit stimmen (05:42 -> 1 Stunde 18 Minuten)', function () {
  const state = Fasting.computeState(at('2026-08-11 05:42'), resolved);
  assert.strictEqual(state.phase.title, 'Ketonkörper nehmen zu');
  assert.strictEqual(state.nextPhase.title, 'Zelluläre Reinigung (Autophagie)');
  assert.strictEqual(Fasting.formatDurationWords(state.msToNextPhase, 'ceil'), '1 Stunde 18 Minuten');
});

test('Autophagie-Phase beginnt 12 Stunden nach Fastenbeginn (07:00 Uhr)', function () {
  const before = Fasting.computeState(at('2026-08-11 06:59'), resolved);
  const after = Fasting.computeState(at('2026-08-11 07:01'), resolved);
  assert.strictEqual(before.phase.title, 'Ketonkörper nehmen zu');
  assert.strictEqual(after.phase.title, 'Zelluläre Reinigung (Autophagie)');
  assert.strictEqual(after.phase.from, 12);
});

test('In der letzten Phase ist das Fastenziel der nächste Meilenstein', function () {
  const state = Fasting.computeState(at('2026-08-11 11:13'), resolved);
  assert.strictEqual(state.nextPhase, null);
  assert.strictEqual(state.nextMilestoneIsGoal, true);
  assert.strictEqual(state.goalIsNear, true);
  assert.strictEqual(Fasting.formatDurationWords(state.remainingMs, 'ceil'), '47 Minuten');
});

test('Ziel-Hinweis erscheint erst in der letzten Stunde', function () {
  assert.strictEqual(Fasting.computeState(at('2026-08-11 10:59'), resolved).goalIsNear, false);
  assert.strictEqual(Fasting.computeState(at('2026-08-11 11:00'), resolved).goalIsNear, true);
});

/* ---- Fortschritt & Formatierung ----------------------------------------- */
test('Fortschritt bleibt zwischen 0 und 100 Prozent', function () {
  for (let minute = 0; minute < 1440; minute += 7) {
    const date = new Date(2026, 7, 10, 0, minute, 0, 0);
    const state = Fasting.computeState(date, resolved);
    assert.ok(state.progress >= 0 && state.progress <= 1, 'Fortschritt bei Minute ' + minute);
    assert.ok(state.percent >= 0 && state.percent <= 100);
  }
});

test('Prozentanzeige springt nicht vorzeitig auf 100', function () {
  const state = Fasting.computeState(at('2026-08-11 11:56'), resolved);
  assert.strictEqual(state.percent, 99);
});

test('Dauer-Formatierung nutzt korrekte Singular-/Pluralformen', function () {
  const min = 60 * 1000;
  assert.strictEqual(Fasting.formatDurationWords(61 * min, 'floor'), '1 Stunde 1 Minute');
  assert.strictEqual(Fasting.formatDurationWords(120 * min, 'floor'), '2 Stunden');
  assert.strictEqual(Fasting.formatDurationWords(2 * min, 'floor'), '2 Minuten');
  assert.strictEqual(Fasting.formatDurationWords(20 * 1000, 'floor'), 'weniger als 1 Minute');
  assert.strictEqual(Fasting.formatDurationDigits(9 * 60 * min + 5 * min, 'floor'), '9:05');
});

/* ---- Zeitumstellung ----------------------------------------------------- */
test('Fastenende liegt auch an Zeitumstellungstagen auf 12:00 Uhr', function () {
  // 29.03.2026: Beginn der Sommerzeit in Mitteleuropa.
  const state = Fasting.computeState(at('2026-03-29 08:00'), resolved);
  assert.strictEqual(state.fastEnd.getHours(), 12);
  assert.strictEqual(state.fastEnd.getMinutes(), 0);
  assert.strictEqual(state.fastStart.getHours(), 19);
});

/* ---- Andere Konfiguration ----------------------------------------------- */
test('Geänderte Zeiten (16:8) werden samt Phasen übernommen', function () {
  const other = Fasting.resolveConfig(
    Object.assign({}, CONFIG, { fastStart: '20:00', fastEnd: '12:00' })
  );
  assert.strictEqual(other.fastMinutes, 16 * 60);
  const last = other.phases[other.phases.length - 1];
  assert.strictEqual(last.title, 'Autophagie und Ketose vertiefen sich');
  assert.strictEqual(last.to, 16);
  const state = Fasting.computeState(at('2026-08-11 11:00'), other);
  assert.strictEqual(state.mode, 'fasting');
  assert.strictEqual(state.percent, 94);
  assert.strictEqual(state.nextPhase, null);
});

test('Kurzes Fenster (14:10) kürzt die Phasenliste passend', function () {
  const short = Fasting.resolveConfig(
    Object.assign({}, CONFIG, { fastStart: '20:00', fastEnd: '10:00' })
  );
  assert.strictEqual(short.fastMinutes, 14 * 60);
  const last = short.phases[short.phases.length - 1];
  assert.strictEqual(last.title, 'Zelluläre Reinigung (Autophagie)');
  assert.strictEqual(last.to, 14);
});

test('Langes Fenster (20:4) nutzt auch die Phasen jenseits von 18 Stunden', function () {
  const long = Fasting.resolveConfig(
    Object.assign({}, CONFIG, { fastStart: '16:00', fastEnd: '12:00' })
  );
  assert.strictEqual(long.fastMinutes, 20 * 60);
  const last = long.phases[long.phases.length - 1];
  assert.strictEqual(last.title, 'Verlängertes Fasten');
  assert.strictEqual(last.to, 20);
});

/* ---- Einstellungen ------------------------------------------------------ */
test('Zeiteingaben werden geprüft', function () {
  assert.strictEqual(Settings.validate('19:00', '12:00').ok, true);
  assert.strictEqual(Settings.validate('00:00', '23:59').ok, true);
  assert.strictEqual(Settings.validate('19:00', '19:00').ok, false);
  assert.strictEqual(Settings.validate('24:00', '12:00').ok, false);
  assert.strictEqual(Settings.validate('7:00', '12:00').ok, false);
  assert.strictEqual(Settings.validate('', '12:00').ok, false);
  assert.strictEqual(Settings.validate(null, undefined).ok, false);
});

test('Ohne gespeicherte Änderung gilt die Voreinstellung aus config.js', function () {
  const loaded = Settings.load(CONFIG);
  assert.strictEqual(loaded.fastStart, '19:00');
  assert.strictEqual(loaded.fastEnd, '12:00');
  assert.strictEqual(loaded.phases.length, CONFIG.phases.length);
  assert.strictEqual(Settings.isCustomised(), false);
});

/* ---- Ausgabe ------------------------------------------------------------ */
const failed = results.filter(function (r) { return r[0] !== 'ok'; });
results.forEach(function (r) {
  console.log((r[0] === 'ok' ? '  ✓ ' : '  ✗ ') + r[1]);
});
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' Tests bestanden');
process.exit(failed.length ? 1 : 0);
