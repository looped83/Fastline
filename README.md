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

Die Anzeige aktualisiert sich sekündlich selbst und rechnet nach Rückkehr aus
dem Hintergrund sofort neu – ein Neuladen ist nie nötig.
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
Fastenphasen passen sich an die neue Dauer an. Bei geänderten Dateien die
Version in [`sw.js`](sw.js) (`CACHE_NAME`) hochzählen, damit der Service Worker
den alten Stand ersetzt.

## Lokal starten

Die App besteht nur aus statischen Dateien, braucht aber für den Service Worker
einen echten Server (nicht `file://`):

```bash
python3 -m http.server 8000
# danach http://localhost:8000 öffnen
```

## Icons

Der Fortschrittsring als Glaskörper: Kantenlicht, Reflex, weicher Schatten und
farbiger Lichtschein. Es gibt jede Größe zweimal – hell und dunkel:

```
icons/icon-512.png          icons/icon-512-dark.png
icons/icon-192.png          icons/icon-192-dark.png
icons/icon-maskable-512.png icons/icon-maskable-512-dark.png
icons/apple-touch-icon.png  icons/apple-touch-icon-dark.png
```

Erzeugt werden sie von [`tools/make-icons.py`](tools/make-icons.py); beide
Paletten stehen als `THEMES` oben in der Datei, ebenso Ringgröße und
Fortschrittswert.

`icons/favicon.svg` enthält beide Paletten in einer Datei und schaltet über
`prefers-color-scheme` selbst um – das Tab-Symbol passt sich also automatisch
an.

**Homescreen und Manifest wählen nicht automatisch.** Weder iOS noch das Web
App Manifest kennen eine Icon-Variante nach Systemdesign; iOS wendet auf
Icons von Web-Apps auch keine eigenen Glas-Effekte an (das gibt es nur für
native Icons). Welche Variante dort landet, legen deshalb zwei Stellen fest:

- `index.html`: `<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">`
- `manifest.webmanifest`: die drei `icons`-Einträge und `background_color` /
  `theme_color`

Für die dunkle Variante überall `-dark` an den Dateinamen hängen und die
beiden Farben auf `#0D0F13` setzen.

`apple-touch-icon*.png` ist randlos und ohne Transparenz gespeichert, weil iOS
transparente Flächen sonst schwarz hinterlegt.

## Auf dem Homescreen installieren

- **iOS/Safari:** Teilen → „Zum Home-Bildschirm“
- **Android/Chrome:** Menü → „App installieren“
- **Desktop-Chrome/Edge:** Installationssymbol in der Adressleiste

Nach dem ersten Laden funktioniert die App auch offline.

## Veröffentlichen

Jeder statische Hoster genügt, z. B. GitHub Pages: in den Repository-Settings
unter *Pages* den gewünschten Branch als Quelle wählen. Alle Pfade sind
relativ, die App funktioniert daher auch in einem Unterverzeichnis.

## Tests

Die Zeit- und Phasenlogik ist ohne Browser prüfbar:

```bash
node tests/fasting.test.js
```

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
