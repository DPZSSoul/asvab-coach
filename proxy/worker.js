// ASVAB Coach LLM proxy. Runs as a Cloudflare Worker (export default) or a Vercel Edge Function (api/chat.js).
// The API key lives ONLY in the server-side secret LLM_API_KEY. The client never sends or sees it.
// Env: LLM_API_KEY (secret, required), LLM_API_BASE (default Gemini free tier), LLM_MODEL (default below), LLM_REASONING_EFFORT (optional; 'low' by default on Gemini),
//      ALLOWED_ORIGIN (default https://dpzssoul.github.io), RATE_PER_MIN (default 12), RATE_PER_DAY (default 300).
// Default: Google Gemini free tier (OpenAI-compatible). xAI: https://api.x.ai/v1 + grok-4.20-0309-non-reasoning. OpenAI: https://api.openai.com/v1 + gpt-4o-mini.
const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const MAX_BODY = 60000, MAX_MSGS = 40, MAX_CHARS = 6000;
const MAX_TOKENS = { coach: 900, tutor: 900, breakdown: 600, write: 4000, test: 200 }   // room for thinking tokens on Gemini;

export const AR_COACH = `You are a warm, patient math teacher. You coach ASVAB Arithmetic Reasoning by voice.
Talk like a real person. Be kind and calm, like a favorite teacher.
The student is dyslexic. He studies by voice while walking. Everything you say is read aloud.

What he knows: add, subtract, multiply, and divide. Fractions and algebra are new to him. Teach them gently, from zero.
Arithmetic Reasoning is his number one struggle. Keep the focus there.
If he asks about another topic, answer in one short line. Then steer back to Arithmetic Reasoning.

How to talk:
- Plain, everyday words. Every sentence under twelve words.
- Go slowly. One small step at a time.
- Put each step on its own line, with a blank line between steps.
- No markdown. No symbols like asterisks, slashes, or hash marks. No tables or emoji.
- Spell numbers out in words. Say "twenty dollars", not "$20". Say "ten percent", not "10%".
- Keep each reply short. Two to five sentences is best.

How to teach:
- Always show the simplest, fastest way to do it in your head. No calculator.
- Use friendly round numbers, tens, and easy splits. Example: fifteen times four is ten times four plus five times four.
- For percents, use the tens trick first. Example: twenty dollars is two tens. Ten percent off is two dollars. Twenty minus two is eighteen dollars.
- Ask one question at a time. Give four choices, A, B, C, and D. Spell the numbers out. Then stop and wait.
- When he answers, say right or wrong right away. Give a one line reason.
- If he says "I don't know", never give the answer. Break it into the smallest next step. Ask only that step. Wait for him.
- End every step with a quick check question, like "Does that make sense?" or "What is two plus three?" Then stop and wait.
- Only move on after he shows he understands that step.
- Praise effort, not just right answers.
- If he sounds tired or stuck, make the task smaller. Offer an easier question or a short break.
- Never make up score rules, cutoffs, or test requirements. If he asks, say you are not sure. Tell him to ask his recruiter.`;

const TUTOR_EXTRA = `

He may paste a question he missed. Help him solve that question step by step with the same rules.
If the message includes an answer key "for you only", never reveal it early. Use it only to check his work.`;

const BREAKDOWN = `
Right now he is stuck. He said something like "I don't know" or "I'm lost".
Do not give the answer. Do not solve the problem.
Give only the smallest first step, in one or two short sentences.
Use the easiest no-calculator way, with small round numbers.
End with one quick check question about that step. Then stop and wait.
Stay in this slow, small-step style until he answers a step right.`;

const WRITER = `You write original ASVAB practice questions. You never copy real test items. You return strict JSON only.`;

function cors(origin, allowed){
  return { 'Access-Control-Allow-Origin': origin === allowed ? allowed : 'null', 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
}
const hits = new Map();   // basic per-IP limit, per instance (best effort on serverless)
function limited(ip, perMin, perDay){
  const now = Date.now(); let h = hits.get(ip);
  if (!h || now - h.day > 86400000) h = { day: now, dayN: 0, min: now, minN: 0 };
  if (now - h.min > 60000){ h.min = now; h.minN = 0; }
  h.minN++; h.dayN++; hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.minN > perMin || h.dayN > perDay;
}

export async function handle(request, env = {}){
  const allowed = env.ALLOWED_ORIGIN || 'https://dpzssoul.github.io';
  const origin = request.headers.get('Origin') || '';
  const H = cors(origin, allowed);
  const json = (code, obj) => new Response(JSON.stringify(obj), { status: code, headers: { ...H, 'Content-Type': 'application/json' } });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
  if (origin !== allowed) return json(403, { error: 'Origin not allowed.' });
  const base = (env.LLM_API_BASE || DEFAULT_BASE).replace(/\/+$/, ''), model = env.LLM_MODEL || DEFAULT_MODEL;
  if (request.method === 'GET') return json(200, { proxy: true, configured: !!env.LLM_API_KEY, model });
  if (request.method !== 'POST') return json(405, { error: 'POST only.' });
  if (!env.LLM_API_KEY) return json(503, { error: 'not-configured' });
  const ip = request.headers.get('CF-Connecting-IP') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip, +env.RATE_PER_MIN || 12, +env.RATE_PER_DAY || 300)) return json(429, { error: 'Too many requests. Take a short break.' });
  const raw = await request.text();
  if (!raw || raw.length > MAX_BODY) return json(413, { error: 'Request too large or empty.' });
  let body; try { body = JSON.parse(raw); } catch(e){ return json(400, { error: 'Bad JSON.' }); }
  const mode = Object.hasOwn(MAX_TOKENS, body.mode) ? body.mode : 'coach';
  const msgs = body.messages;
  if (!Array.isArray(msgs) || !msgs.length || msgs.length > MAX_MSGS) return json(400, { error: 'messages must be a list of 1 to 40.' });
  const clean = [];
  for (const m of msgs){
    if (!m || typeof m.content !== 'string' || !['user', 'assistant'].includes(m.role)) continue;   // client system prompts are dropped
    clean.push({ role: m.role, content: m.content.slice(0, MAX_CHARS) });
  }
  if (!clean.length) return json(400, { error: 'No user messages.' });
  const system = mode === 'write' ? WRITER : mode === 'test' ? 'Reply with one word.' : AR_COACH + TUTOR_EXTRA + (mode === 'breakdown' ? BREAKDOWN : '');
  const out = { model, messages: [{ role: 'system', content: system }, ...clean],
    max_tokens: Math.min(Math.max(1, parseInt(body.max_tokens) || MAX_TOKENS[mode]), MAX_TOKENS[mode]),
    temperature: Math.min(Math.max(0, Number(body.temperature) || 0.5), 1) };
  const effort = env.LLM_REASONING_EFFORT || (/googleapis/.test(base) ? 'low' : '');
  if (effort && effort !== 'off') out.reasoning_effort = effort;
  if (mode === 'write' && body.json) out.response_format = { type: 'json_object' };
  try {
    const r = await fetch(base + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.LLM_API_KEY }, body: JSON.stringify(out) });
    const j = await r.json().catch(() => null);
    if (!r.ok) return json(502, { error: 'Upstream error ' + r.status + '.' });
    const content = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    return json(200, { choices: [{ message: { role: 'assistant', content: content || '' } }] });
  } catch(e){ return json(502, { error: 'Could not reach the AI service.' }); }
}
export default { fetch: (request, env) => handle(request, env) };
