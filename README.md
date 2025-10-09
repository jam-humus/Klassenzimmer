# ClassQuest – Kinderfreundliches Desktop-Dashboard

Die Web-Implementierung wurde in `classquest_legacy/` archiviert. Ab sofort bildet eine komplett neue **PyQt5 Desktop-App** das Herzstück des Projekts.

## 🚀 Highlights des Redesigns

- 🌈 **Neue Tabs:** Schüler:innen, Trophäenschrank und Belohnungen als gut strukturierte Registerkarten.
- 🧒 **Kinderfreundliche Gestaltung:** 50/50-Avatar-Layout, extra große Typografie für XP/Level, großzügige Buttons (≥ 64 px) und klare Farbrollen.
- 🏆 **Trophäenschrank:** Großformatige SVG-Karten mit Detaildialog.
- 🎁 **Belohnungen:** Checklisten-Mehrfachauswahl links, XP-Vergabe über farbige Großbuttons rechts.
- 💾 **SQLite-Datenhaltung:** `data/store.py` bündelt CRUD, XP-Logik und Standard-Belohnungen.
- 🎨 **Theming & Vektoren:** Alle Grafiken als Inline-SVG (`ui/vector_assets.py`), Styles zentral in `ui/theme.py`.

## 🗂️ Modulüberblick

```
Klassenzimmer/
├─ data/
│  ├─ models.py        # Student, Badge, Reward
│  └─ store.py         # SQLite-Fassade & XP-/Badge-Methoden
├─ ui/
│  ├─ main_window.py   # QMainWindow mit Tabs
│  ├─ students_tab.py  # 50/50-Avataransicht + Fortschritt
│  ├─ trophy_cabinet.py# Raster mit Ordenkarten + Detaildialog
│  ├─ rewards_tab.py   # Checkliste + XP-Buttons
│  ├─ theme.py         # Farbpalette & Button-Styles
│  └─ vector_assets.py # Inline-SVGs für Avatar & Orden
└─ scripts/
   └─ check_no_binaries.py
```

## 🔄 Migration & Legacy

- `classquest/` → `classquest_legacy/` (archivierte Web-Oberfläche, nicht mehr benötigt).
- `ui/main_window.py` ersetzt alle vorherigen UI-Einstiege; Legacy-Widgets werden nicht mehr geladen.

## 🖼️ UI-Eindrücke (beschreibend)

1. **Schüler:innen-Tab:** Linker Splitter mit halbseitigem Avatar, rechts XP/Level in 36 pt, grüner Fortschrittsbalken, Badge-Galerie darunter.
2. **Trophäenschrank-Tab:** Scrollbares Raster aus 3×n Karten, jede Karte mit 160 px SVG und fettem Titel ≥ 18 pt.
3. **Belohnungen-Tab:** Links Checkbox-Liste aller Schüler:innen, rechts 2-spaltiges Grid aus großen Buttons (+XP) mit farblich kodierten Styles.

## ▶️ Starten der Desktop-App

```bash
python -m ui.main_window
```

Beim ersten Start erzeugt die App Demo-Daten (`Alex Abenteuer`) und Standard-Belohnungen.

## 🧪 Prüfscript & Hooks

- `scripts/check_no_binaries.py` überprüft das Repo auf verbotene Endungen.
- Pre-Commit-Hook installieren:

  ```bash
  chmod +x .git/hooks/pre-commit
  cat > .git/hooks/pre-commit <<'HOOK'
  #!/usr/bin/env bash
  set -e
  BLOCKED_EXTENSIONS='png|jpg|jpeg|gif|bmp|webp|mp4|mov|avi|zip|psd|ico'
  FILES=$(git diff --cached --name-only)
  if echo "$FILES" | grep -E "\.($BLOCKED_EXTENSIONS)$" >/dev/null; then
    echo "❌ Commit abgebrochen: Binärdateien sind im Projekt untersagt."
    echo "$FILES" | grep -E "\.($BLOCKED_EXTENSIONS)$"
    exit 1
  fi
  exit 0
  HOOK
  ```

## 🚫 Keine Binärdateien

Die `.gitignore`, `.gitattributes`, das Pre-Commit-Hook und das Prüfscript blockieren alle gängigen Bild-/Video-Formate. Neue Assets bitte ausschließlich als SVG-Strings oder prozeduralen Code anlegen.

Viel Spaß mit der neuen Desktop-Erfahrung! 💙
