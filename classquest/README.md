# ClassQuest Compatibility Layer

The original web dashboard now lives in [`classquest_legacy/`](../classquest_legacy/).
This folder exists so that old documentation pointing to `npm run dev` in `classquest/`
keeps working.

Running the familiar command

```bash
npm install
npm run dev
```

will now spawn the PyQt desktop application (`python -m ui.main_window`).
If you still need to work on the web client, `cd ../classquest_legacy` and
use the usual Vite commands from there.
