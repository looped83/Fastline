/* ============================================================================
   KONFIGURATION
   ----------------------------------------------------------------------------
   Voreinstellung der App. Die Zeiten lassen sich in der App direkt an den
   Uhrzeiten unter dem Ring ändern; settings.js legt die Abweichung dann lokal
   im Browser ab. Diese Datei bleibt dabei unverändert und ist der Stand, auf
   den "Zurücksetzen" zurückfällt.

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

  /* ---- Fastenphasen ------------------------------------------------------
     "from"/"to" sind Stunden seit Fastenbeginn; die Übergänge sind fließend.

     Die Liste deckt jedes einstellbare Fenster ab – das längste mögliche ist
     23:59 – und wird automatisch auf die eingestellte Fastendauer gekürzt.
     Ein 17-Stunden-Fasten endet dadurch mitten in der Phase "Längere
     Fastenphase", ein 14-Stunden-Fasten in "Zelluläre Reinigung".
     ---------------------------------------------------------------------- */
  phases: [
    {
      from: 0,
      to: 3,
      title: 'Verdauungsphase',
      description: 'Der Körper verarbeitet die letzte Mahlzeit.',
      detail: 'Dein Körper verarbeitet die letzte Mahlzeit und nutzt deren Energie.'
    },
    {
      from: 3,
      to: 5,
      title: 'Übergang in den Fastenstoffwechsel',
      description: 'Die Verdauung klingt ab, Blutzucker und Insulin sinken.',
      detail: 'Die Verdauung klingt ab. Blutzucker und Insulin sinken, der Stoffwechsel stellt um.'
    },
    {
      from: 5,
      to: 8,
      title: 'Zuckerspeicher werden genutzt',
      description: 'Die Energie kommt aus dem Glykogen in Leber und Muskulatur.',
      detail: 'Deine Energie kommt jetzt aus den Zuckerspeichern in Leber und Muskulatur.'
    },
    {
      from: 8,
      to: 10,
      title: 'Fettstoffwechsel nimmt zu',
      description: 'Die Zuckerspeicher leeren sich, gespeichertes Fett wird zur Energiequelle.',
      detail: 'Deine Zuckerspeicher leeren sich. Gespeichertes Fett wird zur Energiequelle.'
    },
    {
      from: 10,
      to: 12,
      title: 'Ketonkörper nehmen zu',
      description: 'Aus Fettsäuren entstehen Ketonkörper als alternativer Brennstoff.',
      detail: 'Aus Fettsäuren entstehen Ketonkörper – ein alternativer Brennstoff fürs ' +
              'Gehirn. Den Zucker, den es weiterhin braucht, stellt deine Leber selbst her.'
    },
    {
      from: 12,
      to: 14,
      title: 'Zelluläre Reinigung (Autophagie)',
      description: 'Zellen bauen beschädigte Bestandteile ab und verwerten sie.',
      detail: 'Deine Zellen bauen beschädigte Bestandteile ab und verwerten sie.'
    },
    {
      from: 14,
      to: 16,
      title: 'Autophagie und Ketose vertiefen sich',
      description: 'Fettverbrennung und zelluläre Reinigung laufen weiter.',
      detail: 'Fettverbrennung und zelluläre Reinigung laufen weiter.'
    },
    {
      from: 16,
      to: 18,
      title: 'Längere Fastenphase',
      description: 'Der Stoffwechsel läuft überwiegend auf Fett.',
      detail: 'Dein Stoffwechsel läuft überwiegend auf Fett. Die letzte Etappe.'
    },
    {
      from: 18,
      to: 20,
      title: 'Wachstumshormon steigt',
      description: 'Der Körper schützt die Muskulatur, die Ketose vertieft sich.',
      detail: 'Dein Körper schüttet vermehrt Wachstumshormon aus – das schützt die ' +
              'Muskulatur, während die Ketose sich vertieft.'
    },
    {
      from: 20,
      // Bis 25 statt 24: Ein Fenster kann in der Nacht der Zeitumstellung eine
      // Stunde länger ausfallen. Auf die tatsächliche Länge wird ohnehin
      // gekürzt, der höhere Wert kostet also nichts und lässt keine Lücke.
      to: 25,
      title: 'Zuckerspeicher erschöpft',
      description: 'Die Leber stellt den nötigen Zucker selbst her. Ausreichend trinken.',
      detail: 'Deine Zuckerspeicher sind weitgehend leer; die Leber stellt den ' +
              'verbleibenden Bedarf selbst her. Achte auf ausreichend Flüssigkeit.'
    }
  ]
};

/* Für Tests unter Node.js – im Browser ohne Wirkung. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FASTING_CONFIG;
}
