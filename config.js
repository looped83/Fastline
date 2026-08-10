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
     "from"/"to" sind Stunden seit Fastenbeginn. Die Angaben sind eine grobe
     Orientierung und keine exakten biologischen Schwellenwerte – der Übergang
     zwischen den Phasen ist fließend und individuell verschieden.

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
      description:
        'Der Körper verarbeitet die letzte Mahlzeit. Blutzucker und Insulin sind typischerweise noch erhöht.',
      detail:
        'Dein Körper ist noch mit der letzten Mahlzeit beschäftigt und nutzt vor allem die daraus verfügbare Energie.'
    },
    {
      from: 3,
      to: 5,
      title: 'Übergang in den Fastenstoffwechsel',
      description:
        'Die Verdauung klingt ab, Blutzucker und Insulinspiegel sinken typischerweise wieder.',
      detail:
        'Die Verdauung klingt ab. Blutzucker und Insulinspiegel sinken typischerweise – dein Stoffwechsel stellt sich langsam um.'
    },
    {
      from: 5,
      to: 8,
      title: 'Zuckerspeicher werden genutzt',
      description:
        'Der Körper greift verstärkt auf die gespeicherte Energie in Leber und Muskulatur (Glykogen) zurück.',
      detail:
        'Dein Körper deckt seinen Bedarf jetzt vor allem aus den gespeicherten Zuckerreserven (Glykogen).'
    },
    {
      from: 8,
      to: 10,
      title: 'Fettstoffwechsel nimmt zu',
      description:
        'Die Zuckerspeicher leeren sich allmählich, gespeichertes Fett wird zunehmend als Energiequelle genutzt.',
      detail:
        'Deine Zuckerspeicher leeren sich allmählich. Dein Körper befindet sich zunehmend in einem Zustand, in dem gespeicherte Energiereserven genutzt werden.'
    },
    {
      from: 10,
      to: 12,
      title: 'Ketonkörper nehmen zu',
      description:
        'Aus Fettsäuren entstehen typischerweise vermehrt Ketonkörper als alternative Energiequelle. Wie ausgeprägt das ist, unterscheidet sich stark.',
      detail:
        'Aus Fettsäuren entstehen typischerweise vermehrt Ketonkörper. Manche Menschen nehmen das als klareren Kopf wahr – belegt ist das nicht bei allen.'
    },
    {
      from: 12,
      to: 14,
      title: 'Zelluläre Reinigung (Autophagie)',
      description:
        'Autophagie beschreibt zelluläre Aufräumprozesse, bei denen Zellen beschädigte Bestandteile abbauen und verwerten. Fasten kann sie verstärken – ab wann und wie stark das beim Menschen geschieht, ist nicht abschließend geklärt.',
      detail:
        'Autophagie – die zelluläre Selbstreinigung – kann in dieser Phase zunehmen. Wie stark, lässt sich von außen nicht messen und ist beim Menschen noch nicht abschließend erforscht.'
    },
    {
      from: 14,
      to: 16,
      title: 'Autophagie und Ketose vertiefen sich',
      description:
        'Fettverbrennung und zelluläre Reinigungsprozesse können weiter zunehmen. Der Stoffwechsel arbeitet gleichmäßig aus den eigenen Reserven.',
      detail:
        'Fettverbrennung und zelluläre Reinigungsprozesse können weiter zunehmen. Dein Stoffwechsel arbeitet gleichmäßig aus den eigenen Reserven.'
    },
    {
      from: 16,
      to: 18,
      title: 'Längere Fastenphase',
      description:
        'Der Stoffwechsel ist überwiegend auf Fett als Energiequelle eingestellt. Die letzte Etappe des Fastenfensters läuft.',
      detail:
        'Dein Stoffwechsel ist jetzt überwiegend auf Fett als Energiequelle eingestellt. Die letzte Etappe läuft.'
    },
    {
      from: 18,
      to: 24,
      title: 'Verlängertes Fasten',
      description:
        'Ein deutlich längeres Fastenfenster. Ketose und Autophagie können ausgeprägter sein. Ausreichend trinken und auf das eigene Körpergefühl achten.',
      detail:
        'Du bist in einem deutlich längeren Fastenfenster unterwegs. Achte besonders auf ausreichend Flüssigkeit und dein Körpergefühl.'
    }
  ]
};

/* Für Tests unter Node.js – im Browser ohne Wirkung. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FASTING_CONFIG;
}
