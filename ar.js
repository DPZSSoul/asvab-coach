/* Arithmetic Reasoning extras (v2.6.0):
   1. History of every answered AR problem (localStorage key "arHistory"), with a filter for wrong ones and retry.
   2. Session recap: short spoken lines for each miss (what he said, the right answer, one short reason).
   3. Built-in step-by-step help (breakdown mode): micro-steps per question type. Used when he says he is stuck,
      and when the AI coach is not set up or fails. A step never says the final answer. He does each piece. */

/* ---------------- history ---------------- */
const AR_HIST_MAX = 1000;
function arHist(){ return Store.get('arHistory', []); }
function arIsAR(q){ return !!q && (q.section === 'AR' || q.section === 'LADDER' || /^lad-/.test(q.topic || '')); }
function arSlim(q){ const o = {}; ['id','section','topic','stem','say','choices','answer','steps','explanation','mode','value','kind','sayAnswer','form','level','type','difficulty'].forEach(k => { if (q[k] != null) o[k] = q[k]; }); return o; }
function arAnswerText(q){ return q.mode === 'say' && q.sayAnswer ? q.sayAnswer : (q.choices || [])[q.answer]; }
// log one answered AR problem; guess is a choice index (or null / -1), said is what he said out loud (optional)
function arLog(q, guess, ok, mode, said){
  if (!arIsAR(q)) return;
  const h = arHist(); const choice = guess != null && guess >= 0 ? (q.choices || [])[guess] : null;
  h.unshift({ id:'h' + Date.now() + Math.floor(Math.random() * 1000), date:new Date().toISOString(), mode: mode || '', ok: !!ok,
    question: q.say || q.stem, choices: q.choices || [], yours: choice != null ? choice : (said ? said : 'No answer'), right: arAnswerText(q), q: arSlim(q) });
  Store.set('arHistory', h.slice(0, AR_HIST_MAX));
}
function arWrongUnique(){ const seen = new Set(); return arHist().filter(e => !e.ok && e.q && !seen.has(e.q.id) && seen.add(e.q.id)); }
// a retry set: the questions he missed, asked again in normal practice
function arRetry(list){
  const qs = []; const ids = new Set(); for (const e of list){ if (e.q && !ids.has(e.q.id)){ ids.add(e.q.id); qs.push(e.q); } }
  if (!qs.length){ toast('Nothing to retry.'); return; }
  cleanup(); S = { sec:'AR', qs: qs.slice(0, 15), i:0, results:[], hf: HF.on, timerOn:false, per: CAT.AR[1]*60/CAT.AR[0], mode:'retry', byEar:true };
  renderQ();
}
SCREENS.history = (filter) => {
  const wrongOnly = filter === 'wrong'; const all = arHist(); const list = wrongOnly ? all.filter(e => !e.ok) : all;
  const nWrong = all.filter(e => !e.ok).length; const nRight = all.length - nWrong;
  app().innerHTML = `<h1>History</h1>
  <p>Every math problem you answered. Newest first.</p>
  <div class="card"><p class="big-word">${all.length} answered. ${nRight} right. ${nWrong} wrong.</p>
    <div class="row"><button class="small ${wrongOnly ? '' : 'primary'}" id="hAll">All</button><button class="small ${wrongOnly ? 'primary' : ''}" id="hWrong">Wrong only</button>
    ${nWrong ? `<button class="primary" id="hRetry">Retry my wrong ones</button>` : ''}</div></div>
  ${list.length ? '' : `<p>${wrongOnly ? 'No wrong answers. Nice work.' : 'Nothing yet. Answer a math question and it shows up here.'}</p>`}
  <div id="hList">${list.slice(0, 200).map(e => {
    const s = speakable(`${e.question} You said ${dot(e.yours)} The right answer is ${dot(e.right)}`);
    return `<div class="card hist-item ${e.ok ? 'feedback ok' : 'feedback bad'}"><div class="row" style="justify-content:space-between;margin:0"><span class="pill">${e.ok ? 'Right' : 'Wrong'} | ${new Date(e.date).toLocaleDateString()}</span>${sayBtn('#' + s.id)}</div>
      <div class="hidden">${s.html}</div><div class="stem">${esc(e.question)}</div>
      ${e.choices && e.choices.length ? `<p>Choices: ${e.choices.map((c, i) => `${LET[i]}. ${esc(c)}`).join(' &nbsp; ')}</p>` : ''}
      <p>You said: <span class="${e.ok ? 'ok-text' : 'bad-text'}">${esc(e.yours)}</span></p>${e.ok ? '' : `<p>Right answer: <span class="ok-text">${esc(e.right)}</span></p>`}
      ${e.ok ? '' : `<div class="row" style="margin:0"><button class="small" data-hr="${esc(e.id)}">Retry this one</button></div>`}</div>`; }).join('')}</div>
  ${all.length ? `<div class="row"><button class="small" id="hClear">Clear history</button></div>` : ''}`;
  $('#hAll').onclick = () => go('history'); $('#hWrong').onclick = () => go('history', 'wrong');
  const r = $('#hRetry'); if (r) r.onclick = () => arRetry(arWrongUnique());
  $$('[data-hr]').forEach(b => b.onclick = () => { const e = arHist().find(x => x.id === b.dataset.hr); if (e) arRetry([e]); });
  const c = $('#hClear'); if (c) c.onclick = () => { if (confirm('Clear all history? This cannot be undone.')){ Store.set('arHistory', []); go('history'); } };
};

/* ---------------- recap ---------------- */
const AR_REASON = {
  'ar-money':'Multiply each price, then add.', 'ar-rate':'Distance equals speed times time.', 'ar-percent':'Find 10 percent first, then build up.',
  'ar-ratio':'Add the parts, then find one part.', 'ar-average':'Add them all, then divide by how many.', 'ar-units':'Change units first, then do the math.',
  'ar-fractions':'Divide by the bottom, then times the top.', 'ar-geometry':'Use the shape rule for area or perimeter.', 'ar-interest':'Interest is money times rate times years.',
  'ar-number':'Turn the words into a math sentence.', 'ar-work':'Add how much each does in one hour.' };
function arFamily(q){
  if (!q) return 'gen'; const t = q.topic || '';
  if (AR_REASON[t]) return t.slice(3);
  const n = q.level || +(t.match(/^lad-(\d+)/) || [])[1] || 0;
  if (n >= 1 && n <= 3) return 'basic'; if (n === 4 || n === 5 || n === 6 || n === 7 || n === 8) return 'fracname';
  if (n === 9 || n === 10) return 'fracadd'; if (n === 11 || n === 12) return 'fracmul'; if (n === 13) return 'mixed';
  if (n === 14 || n === 15) return 'fractions'; if (n === 16) return 'money'; if (n === 17) return 'percent'; if (n === 18) return 'ratio';
  if (n >= 19 && n <= 22) return 'algebra'; if (n === 23) return 'rate'; if (n === 24) return 'average'; if (n === 25) return 'interest'; if (n === 26) return 'geometry';
  return 'gen';
}
const FAM_REASON = { basic:'Break numbers into tens and ones.', fracname:'Bottom is pieces. Top is how many you take.', fracadd:'Make the bottoms match, then add the tops.',
  fracmul:'Tops times tops, bottoms times bottoms.', mixed:'Change to a top-heavy fraction first.', algebra:'Undo each step to get x alone.', gen:'Go one small step at a time.' };
function arReason(q){
  const ex = String((q && (q.explanation || (q.steps || [])[0])) || '').split(/(?<=\.)\s/)[0].trim();
  if (ex && ex.split(/\s+/).length <= 11 && !/answer/i.test(ex)) return dot(ex);
  return AR_REASON[(q && q.topic) || ''] || FAM_REASON[arFamily(q)] || FAM_REASON.gen;
}
const shortTxt = (s, n = 8) => { const w = String(s == null ? '' : s).replace(/\s+/g, ' ').trim().split(' '); return w.length > n ? w.slice(0, n).join(' ') + '...' : w.join(' '); };
// items: [{ q, ok, yours }]  ->  short lines, each under 12 words
function arRecapLines(items){
  const miss = items.filter(x => !x.ok);
  if (!items.length) return ['No questions answered.'];
  if (!miss.length) return [`You got all ${items.length} right.`, 'Nice work.'];
  const lines = [`You missed ${miss.length}. Here is what to fix.`];
  miss.slice(0, 6).forEach((m, k) => {
    lines.push(`Number ${k + 1}. You said ${shortTxt(m.yours || 'nothing', 6)}.`.replace(/\.\.\.\./, '...'));
    lines.push(`The right answer is ${shortTxt(m.right, 6)}.`.replace(/\.\.\.\./, '...'));
    lines.push(arReason(m.q));
  });
  if (miss.length > 6) lines.push(`${miss.length - 6} more are in your History.`);
  lines.push('Say history to retry them.');
  return lines;
}
function arRecapHTML(items){
  const lines = arRecapLines(items); const s = speakable(lines.join(' '));
  return `<div class="card" id="recapCard"><div class="row" style="justify-content:space-between;margin:0"><h2 style="margin:0">Recap</h2>${sayBtn('#' + s.id)}</div>
    <div class="hidden" id="recap">${s.html}</div><ul class="recap">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    ${items.some(x => !x.ok) ? `<div class="row"><button class="primary" id="recapRetry">Retry the ones I missed</button><button class="small" onclick="go('history','wrong')">History</button></div>` : ''}</div>`;
}
function arRecapWire(items){ const b = $('#recapRetry'); if (b) b.onclick = () => arRetry(items.filter(x => !x.ok).map(x => ({ q: x.q }))); }

/* ---------------- built-in micro-step hints (breakdown mode) ---------------- */
const nfmt = v => { const r = Math.round(v * 100) / 100; return String(r); };
function arNums(stem){ return (String(stem).replace(/,(?=\d{3})/g, '').match(/\d+(\.\d+)?/g) || []).map(Number); }
function arSteps(q){
  const stem = String(q.stem || q.say || ''); const fam = arFamily(q); const nums = arNums(stem); const S = [];
  const add = (say, expect, nudge) => S.push({ say, expect, nudge });
  const pm = stem.match(/(\d+(?:\.\d+)?)\s*(%|percent)/i);
  if ((fam === 'percent' || fam === 'interest') && pm){
    const pct = +pm[1]; const money = stem.replace(/,(?=\d{3})/g, '').match(/\$\s?(\d+(?:\.\d+)?)/);
    const base = money ? +money[1] : nums.find(n => n !== pct && n >= 10);
    if (/what percent/i.test(stem)){
      add('Find the part and the whole. The whole is the starting amount.');
      add('Put the part on top and the whole on the bottom.');
      add('Now find 10 percent of the whole. Use the tens trick.');
      add('How many of those 10 percent pieces fit in the part? Times that by 10.');
    } else if (base && base % 10 === 0 && pct % 5 === 0 && pct <= 100){
      const tens = base / 10;
      add(`Use the tens trick. Think of ${nfmt(base)} as tens. How many tens are in ${nfmt(base)}?`, tens, `Drop the last zero of ${nfmt(base)}. What is left?`);
      add(`10 percent of one ten is 1. So 10 percent is 1 for each ten. What is 10 percent of ${nfmt(base)}?`, tens, 'One for each ten. Same number as the tens.');
      if (pct === 5) add('5 percent is half of 10 percent. What is half of your last number?', tens / 2, 'Cut your 10 percent number in half.');
      else if (pct % 10 === 0 && pct !== 10) add(`You need ${pct} percent. That is ${pct / 10} groups of 10 percent. Times your 10 percent by ${pct / 10}. What do you get?`, tens * pct / 10, `Add your 10 percent number ${pct / 10} times.`);
      else if (pct % 10 === 5){ add(`You need ${pct} percent. First find ${pct - 5} percent. What is it?`, tens * (pct - 5) / 10, `Times your 10 percent by ${(pct - 5) / 10}.`);
        add('Now find 5 percent. That is half of 10 percent. What is it?', tens / 2, 'Cut your 10 percent number in half.');
        add(`Add those two. That makes ${pct} percent. What do you get?`, base * pct / 100, 'Add the two numbers you just found.'); }
      if (fam === 'interest') add('That is the interest for one year. How many years? Times by that.');
      else add('Read the last line again. Does it ask for the part, or what is left?');
      add('If it asks what is left, or the sale price, subtract from the start. If it adds tax or a raise, add it.');
    } else {
      add('Percent means out of 100. 10 percent is one tenth.');
      add(`Find 10 percent of ${base ? nfmt(base) : 'the amount'}. Move the decimal point one place left.`, base ? base / 10 : undefined, 'Divide by 10.');
      add(`Build up to ${pct} percent from 10 percent. Two tens make 20. Half makes 5.`);
      add('Read the last line. Does it ask for the part, the new total, or what is left?');
    }
    return S;
  }
  switch (fam){
    case 'money': add('List each thing bought and how many.'); add('Multiply the price by how many, for the first item.'); add('Do the same for the next item.'); add('Add the amounts together.'); add('Does it ask for change? Then subtract from what was paid.'); break;
    case 'rate': add('Find the speed. Find the time. Which one is missing?'); add('Distance equals speed times time.');
      if (nums.length >= 2) add(`Try it. What is ${nfmt(nums[0])} times ${nfmt(nums[1])}? Or does it need a divide?`); add('To find time, divide distance by speed. To find speed, divide distance by time.'); break;
    case 'ratio': add('Write the ratio, like 3 to 2. Those are parts.'); if (stem.match(/(\d+)\s*(to|:)\s*(\d+)/)){ const r = stem.match(/(\d+)\s*(to|:)\s*(\d+)/); add(`How many parts in all? ${r[1]} plus ${r[3]}.`, +r[1] + +r[3], 'Add the two ratio numbers.'); }
      add('Divide the total by the number of parts. That is one part.'); add('Times one part by the parts you need.'); break;
    case 'average': if (nums.length >= 2 && nums.length <= 8 && /average|mean/i.test(stem)){ add(`Add all the numbers. What is the sum?`, nums.reduce((a, b) => a + b, 0), 'Add them two at a time.'); add('How many numbers are there?', nums.length, 'Count them on your fingers.'); }
      else { add('Add all the numbers together.'); add('Count how many numbers there are.'); } add('Divide the sum by how many. That is the average.'); break;
    case 'units': add('What unit do you have? What unit do you need?'); add('How many small units make one big one? Like 12 inches in a foot.'); add('Going to a smaller unit? Multiply. Going to a bigger unit? Divide.'); add('Now do the math with the new units.'); break;
    case 'fractions': { const f = stem.match(/(\d+)\s*\/\s*(\d+)\s*(of)?\s*(\$?\s*(\d+(\.\d+)?))?/);
      add('The bottom number is how many equal pieces. The top is how many you take.');
      if (f && f[5]){ const N = +f[5], b = +f[2], a = +f[1]; add(`Split ${nfmt(N)} into ${b} equal pieces. What is one piece?`, N / b, `Divide ${nfmt(N)} by ${b}.`); if (a !== 1) add(`Now take ${a} of those pieces. What do you get?`, N / b * a, `Times your one piece by ${a}.`); }
      else { add('To find a fraction of a number, divide by the bottom first.'); add('Then times by the top.'); }
      add('Read the last line. Does it ask for that part, or what is left?'); break; }
    case 'geometry': add('Picture the shape. Is it a rectangle, square, triangle, or circle?'); add('Does it ask for the edge around, or the space inside?'); add('Around is perimeter. Add all the sides.'); add('Inside is area. For a rectangle, length times width.'); break;
    case 'interest': add('Interest is the money, times the rate, times the years.'); add('Find 10 percent of the money first. Then build up to the rate.'); add('That is one year. Times by the number of years.'); break;
    case 'work': add('How much of the job does each one do in one hour?'); add('If it takes 3 hours, that is one third of the job each hour.'); add('Add the two parts together.'); add('Flip that fraction to get the hours together.'); break;
    case 'number': add('Read the last line. What number does it ask for?'); add('Turn each fact into a small math sentence.'); add('Do one sentence at a time.'); break;
    case 'basic': if (nums.length >= 2){ const [a, b] = nums; const tens = Math.floor(b / 10) * 10, ones = b % 10;
        if (/plus|\+|add/.test(stem) && b >= 10 && ones) { add(`Split ${b} into ${tens} and ${ones}.`); add(`What is ${a} plus ${tens}?`, a + tens, `Count up by tens from ${a}.`); add(`Now add the ${ones}. What do you get?`); }
        else if (/minus|-|subtract/.test(stem) && b >= 10 && ones){ add(`Split ${b} into ${tens} and ${ones}.`); add(`What is ${a} minus ${tens}?`, a - tens, `Count down by tens from ${a}.`); add(`Now take away the ${ones}. What do you get?`); }
        else { add('Say the two numbers. What do you do with them?'); add('Break the bigger number into tens and ones.'); add('Do the tens first. Then the ones.'); } }
      else { add('Break the numbers into tens and ones.'); add('Do the tens first. Then the ones.'); } break;
    case 'fracname': add('The bottom number tells how many equal pieces.'); add('The top number tells how many pieces you have.'); add('To compare or simplify, find a number that divides top and bottom.'); add('Divide both by the same number.'); break;
    case 'fracadd': add('Look at the bottoms. Are they the same?'); add('If not, change them so they match. Times top and bottom by the same number.'); add('Add the tops. Keep the bottom.'); add('Can you make it simpler? Divide top and bottom by the same number.'); break;
    case 'fracmul': if (/divid|÷/.test(stem)) add('To divide by a fraction, flip the second one. Then multiply.');
      add('Multiply the tops together.'); add('Multiply the bottoms together.'); add('Can you make it simpler? Divide top and bottom by the same number.'); break;
    case 'mixed': add('A mixed number is a whole plus a fraction.'); add('Whole times bottom, then add the top. That is the new top.'); add('Keep the same bottom.'); add('Now do the math with these fractions.'); break;
    case 'algebra': { const m = stem.match(/(\d*)\s*x\s*([+-])\s*(\d+)\s*=\s*(\d+)/); 
      add('The goal is to get x alone on one side.');
      if (m){ const c = +m[3], r = +m[4]; const pl = m[2] === '+'; add(`First undo the ${pl ? 'plus' : 'minus'} ${c}. ${pl ? `What is ${r} minus ${c}?` : `What is ${r} plus ${c}?`}`, pl ? r - c : r + c, pl ? `Take ${c} away from ${r}.` : `Add ${c} to ${r}.`);
        if (m[1] && m[1] !== '1') add(`Now undo the times ${m[1]}. Divide your number by ${m[1]}. What do you get?`); }
      else { add('Undo plus with minus. Undo minus with plus.'); add('Undo times with divide. Do the same to both sides.'); }
      add('Check it. Put your number back in for x.'); break; }
    default: add('Read the last line. What does it ask for?'); add('Pick out the numbers you need.'); add('Do one small step. Then the next.');
  }
  return S;
}
// the number he said ("two", "2", "two fifty", "a half") as a plain number, or null
function arSaidNum(raw){
  try { const s = typeof MS !== 'undefined' && MS.said(raw); if (s && s.v && s.v.d) return s.v.n / s.v.d; } catch (e){}
  const m = String(raw || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null;
}
let BD = null;   // breakdown state: { q, steps, k, tries, back, box }
function startBreakdown(q, back){
  if (!q) return false;
  const host = $('#hintBox') || $('#tchat'); if (!host) return false;
  BD = { q, steps: arSteps(q), k:0, tries:0, back };
  let box = $('#bdBox'); if (!box){ box = document.createElement('div'); box.id = 'bdBox'; host.insertAdjacentElement(host.id === 'tchat' ? 'afterend' : 'beforeend', box); }
  box.innerHTML = `<div class="card"><h2 style="margin-top:0">Step by step</h2><p>Let's go slow. One small step at a time. You do each piece.</p><ol class="steps" id="bdList"></ol>
    <div class="row" id="bdCtl"><input type="text" id="bdIn" aria-label="Your answer to this step" placeholder="Your number" style="max-width:220px"><button class="small" id="bdCheck">Check</button><button class="small" id="bdNext">Next step</button><button class="small" id="bdDone">Back to the question</button></div><div id="bdMsg"></div></div>`;
  $('#bdCheck').onclick = () => { const v = $('#bdIn').value.trim(); if (v) bdReply(v); };
  $('#bdIn').onkeydown = e => { if (e.key === 'Enter') $('#bdCheck').click(); };
  $('#bdNext').onclick = () => bdAdvance('');
  $('#bdDone').onclick = () => bdExit();
  bdShow(true);
  return true;
}
function bdLine(text){ const s = speakable(text); const m = $('#bdMsg'); if (m) m.innerHTML = `<p class="big-word">${s.html}</p>`; return text; }
async function bdSpeak(text){ if (HF.on) await HF.say(text); else await Speech.say(text); }
function bdShow(first){
  if (!BD) return; const st = BD.steps[BD.k]; BD.tries = 0;
  const li = document.createElement('li'); const s = speakable(st.say); li.innerHTML = `<div class="row" style="align-items:flex-start;margin:0"><div style="flex:1">${s.html}</div>${sayBtn('#' + s.id)}</div>`; $('#bdList').appendChild(li);
  $('#bdIn').value = ''; $('#bdIn').classList.toggle('hidden', st.expect == null); $('#bdCheck').classList.toggle('hidden', st.expect == null); bdLine('');
  li.scrollIntoView({ behavior:'smooth', block:'nearest' });
  const tail = st.expect != null ? (HF.on ? 'Say your number.' : '') : (HF.on ? 'Say OK when you are ready.' : '');
  const text = (first ? "Let's go slow. One small step at a time. " : '') + `Step ${BD.k + 1}. ${st.say} ${tail}`;
  if (HF.on){ HF.enter('breakdown'); HF.run(async () => { await Speech.say(text); }); } else Speech.say(text);
}
function bdAdvance(prefix){
  if (!BD) return; BD.k++;
  if (BD.k >= BD.steps.length){ const msg = (prefix ? prefix + ' ' : '') + 'That is all the steps. Now you try the whole problem. Pick your answer.';
    bdLine(msg); const back = BD.back; BD = null; const c = $('#bdCtl'); if (c) c.classList.add('hidden');
    if (HF.on){ HF.ctxName = back; HF.ctx = VCTX[back] || null; HF.arg = undefined; HF.say(msg); } else Speech.say(msg);
    return; }
  if (prefix){ bdLine(prefix); if (HF.on) HF.say(prefix).then(() => bdShow()); else Speech.say(prefix).then(() => bdShow()); }
  else bdShow();
}
// his reply to a step: check it when the step has a number, never say the number
function bdReply(raw){
  if (!BD) return; const st = BD.steps[BD.k];
  if (st.expect == null){ bdAdvance('OK.'); return; }
  if (isStuck(raw)){ BD.tries++; const n = st.nudge || 'Take your time. Do just this one piece.'; bdLine(n); bdSpeak(`Smaller step. ${n}`); return; }
  const v = arSaidNum(raw);
  if (v == null){ bdLine('Say a number.'); bdSpeak('Say a number for this step. Or say I am stuck.'); return; }
  if (Math.abs(v - st.expect) < 1e-6){ bdAdvance('Yes. Good.'); return; }
  BD.tries++;
  if (BD.tries >= 3){ bdAdvance("That's OK. Let's keep going."); return; }
  const n = BD.tries === 1 ? 'Not quite. Try again.' : `Not quite. ${st.nudge || 'Go slow.'}`; bdLine(n); bdSpeak(n);
}
function bdExit(){ if (!BD) return; const back = BD.back; BD = null; const b = $('#bdBox'); if (b) b.remove(); if (HF.on) HF.enter(back); }
// called when he says he is stuck on a problem screen; returns true if handled
function arStuck(where){
  if (where === 'question' && S && !S.answered){ const q = S.qs[S.i];
    if (arIsAR(q)) return startBreakdown(q, 'question');
    const h = showHint(q); if (HF.on) HF.say(h || 'No more hints. Give it your best try.'); return true; }
  if (where === 'ladq' && LR && !LR.answered) return startBreakdown(LR.qs[LR.i], 'ladq');
  if (where === 'banktutor' && T && !T.solved){ if (arIsAR(T.q)) return startBreakdown(T.q, 'banktutor'); const b = $('#tIdk'); if (b){ b.click(); return true; } }
  return false;
}
const STUCK_CTX = ['question', 'ladq', 'banktutor', 'breakdown', 'chat'];

/* ---------------- voice contexts ---------------- */
VCTX.breakdown = {
  priority: true,
  choices: () => null,
  help: 'Say your number for this step. Say OK or next for the next step. Say I am stuck for a smaller step. Say back to the question to answer it.',
  async intro(){},
  async handle(t, all, raw){
    if (!BD) return false;
    if (anyOf(t, ['back to the question', 'skip the steps', 'stop the steps', 'let me answer', 'i got it now', 'i know it now'])){ bdExit(); if (HF.on) HF.say('OK. Your answer?'); return true; }
    const m = t.match(/^(?:my answer is|the answer is|final answer|i pick|i choose|answer)\s+(.+)$/);
    if (m){ const back = BD.back; bdExit(); const c = VCTX[back]; const rest = normalize(m[1]); if (c && c.handle){ const ok = await c.handle(rest, [rest], m[1], HF.arg); if (ok) return true; } return false; }
    if (/^(repeat|again|say that again|say it again)\b/.test(t)){ const st = BD.steps[BD.k]; await HF.say(st.say); return true; }
    if (/^(help|what can i say)$/.test(t)) return false;
    const st = BD.steps[BD.k];
    if (st.expect == null){ if (isStuck(raw || t)){ await HF.say('That is OK. Just think about it. Say OK when you are ready.'); return true; } bdAdvance('OK.'); return true; }
    bdReply(raw || t); return true;
  },
  async onMiss(){ await HF.say('Say your number, or say I am stuck.'); },
};
VCTX.history = {
  help: 'Say wrong ones to see only the wrong ones. Say retry to try the wrong ones again. Say all to see everything. Say read them to hear the list.',
  async intro(alive, f){ const all = arHist(); const w = all.filter(e => !e.ok).length; await Speech.say(`History. ${all.length} answered. ${w} wrong.`); if (alive()) await Speech.say(w ? 'Say retry to try the wrong ones again. Or say read them.' : 'Say home, or math ladder.'); },
  async handle(t, all, raw, f){
    if (anyOf(t, ['retry', 'retry them', 'try again', 'retry the wrong ones', 'try them again', 'redo'])){ arRetry(arWrongUnique()); return true; }
    if (anyOf(t, ['wrong ones', 'wrong only', 'only wrong', 'show wrong', 'my wrong ones', 'misses'])){ go('history', 'wrong'); return true; }
    if (/^(all|show all|everything)$/.test(t)){ go('history'); return true; }
    if (anyOf(t, ['read them', 'read the list', 'read it', 'read'])){ HF.run(async alive => { const list = arHist().filter(e => f !== 'wrong' || !e.ok).slice(0, 5);
      for (const e of list){ if (!alive()) return; await Speech.say(`${e.ok ? 'Right' : 'Wrong'}. ${e.question} You said ${dot(e.yours)} The answer is ${dot(e.right)}`); } if (alive()) await Speech.say('Say retry, or home.'); }); return true; }
    return false;
  },
};
// spoken numbers ("three fourths") work for retried ladder questions in normal practice too
(function(){
  const qc = VCTX.question; const orig = qc.handle;
  qc.handle = async function(t, all, raw, arg){
    if (S && !S.answered){ const q = S.qs[S.i];
      if (q && q.mode === 'say' && q.value != null){ const [ka, kb = '1'] = String(q.value).split('/');
        for (const x of [raw].concat(all)){ const v = arSaidNum(x); if (v == null) continue;
          if (Math.abs(v - (+ka / +kb)) < 1e-9){ answer(q.answer); return true; }
          const hit = q.choices.findIndex(c => { const cv = arSaidNum(c); return cv != null && Math.abs(cv - v) < 1e-9; }); if (hit >= 0){ answer(hit); return true; } } } }
    return orig.call(this, t, all, raw, arg);
  };
  const dn = VCTX.done; dn.intro = async function(alive, info){ await sayEl('#setSum'); if (!alive()) return; if ($('#recap')){ await sayEl('#recap'); if (!alive()) return; } await Speech.say('Say practice again, retry, history, or home.'); };
  const dh = dn.handle; dn.handle = async function(t, all, raw, info){ if (anyOf(t, ['retry', 'retry them', 'retry the ones i missed', 'redo'])){ const b = $('#recapRetry'); if (b){ b.click(); return true; } } return dh.call(this, t, all, raw, info); };
  const ld = VCTX.laddone; const li = ld.intro; ld.intro = async function(alive, info){ await Speech.say(info.msg); if (!alive()) return; if ($('#recap')){ await sayEl('#recap'); if (!alive()) return; }
    await Speech.say(info.finished ? 'Say real practice to start the real Arithmetic Reasoning questions, or home.' : `Say start for level ${info.level}, lesson, retry, or home.`); };
  const lh = ld.handle; ld.handle = async function(t, all, raw, info){ if (anyOf(t, ['retry', 'retry them', 'retry the ones i missed', 'redo'])){ const b = $('#recapRetry'); if (b){ b.click(); return true; } } return lh.call(this, t, all, raw, info); };
})();
boot();
if (typeof hfRestore === 'function') hfRestore();
