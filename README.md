# Intervallfasten

Eine minimalistische Progressive Web App für das tägliche Intervallfasten.
Eine Seite, keine Anmeldung, keine Datenbank, keine Tracking-Daten – die App
rechnet ausschließlich mit der lokalen Uhrzeit des Geräts.

**Standard-Rhythmus:** Fasten von **19:00 bis 12:00** (17 Stunden),
Essensfenster von **12:00 bis 19:00** (7 Stunden).

## Was die App zeigt

- ob gerade Fasten- oder Essensfenster ist
- wie lange bereits gefastet wird und wie lange noch
- den Fortschritt als großer Ring inkl. Prozentwert
- die aktuelle Fastenphase mit kurzer Erklärung
- die nächste Phase, in wie vielen Minuten und um wie viel Uhr sie beginnt
- alle Fastenphasen mit Stundenbereich **und** konkreter Uhrzeit
  (z. B. „12–14 h · 07:00–09:00 Uhr")
- Fastenbeginn und Fastenende
- im Essensfenster: wann das nächste Fasten beginnt

Die Anzeige rechnet auf jeder vollen Minute neu – häufiger ändert sich nichts,
da alle Angaben minutengenau sind. Im Hintergrund läuft kein Timer; beim
Zurückkehren wird sofort neu gerechnet, ein Neuladen ist nie nötig.
Light- und Dark-Mode folgen automatisch der Systemeinstellung.

## Fastenzeiten ändern

**In der App:** unter dem Ring auf „Fastenbeginn 19:00" oder
„Fastenende 12:00" tippen – die Uhrzeit wird direkt an Ort und Stelle zum
Eingabefeld, darunter erscheinen Fastendauer, Essensfenster und
„Zurücksetzen". Es gibt bewusst kein Overlay und keinen Speichern-Knopf:
Änderungen greifen sofort. Geschlossen wird über „Fertig", Escape oder einen
Tipp daneben. Gespeichert wird ausschließlich lokal im Browser
(`localStorage`).

**Als Voreinstellung im Code** – oben in [`config.js`](config.js):

```js
const FASTING_CONFIG = {
  fastStart: '19:00',   // Beginn des Fastens
  fastEnd:   '12:00',   // Ende des Fastens (am Folgetag)
  ...
};
```

Fastendauer und Essensfenster werden daraus automatisch berechnet, die
Fastenphasen passen sich an die neue Dauer an.

## Änderungen ausliefern

Der Service Worker cacht die App-Shell bei der Installation einmal vollständig
und liefert danach ausschließlich daraus aus – im laufenden Betrieb entsteht
kein Netzverkehr. Nach dem Ändern von Dateien deshalb `CACHE_NAME` in
[`sw.js`](sw.js) hochzählen: der Browser prüft `sw.js` bei jedem Aufruf,
installiert die neue Fassung, lädt die Shell frisch und wirft den alten Cache
weg. Sobald sie übernimmt, lädt die geöffnete Seite sich einmal selbst neu –
außer während einer laufenden Zeiteingabe.

Im Cache liegen nur die tatsächlich eingebundenen Dateien. Wer auf die hellen
Icons umstellt, trägt sie in `APP_SHELL` nach, sonst fehlen sie offline.

## Lokal starten

Die App besteht nur aus statischen Dateien, braucht aber für den Service Worker
einen echten Server (nicht `file://`):

```bash
python3 -m http.server 8000
# danach http://localhost:8000 öffnen
```

## Icons

Der Fortschrittsring als Glaskörper: Kantenlicht, Reflex, weicher Schatten und
farbiger Lichtschein. **Verwendet wird durchgehend die dunkle Variante** – auf
dem Homescreen, im Manifest und als Favicon im Browser-Tab, unabhängig vom
Systemdesign.

Die dunkle Kachel ist bewusst fast flach und neutral gehalten (#232326 nach
#1A1A1D, ohne Lichtschein und ohne Kachelglanz), damit sie sich zwischen
iOS-Systemicons einreiht. Die Plastizität kommt allein vom Ring.

```
verwendet                          Alternative (hell)
icons/icon-512-dark.png            icons/icon-512.png
icons/icon-192-dark.png            icons/icon-192.png
icons/icon-maskable-512-dark.png   icons/icon-maskable-512.png
icons/apple-touch-icon-dark.png    icons/apple-touch-icon.png
```

Erzeugt werden beide Sätze von [`tools/make-icons.py`](tools/make-icons.py);
die Paletten stehen als `THEMES` oben in der Datei, ebenso Ringgröße und
Fortschrittswert.

Auf Hell umstellen heißt: in `index.html` beim `apple-touch-icon` und in
`manifest.webmanifest` bei den drei `icons`-Einträgen das `-dark` entfernen,
`background_color` und `theme_color` auf `#F5F5F3` setzen und `favicon.svg`
auf die hellen Farbwerte ändern.

Zwei Eigenheiten, die den Aufbau erklären:

- iOS wendet auf Icons von Web-Apps keine eigenen Glas-Effekte an (das gibt es
  nur für native Icons) – der Look steckt deshalb im Bild selbst.
- `apple-touch-icon*.png` ist randlos und ohne Transparenz gespeichert, weil
  iOS transparente Flächen sonst schwarz hinterlegt.

## Auf dem Homescreen installieren

- **iOS/Safari:** Teilen → „Zum Home-Bildschirm“
- **Android/Chrome:** Menü → „App installieren“
- **Desktop-Chrome/Edge:** Installationssymbol in der Adressleiste

iOS merkt sich das Homescreen-Icon dauerhaft. Nach einem Icon-Wechsel muss die
App einmal vom Homescreen gelöscht und neu abgelegt werden.

Nach dem ersten Laden funktioniert die App auch offline.

## Veröffentlichen

Jeder statische Hoster genügt, z. B. GitHub Pages: in den Repository-Settings
unter *Pages* den gewünschten Branch als Quelle wählen. Alle Pfade sind
relativ, die App funktioniert daher auch in einem Unterverzeichnis.

## Tests

Die Zeit- und Phasenlogik läuft ohne jede Abhängigkeit:

```bash
npm test          # oder: node tests/fasting.test.js
```

Enthalten sind neben Einzelfällen zwei Durchläufe über längere Zeiträume: ein
Jahr in Sieben-Minuten-Schritten über sechs verschiedene Fastenfenster sowie
die Tage der Zeitumstellung. Geprüft wird dabei, dass sich Fortschritt, Dauer
und Phase nie widersprechen.

Dazu kommen Oberflächentests im echten Browser – sie decken ab, was reine
Logiktests nicht sehen können: Lage des Fortschrittspunkts, ruhiger Aufbau
ohne wandernden Punkt, die Zeiteinstellung inklusive Ablehnung ungültiger
Eingaben, der Wechsel um 12:00 Uhr und der Offline-Betrieb.

```bash
npm install                      # einmalig
npx playwright install chromium  # einmalig
npm run test:ui
```

Liegt Chromium außerhalb des Playwright-Verzeichnisses, hilft
`CHROMIUM_PATH=/pfad/zu/chromium npm run test:ui`.

## Aufbau

| Datei                  | Inhalt                                                        |
| ---------------------- | ------------------------------------------------------------- |
| `index.html`           | Grundgerüst der Seite                                          |
| `styles.css`           | Design, Light/Dark, Responsive-Layout                          |
| `config.js`            | **Fastenzeiten (Voreinstellung) und Phasentexte**              |
| `settings.js`          | Lokal gespeicherte Zeitanpassungen inkl. Prüfung               |
| `fasting.js`           | Berechnung des Fastenzustands (ohne DOM, dadurch testbar)      |
| `app.js`               | Verbindung von Logik und Anzeige, Aktualisierungstakt          |
| `sw.js`                | Service Worker für den Offline-Betrieb                         |
| `manifest.webmanifest` | Web App Manifest für die Installation                          |
| `tests/`               | Tests der Fastenlogik                                          |
| `icons/`               | App-Icons im hellen Glas-Look                                  |
| `tools/make-icons.py`  | Erzeugt die Icons neu (`python3 tools/make-icons.py`, Pillow)  |

## Fastenphasen

Neun Phasen von 0 bis 24 Stunden – darunter die Autophagie ab 12 Stunden –
automatisch gekürzt auf das eingestellte Fastenfenster. Bei 17 Stunden endet
die Timeline in „Längere Fastenphase", bei 14 Stunden in „Zelluläre
Reinigung (Autophagie)". Die Stundenangaben sind Orientierungswerte, die
Übergänge fließend.
