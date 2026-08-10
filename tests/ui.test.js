/* ============================================================================
   Oberflächentests – prüfen im echten Browser, was die Logiktests nicht sehen:
   Ring, Zeiteinstellung, Offline-Betrieb.

       npm install          (einmalig, holt Playwright)
       npx playwright install chromium
       npm run test:ui

   Startet selbst einen kleinen Server auf einem freien Port.
   Liegt Chromium außerhalb des Playwright-Verzeichnisses, den Pfad über die
   Umgebungsvariable CHROMIUM_PATH angeben.
   ========================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try {
  chromium = require('playwright').chromium;
} catch (error) {
  console.error('Playwright fehlt. Einmalig einrichten:\n' +
                '  npm install && npx playwright install chromium');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml'
};

function startServer() {
  const server = http.createServer(function (req, res) {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/') rel = '/index.html';
    const file = path.join(ROOT, rel);
    fs.readFile(file, function (error, data) {
      if (error) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  });
  return new Promise(function (resolve) {
    server.listen(0, function () {
      resolve({ server: server, base: 'http://127.0.0.1:' + server.address().port });
    });
  });
}

/* ---- winziges Testgerüst ------------------------------------------------- */
const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push(['ok', name]);
  } catch (error) {
    results.push(['FEHLER', name + ' – ' + error.message]);
  }
}
function equal(actual, expected, hint) {
  if (actual !== expected) {
    throw new Error((hint ? hint + ': ' : '') + 'erwartet ' + JSON.stringify(expected) +
                    ', erhalten ' + JSON.stringify(actual));
  }
}
function ok(value, hint) {
  if (!value) throw new Error(hint || 'Bedingung nicht erfüllt');
}

/* Geometrie von Bogen und Fortschrittspunkt auslesen. */
const ringGeometry = page => page.evaluate(() => {
  const head = document.getElementById('ringHead');
  const value = document.getElementById('ringValue');
  const style = getComputedStyle(head);
  const cx = parseFloat(style.cx);
  const cy = parseFloat(style.cy);
  const length = value.getTotalLength();
  const offset = parseFloat(getComputedStyle(value).strokeDashoffset) || 0;
  return {
    abstand: Math.hypot(cx - 100, cy - 100),
    punktWinkel: (Math.atan2(cy - 100, cx - 100) * 180 / Math.PI + 450) % 360,
    bogenWinkel: ((length - offset) / length) * 360,
    sichtbar: head.getAttribute('opacity')
  };
});

(async function run() {
  const { server, base } = await startServer();
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin'
  });
  const page = await context.newPage();

  const konsolenfehler = [];
  page.on('pageerror', e => konsolenfehler.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') konsolenfehler.push(m.text()); });

  // 11.08.2026, 05:42 Ortszeit – mitten im Fasten
  await page.clock.install({ time: new Date('2026-08-11T03:42:00Z') });
  await page.goto(base + '/');
  await page.waitForTimeout(400);

  /* ---- Ring ------------------------------------------------------------- */
  await test('Fortschrittspunkt sitzt exakt am Ende des Bogens', async function () {
    const g = await ringGeometry(page);
    ok(Math.abs(g.abstand - 86) < 0.5, 'Punkt liegt auf der Kreisbahn (86), ist aber ' + g.abstand.toFixed(1));
    ok(Math.abs(g.punktWinkel - g.bogenWinkel) < 0.5,
       'Punkt und Bogenende weichen um ' + Math.abs(g.punktWinkel - g.bogenWinkel).toFixed(1) + ' Grad ab');
  });

  await test('Ring steht beim Laden still, der Punkt wandert nicht', async function () {
    const proben = [];
    for (let i = 0; i < 8; i++) {
      proben.push((await ringGeometry(page)).punktWinkel);
      await page.waitForTimeout(60);
    }
    const spanne = Math.max.apply(null, proben) - Math.min.apply(null, proben);
    ok(spanne < 0.5, 'Punkt wandert um ' + spanne.toFixed(1) + ' Grad');
  });

  await test('Vor dem ersten Skriptlauf ist der Ring leer, nicht geschlossen', async function () {
    const markup = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    ok(/id="ringValue"[\s\S]*?stroke-dashoffset="540\.354"/.test(markup),
       'ringValue braucht stroke-dashoffset im HTML');
    ok(/id="ringHead"[^>]*opacity="0"/.test(markup), 'ringHead muss unsichtbar starten');
  });

  await test('Phasengrenzen sitzen als Punkte auf dem Ring', async function () {
    const m = await page.evaluate(() => {
      const kreise = [...document.querySelectorAll('#ringPhases circle')];
      return {
        anzahl: kreise.length,
        erreicht: kreise.filter(c => c.getAttribute('class').includes('reached')).length,
        aufDerBahn: kreise.every(c => Math.abs(Math.hypot(
          c.getAttribute('cx') - 100, c.getAttribute('cy') - 100) - 86) < 0.5),
        versteckt: document.getElementById('ringPhases').hidden
      };
    });
    // 17-Stunden-Fenster, Grenzen bei 3/5/8/10/12/14/16 h
    equal(m.anzahl, 7, 'Anzahl der Punkte');
    // 10:42 h gefastet -> 3, 5, 8 und 10 h sind überschritten
    equal(m.erreicht, 4, 'erreichte Punkte');
    ok(m.aufDerBahn, 'Punkte liegen nicht auf der Kreisbahn');
    equal(m.versteckt, false, 'Punkte im Fastenfenster ausgeblendet');
  });

  /* ---- Überschrift ------------------------------------------------------- */
  await test('Überschrift bricht fest nach "Du fastest seit" um', async function () {
    const kopf = await page.evaluate(() => {
      const lead = document.getElementById('statusLead').getBoundingClientRect();
      const wert = document.getElementById('statusValue').getBoundingClientRect();
      return {
        lead: document.getElementById('statusLead').textContent,
        untereinander: wert.top >= lead.bottom - 2
      };
    });
    equal(kopf.lead, 'Du fastest seit');
    ok(kopf.untereinander, 'Wert steht nicht unter der Einleitung');
  });

  /* ---- Zeiteinstellung --------------------------------------------------- */
  await test('Antippen der Uhrzeit tauscht Schaltfläche gegen Eingabefeld', async function () {
    await page.click('#editStart');
    await page.waitForTimeout(150);
    const z = await page.evaluate(() => ({
      knopfSichtbar: !document.getElementById('editStart').hidden,
      feldSichtbar: !document.getElementById('inputStart').hidden,
      // Beides gleichzeitig sichtbar war ein echter Fehler: die display-Regel
      // der Klasse hatte das hidden-Attribut überstimmt.
      knopfGerendert: document.getElementById('editStart').getBoundingClientRect().height > 0,
      editorOffen: !document.getElementById('anchorsEditor').hidden,
      fokus: document.activeElement.id
    }));
    equal(z.knopfSichtbar, false, 'Schaltfläche');
    equal(z.knopfGerendert, false, 'Schaltfläche belegt noch Fläche');
    equal(z.feldSichtbar, true, 'Eingabefeld');
    equal(z.editorOffen, true, 'Editor');
    equal(z.fokus, 'inputStart', 'Fokus');
  });

  await test('Gleiche Zeiten werden abgelehnt, der Editor bleibt offen', async function () {
    await page.fill('#inputEnd', '19:00');
    await page.waitForTimeout(150);
    const fehler = await page.textContent('#settingsError');
    ok(fehler.indexOf('identisch') !== -1, 'Fehlermeldung fehlt: ' + fehler);
    equal(await page.evaluate(() => document.getElementById('anchorsEditor').hidden), false);
    equal(await page.textContent('#anchorEndTime'), '12:00', 'alte Zeit bleibt aktiv');
  });

  await test('Gültige Änderung greift sofort und überlebt einen Neustart', async function () {
    await page.fill('#inputEnd', '10:30');
    await page.waitForTimeout(250);
    equal(await page.textContent('#ringSecondary'), '15:30 h', 'Ringmitte');
    const phasen = await page.evaluate(() => document.querySelectorAll('.phase').length);
    equal(phasen, 7, 'Phasenliste passt sich der kürzeren Dauer an');

    await page.reload();
    await page.waitForTimeout(300);
    equal(await page.textContent('#anchorEndTime'), '10:30', 'nach Neuladen');
  });

  await test('Zurücksetzen stellt die Voreinstellung wieder her', async function () {
    await page.click('#editEnd');
    await page.click('#settingsReset');
    await page.waitForTimeout(250);
    equal(await page.textContent('#anchorStartTime'), '19:00');
    equal(await page.textContent('#anchorEndTime'), '12:00');
    equal(await page.evaluate(() => localStorage.getItem('intervallfasten.settings')), null);
  });

  await test('Ein Tipp neben den Bereich schließt die Bearbeitung', async function () {
    // Bewusst ein Element statt fester Koordinaten: die Scrollposition hängt
    // davon ab, was vorher angeklickt wurde.
    await page.click('#phasesTitle');
    await page.waitForTimeout(200);
    equal(await page.evaluate(
      () => document.getElementById('anchorsBlock').classList.contains('anchors--editing')), false);
  });

  /* ---- Zeitverlauf ------------------------------------------------------- */
  await test('Um 12:00 wechselt die App ins Essensfenster', async function () {
    await page.clock.install({ time: new Date('2026-08-11T09:58:20Z') }); // 11:58:20
    await page.reload();
    await page.waitForTimeout(300);
    equal(await page.evaluate(() => document.getElementById('app').dataset.mode), 'fasting');

    await page.clock.runFor(100 * 1000); // -> 12:00:00
    await page.waitForTimeout(100);
    equal(await page.evaluate(() => document.getElementById('app').dataset.mode), 'eating');
    equal(await page.textContent('#clock'), '12:00 Uhr');
    equal(await page.textContent('#modeAnnounce'), 'Essensfenster ist geöffnet.');
    equal(await page.evaluate(() => document.getElementById('ringPhases').hidden), true,
          'Phasenpunkte gehören nicht ins Essensfenster');
  });

  await test('Im Hintergrund läuft kein Timer', async function () {
    const gestellt = await page.evaluate(() => {
      let n = 0;
      const orig = window.setTimeout;
      window.setTimeout = function (fn, ms) { if (ms > 100) n++; return orig.apply(window, arguments); };
      Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      return n;
    });
    equal(gestellt, 0, 'Wecker im Hintergrund');
  });

  /* ---- Offline ----------------------------------------------------------- */
  await test('Nach dem ersten Besuch läuft die App offline weiter', async function () {
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForTimeout(800);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(500);

    const z = await page.evaluate(() => ({
      kopf: document.getElementById('statusLead').textContent.trim(),
      phasen: document.querySelectorAll('.phase').length,
      stilGeladen: getComputedStyle(document.querySelector('.hero__status')).fontWeight === '600'
    }));
    ok(z.kopf.length > 0, 'Kopfzeile leer');
    ok(z.phasen > 0, 'Phasenliste leer');
    ok(z.stilGeladen, 'Stylesheet fehlt');
    await context.setOffline(false);
  });

  await test('Keine Konsolenfehler', function () {
    equal(konsolenfehler.join(' | '), '', 'Konsole');
  });

  /* ---- Ausgabe ----------------------------------------------------------- */
  await browser.close();
  server.close();

  const fehler = results.filter(r => r[0] !== 'ok');
  results.forEach(r => console.log((r[0] === 'ok' ? '  ✓ ' : '  ✗ ') + r[1]));
  console.log('\n' + (results.length - fehler.length) + '/' + results.length + ' Oberflächentests bestanden');
  process.exit(fehler.length ? 1 : 0);
})();
