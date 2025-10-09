# Schüleransicht – Tastaturkürzel

Die Schüleransicht unterstützt folgende Shortcuts:

- **Pfeil nach links/rechts**: Navigiert zyklisch zum vorherigen bzw. nächsten Schüler in der Übersicht und im Detail-Overlay.
- **Esc**: Schließt die Schülerdetailansicht sowie geöffnete Avatar-Zoom-Modals.
- **Enter/Leertaste auf dem Avatar**: Öffnet den Avatar-Zoom.

Die Navigation funktioniert nur, wenn kein Texteingabefeld fokussiert ist.

## Avatar-Entwicklung

Die aktuelle Evolutionssequenz kombiniert ein leichtes Schütteln, einen kurzen Weißblitz und eine einfache Überblendung zwischen altem und neuem Avatar.【F:classquest/src/ui/show/EvolutionSequence.tsx†L20-L109】 Dadurch bleibt die Animation performant und funktioniert ohne zusätzliche Abhängigkeiten direkt in React. Wenn wir künftig einen größeren „Level-up“-Moment inszenieren möchten, könnten wir mehrere Aspekte aus der vorgeschlagenen Qt-Umsetzung adaptieren:

- **Aufwendigere Übergänge**: Das dort vorgesehene Crossfade mit OutBack-Skalierung ließe sich als CSS- bzw. Web-Animation nachbauen, um dem Avatar beim Einblenden mehr Dynamik zu geben.
- **Partikel-Effekte**: Eine leichte Konfetti-Burst-Animation könnte mit einer Canvas- oder WebGL-Schicht (z. B. `react-confetti` oder einer kleinen eigenen Partikel-Engine) ergänzt werden, ohne dass sie nach der Sequenz weiter rendert.
- **Begleitende Effekte**: Optionaler Glow oder ein kurzer Soundeffekt (etwa über die bestehende Audio-Infrastruktur) würden den Meilenstein stärker hervorheben, sollten aber abschaltbar bleiben, damit die Ansicht im Unterricht nicht zu laut oder ablenkend wirkt.

Bevor wir zusätzliche Effekte einbauen, müssten wir sicherstellen, dass sie auf den vorhandenen Endgeräten flüssig laufen und keine Accessibility-Aspekte (z. B. „reduced motion“) verletzen. Die Qt-Variante zeigt aber, dass eine reichhaltigere Inszenierung technisch möglich ist, sofern wir sie in unsere Webtechnologie übersetzen.
