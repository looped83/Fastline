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

   Diese Werte sind die Voreinstellung. Werden die Zeiten in der App über
   "Fastenzeiten anpassen" geändert, überschreibt settings.js sie lokal im
   Browser (localStorage) – die Datei hier bleibt unverändert und dient
   weiterhin als Ausgangswert bzw. für "Zurücksetzen".
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
     "from"/"to" sind Stunden seit Fastenbeginn; die Übergänge sind fließend.

     Die Liste deckt bis zu 24 Stunden ab und wird automatisch auf die
     eingestellte Fastendauer gekürzt. Ein 17-Stunden-Fasten endet dadurch
     mitten in der Phase "Längere Fastenphase", ein 14-Stunden-Fasten in
     "Zelluläre Reinigung".
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
      detail: 'Aus Fettsäuren entstehen Ketonkörper – ein alternativer Brennstoff fürs Gehirn.'
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
      to: 24,
      title: 'Verlängertes Fasten',
      description: 'Ein deutlich längeres Fenster. Ausreichend trinken.',
      detail: 'Ein deutlich längeres Fenster. Achte auf ausreichend Flüssigkeit.'
    }
  ]
};

/* Für Tests unter Node.js – im Browser ohne Wirkung. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FASTING_CONFIG;
}
