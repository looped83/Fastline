/* ============================================================================
   KONFIGURATION
   ----------------------------------------------------------------------------
   Hier werden alle Einstellungen der App gepflegt. Für Version 1 sind die
   Zeiten fest hinterlegt – die Struktur ist aber bereits so angelegt, dass
   später z. B. eine Einstellungs-Seite dieselben Werte schreiben kann
   (etwa aus localStorage) ohne dass die restliche Logik angepasst werden muss.

   fastStart  = Beginn des Fastens   (lokale Uhrzeit, "HH:MM")
   fastEnd    = Ende des Fastens     (lokale Uhrzeit, "HH:MM", am Folgetag)

   Daraus ergeben sich automatisch:
     Fastendauer   = 19:00 -> 12:00  = 17 Stunden
     Essensfenster = 12:00 -> 19:00  =  7 Stunden
   ========================================================================== */

const FASTING_CONFIG = {
  /* ---- Fastenzeiten ------------------------------------------------------ */
  fastStart: '19:00',
  fastEnd: '12:00',

  /* ---- Verhalten --------------------------------------------------------- */
  // Ab wie vielen verbleibenden Minuten "Fastenziel fast erreicht" erscheint.
  goalSoonMinutes: 60,
  // Aktualisierungsintervall der Anzeige in Millisekunden.
  tickIntervalMs: 1000,

  /* ---- Fastenphasen ------------------------------------------------------
     "from"/"to" sind Stunden seit Fastenbeginn und dienen als grobe
     Orientierung – keine exakten biologischen Schwellenwerte.
     Phasen werden automatisch an die konfigurierte Fastendauer angepasst.
     ---------------------------------------------------------------------- */
  phases: [
    {
      from: 0,
      to: 4,
      title: 'Verdauungsphase',
      description:
        'Der Körper verarbeitet die letzte Mahlzeit und nutzt hauptsächlich die daraus verfügbare Energie.',
      detail:
        'Dein Körper ist noch mit der letzten Mahlzeit beschäftigt und nutzt vor allem die daraus verfügbare Energie.'
    },
    {
      from: 4,
      to: 8,
      title: 'Übergang in den Fastenstoffwechsel',
      description:
        'Insulinspiegel sinken typischerweise und gespeicherte Energie wird zunehmend genutzt.',
      detail:
        'Der Insulinspiegel sinkt typischerweise und dein Körper greift zunehmend auf gespeicherte Energie zurück.'
    },
    {
      from: 8,
      to: 12,
      title: 'Fettstoffwechsel nimmt zu',
      description:
        'Der Körper greift zunehmend auf gespeicherte Energiereserven zurück.',
      detail:
        'Dein Körper befindet sich zunehmend in einem Zustand, in dem gespeicherte Energiereserven genutzt werden.'
    },
    {
      from: 12,
      to: 16,
      title: 'Fortgeschrittene Fastenphase',
      description:
        'Die Nutzung von Fett als Energiequelle kann weiter zunehmen. Einige mit Fasten verbundene zelluläre Prozesse können stärker aktiviert werden.',
      detail:
        'Die Nutzung von Fett als Energiequelle kann weiter zunehmen. Einige mit dem Fasten verbundene zelluläre Prozesse können stärker aktiviert werden.'
    },
    {
      from: 16,
      to: 17,
      title: 'Längere Fastenphase',
      description: 'Das tägliche Fastenziel ist fast erreicht.',
      detail: 'Dein tägliches Fastenziel ist fast erreicht – die letzte Etappe läuft.'
    }
  ]
};

/* Für Tests unter Node.js – im Browser ohne Wirkung. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FASTING_CONFIG;
}
