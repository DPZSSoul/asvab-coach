# ASVAB Coach AI proxy

A tiny server that lets the app on GitHub Pages talk to an AI model **without any key in the app**.
The key is a server-side secret (`LLM_API_KEY`). The Arithmetic Reasoning coach prompt lives here too (`worker.js`),
so the browser cannot change it.

- Only accepts requests from `https://dpzssoul.github.io` (CORS + Origin check).
- Only accepts `{ mode, messages:[{role:'user'|'assistant', content}], temperature, max_tokens, json }`. Client system prompts are dropped.
- Caps max tokens per mode, 40 messages, 6000 chars each, about 12 requests a minute and 300 a day per IP.
- `GET` returns `{ proxy:true, configured:true|false, model }`. The app shows "AI coach not set up yet" until `configured` is true.

Default provider: **Google Gemini free tier**, model `gemini-3.5-flash-lite` (OpenAI-compatible endpoint).
Switch providers with variables only:

| Provider | LLM_API_BASE | LLM_MODEL |
| --- | --- | --- |
| Gemini (free tier, default) | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-3.5-flash-lite` |
| xAI Grok | `https://api.x.ai/v1` | `grok-4.20-0309-non-reasoning` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |

Optional: `LLM_REASONING_EFFORT` (`low` by default on Gemini; `off` to send none), `ALLOWED_ORIGIN`, `RATE_PER_MIN`, `RATE_PER_DAY`.

## Deploy: Cloudflare Worker (free, no install)

1. Get a free key: https://aistudio.google.com/apikey (Create API key). For Grok instead, use https://console.x.ai.
2. Go to https://dash.cloudflare.com, then Workers & Pages, Create, Create Worker. Name it `asvab-coach-proxy`. Deploy.
3. Click Edit code. Delete the sample. Paste all of `proxy/worker.js`. Click Deploy.
4. Settings, Variables and Secrets, Add. Type **Secret**, name `LLM_API_KEY`, value = your key. Deploy.
   (For Grok also add text variables `LLM_API_BASE=https://api.x.ai/v1` and `LLM_MODEL=grok-4.20-0309-non-reasoning`.)
5. Copy the worker URL, like `https://asvab-coach-proxy.YOURNAME.workers.dev`. Open it: you should see `"configured":true`.
6. In the app: Settings, AI coach, paste the URL in "AI coach server address", Save, Test AI.
   (Or set `AI_PROXY_URL` near the top of the LLM section in `app.js` so it is the default for everyone.)

With the CLI instead: `cd proxy && npx wrangler login && npx wrangler deploy && npx wrangler secret put LLM_API_KEY`.

## Deploy: Vercel (free)

1. Get a key (step 1 above).
2. Open https://vercel.com/new, import `DPZSSoul/asvab-coach`, set **Root Directory** to `proxy`, Framework "Other".
3. Add Environment Variable `LLM_API_KEY` = your key. Deploy.
4. Your URL is `https://<project>.vercel.app/api/chat`. Paste that in the app's Settings (step 6 above).
