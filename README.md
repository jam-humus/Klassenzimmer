Hier ist ein vollständiges, klares **README.md** für dein Projekt **ClassQuest**. Es führt deine Prinzipien, das Setup (inkl. Codex-Umgebung), die Projektstruktur und die Phasen-Roadmap zusammen. Du kannst es direkt ins Repo legen.

---

````markdown
# ClassQuest 🚀

Eine **lokale, datenschutzfreundliche Gamification-App** für das Klassenzimmer.  
Ziel: Motivation durch Quests, XP, Level und Badges – alles **offline, DSGVO-konform** und unter Kontrolle der Lehrkraft.

---

## 🌟 Core Principles

- ✅ **Offline & Lokal:** Keine Cloud, keine Server. Alle Daten bleiben auf dem Rechner.
- 🔒 **DSGVO-Konform:** Nur Pseudonyme, keine Telemetrie.
- 🧪 **Testgetrieben:** Kernlogik wird mit Unit-Tests abgedeckt, bevor UI-Features entstehen.
- 🤖 **Agenten-Entwicklung:** Klare Phasen & Prompts für den KI-Coding-Agenten.

---

## 🛠️ Development Setup (Phase 0)

### Voraussetzungen
- **Node.js** v20 oder neuer  
- **Rust Toolchain** (für spätere Phase 8 / Tauri)  
- **pnpm** (optional, empfohlen für schnelles Dependency-Handling)

### Codex-Umgebung
In der Codex-Weboberfläche bei der Erstellung der Umgebung:
- **Container-Bild:** `universal`  
- **Container-Caching:** **Ein**  
- **Umgebungsvariablen:** `OPENAI_API_KEY` als Geheimnis setzen  
- **Internetzugriff für Agenten:** während Setup **Ein**, danach optional **Aus**  

**Setup-Skript:**
```bash
npm install -g pnpm
curl https://sh.rustup.rs -sSf | sh -s -- -y
source $HOME/.cargo/env
cargo install tauri-cli
npx playwright install --with-deps
pnpm install || npm install
````

**Wartungsskript:**

```bash
pnpm install || npm install
npx playwright install --with-deps
```

---

### Projekt initialisieren

```bash
# 1. Vite-Projekt mit React & TypeScript erstellen
npm create vite@latest classquest -- --template react-ts

# 2. In das Verzeichnis wechseln
cd classquest

# 3. Projekt-Dependencies installieren
npm install

# 4. Entwicklungs-Abhängigkeiten hinzufügen
npm install -D \
  eslint prettier \
  vitest @vitest/coverage-v8 \
  playwright @playwright/test \
  eslint-config-prettier \
  eslint-plugin-react-hooks \
  eslint-plugin-react-refresh

# 5. Playwright-Browser installieren
npx playwright install --with-deps
```

---

## 📂 Projektstruktur

```
classquest/
  src/
    core/        # Spiellogik (pure functions, Unit-Tests)
    services/    # StorageAdapter (LocalStorage, später Tauri/SQLite)
    types/       # Datenmodelle
    features/    # UI-Module (Award, Leaderboard, Log, Manage, Shop)
    components/  # wiederverwendbare UI-Bausteine
    app/         # AppContext, Routing, App.tsx
  public/
  package.json
  vite.config.ts
```

---

## 📜 Scripts (package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "format": "prettier -w .",
    "test": "vitest run",
    "test:ui": "playwright test"
  }
}
```

---

## 🧭 Roadmap (Phasen)

**Phase 0 – Fundament**
Setup-Umgebung, Projekt scaffolden, Lint/Tests lauffähig.

**Phase 1 – Core-Domänenmodell & Logik**
Types, XP-Berechnung, Award-Logik, Unit-Tests.

**Phase 2 – Persistenz & Adapter**
StorageAdapter für LocalStorage, Export/Import, Roundtrip-Tests.

**Phase 3 – App-State & Context**
Globaler Zustand mit Reducer/Actions (addStudent, addQuest, awardXP, undo, export/import).

**Phase 4 – Lehrer-UI (MVP)**
Vergabe-Panel, Leaderboard, Log, Management, Undo-Toast.

**Phase 5 – Schüler-Ansicht & Pädagogische Features**
Detailansicht, individuelle Quests, XP-Shop.

**Phase 6 – Administration**
Saison-Reset mit Export/Archiv, Transparenz-Seite.

**Phase 7 – Tests & QS**
E2E mit Playwright (Vergabe-Flow, Export/Import, Undo), Code-Review, A11y-Check.

**Phase 8 – Desktop-Packaging (optional)**
Tauri-Integration, Windows-Builds via GitHub Actions.

