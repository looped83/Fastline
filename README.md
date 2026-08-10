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
- die nächste Phase und wann sie erreicht ist
- Fastenbeginn und Fastenende
- im Essensfenster: wann das nächste Fasten beginnt

Die Anzeige aktualisiert sich sekündlich selbst und rechnet nach Rückkehr aus
dem Hintergrund sofort neu – ein Neuladen ist nie nötig.
Light- und Dark-Mode folgen automatisch der Systemeinstellung.

## Fastenzeiten ändern

Alle Einstellungen stehen oben in [`config.js`](config.js):

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
| `config.js`            | **Fastenzeiten und Phasentexte**                               |
| `fasting.js`           | Berechnung des Fastenzustands (ohne DOM, dadurch testbar)      |
| `app.js`               | Verbindung von Logik und Anzeige, Aktualisierungstakt          |
| `sw.js`                | Service Worker für den Offline-Betrieb                         |
| `manifest.webmanifest` | Web App Manifest für die Installation                          |
| `tests/`               | Tests der Fastenlogik                                          |

## Hinweis

Die Angaben zu den Fastenphasen sind eine grobe Orientierung. Was im Körper
wann passiert, unterscheidet sich individuell. Die App ist ein persönliches
Hilfsmittel und ersetzt keine medizinische Beratung.
