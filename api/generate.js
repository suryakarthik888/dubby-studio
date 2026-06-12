// Vercel serverless function: POST /api/generate
// Holds your LLM API key as an environment variable so it never reaches the browser.
//
// Required env vars (set in Vercel project settings):
//   LLM_PROVIDER   one of: gemini | openai | anthropic | groq | openrouter   (default: gemini)
//   LLM_MODEL      optional model id override (sensible default per provider)
//   ...and the key for your provider:
//   GEMINI_API_KEY | OPENAI_API_KEY | ANTHROPIC_API_KEY | GROQ_API_KEY | OPENROUTER_API_KEY

const SYS = `Translate a request about a mascot named Dubby into a JSON animation spec. Output ONLY raw JSON, no prose, no markdown.
Keys (include only what's relevant):
"blink":{"centers":[0-1 floats, REQUIRED if blink is present],"close":int 3-9 small=snappy,"squash":int 4-9}
"look":true
"jump":{"count":1-3,"height":30-110}
"bob":{"amp":8-26,"cycles":1-3}
"sway":{"angle":3-12,"cycles":1-3}
"pulse":{"amount":0.05-0.18,"cycles":1-3}
"flip":{"count":1-2}
"turn3d":{"count":1-2}
Rules: position is jump OR bob. scale is jump OR flip OR pulse (jump wins). blink and look may always be added. excited/happy=jump + quick blink. sleepy=soft slow blink (close 8-9 squash 4). curious=look. Keep it tasteful.`;

const DEFAULT_MODEL = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'openai/gpt-4o-mini',
};

async function callProvider(prompt) {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  const model = process.env.LLM_MODEL || DEFAULT_MODEL[provider];
  const user = 'Request: ' + prompt;

  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYS + '\n\n' + user }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return d.candidates[0].content.parts[0].text;
  }

  if (provider === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 600, system: SYS, messages: [{ role: 'user', content: user }] }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return d.content.filter(b => b.type === 'text').map(b => b.text).join('');
  }

  // OpenAI-compatible: openai, groq, openrouter
  const bases = {
    openai: 'https://api.openai.com/v1',
    groq: 'https://api.groq.com/openai/v1',
    openrouter: 'https://openrouter.ai/api/v1',
  };
  const keys = {
    openai: process.env.OPENAI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };
  if (!bases[provider]) throw new Error('Unknown LLM_PROVIDER: ' + provider);
  const key = keys[provider];
  if (!key) throw new Error(provider.toUpperCase() + '_API_KEY is not set');
  const r = await fetch(bases[provider] + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model, temperature: 0.4,
      messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }],
      ...(provider === 'openai' || provider === 'groq' ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'request failed');
  return d.choices[0].message.content;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const prompt = body.prompt;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      res.status(400).json({ error: 'Provide a "prompt" string under 500 characters.' }); return;
    }
    let text = await callProvider(prompt);
    text = text.replace(/```json|```/g, '').trim();
    const spec = JSON.parse(text);
    res.status(200).json({ spec });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Generation failed' });
  }
}
