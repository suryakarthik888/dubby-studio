# Dubby Studio

Generate, edit, save, and download Lottie animations of your mascot **Dubby** — with an AI prompt box backed by a serverless function so your API key stays hidden on the server, never in the browser.

```
dubby-studio/
├── index.html        ← the app (Dubby engine, presets, sliders, library)
├── api/
│   └── generate.js   ← serverless backend: holds your key, talks to the LLM
├── vercel.json
├── package.json
├── .env.example
└── .gitignore
```

---

## How it works

- The **frontend** (`index.html`) runs entirely in the browser: it builds the Lottie, previews it, saves a library, and downloads `.json` files. It contains **no API key**.
- The **prompt box** sends your text to `/api/generate`. That serverless function (running on Vercel, not in the browser) adds your API key from a secure environment variable, calls the LLM, and returns the motion settings. Your key is never exposed.

---

## Deploy in ~5 minutes (no terminal needed)

### 1. Put it on GitHub
- Create a new repository on github.com (e.g. `dubby-studio`).
- Use the **"uploading an existing file"** link on the empty repo page and drag in all the files from this folder (keep the `api/` folder structure). Commit.

### 2. Import to Vercel
- Go to **vercel.com → Add New → Project → Import** your `dubby-studio` repo.
- Don't change build settings — Vercel detects it automatically (static site + serverless API).

### 3. Add your key (the important part)
- In the Vercel import screen (or later under **Project → Settings → Environment Variables**), add:
  - `LLM_PROVIDER` = `gemini`
  - `GEMINI_API_KEY` = *your Google AI Studio key*
- (Want a different provider? See `.env.example` for the variable names — set `LLM_PROVIDER` and that provider's key instead.)

### 4. Deploy
- Click **Deploy**. You'll get a live URL like `https://dubby-studio.vercel.app`.
- Open it. The prompt box now works with no key in the browser, and the saved library persists (real `https://` origin, unlike opening the file locally).

> After the first deploy, any change you push to GitHub auto-redeploys.

---

## Switching providers

In Vercel's Environment Variables, set `LLM_PROVIDER` to one of:
`gemini` · `openai` · `anthropic` · `groq` · `openrouter`
and add the matching key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.). Optionally pin a model with `LLM_MODEL`. Redeploy.

If you ever see a "model not found" error, the provider retired that model id — set a current one in `LLM_MODEL` and redeploy. For Gemini today: `gemini-2.5-flash` (default), `gemini-2.5-flash-lite` (cheapest), or `gemini-3.5-flash` (newest).

---

## Notes & next steps

- **Saved library** is stored in the browser (localStorage). On a real Vercel domain this persists per browser, but it does **not** sync across devices. For a cross-device library, the next step is a small store like Vercel KV — ask and it can be added with a couple of API routes.
- **Custom domain**: add one under Vercel → Project → Domains if you want `studio.godubdub.com` or similar.
- The mascot geometry, the motion engine, and all presets are inside `index.html`. New motion primitives can be added there (and mirrored in the backend's spec schema).
