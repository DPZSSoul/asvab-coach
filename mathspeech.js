/* Spoken answers: letters (with Chrome's usual mishearings), choice values, and spoken math
   ("three fourths", "3/4", "point five", "negative 4", "x equals 4", "two and a half", "$1.50").
   Loaded before app.js. Pure functions, no DOM. */
'use strict';
const MS = (() => {
  const ONES = { zero:0, oh:0, o:0, one:1, won:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12,
    thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19 };
  const TENS = { twenty:20, thirty:30, forty:40, fourty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
  const DEN = { half:2, halves:2, halfs:2, third:3, thirds:3, fourth:4, fourths:4, quarter:4, quarters:4, fifth:5, fifths:5, sixth:6, sixths:6,
    seventh:7, sevenths:7, eighth:8, eighths:8, ninth:9, ninths:9, tenth:10, tenths:10, eleventh:11, elevenths:11, twelfth:12, twelfths:12,
    fifteenth:15, fifteenths:15, sixteenth:16, sixteenths:16, twentieth:20, twentieths:20, hundredth:100, hundredths:100, thousandth:1000, thousandths:1000 };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const fr = (n, d = 1) => { if (d < 0){ n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
  const add = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
  const fromDec = s => { const neg = s.startsWith('-'); s = s.replace(/^-/, ''); const [w, f = ''] = s.split('.'); const d = 10 ** f.length; const v = fr(Number(w || 0) * d + Number(f || 0), d); return neg ? fr(-v.n, v.d) : v; };
  const eq = (a, b) => a && b && a.n * b.d === b.n * a.d;
  const str = v => v.d === 1 ? String(v.n) : `${v.n}/${v.d}`;
  function clean(s){
    return String(s || '').toLowerCase().replace(/[\u2019']/g, '').replace(/[\u2212\u2013\u2014]/g, '-').replace(/(\d),(\d{3})/g, '$1$2')
      .replace(/\$\s*/g, ' dollars_pre ').replace(/%/g, ' percent ').replace(/\s*\/\s*/g, '/').replace(/(\d)\s*-\s*(?=\d)/g, '$1 to ')
      .replace(/([a-z])-([a-z])/g, '$1 $2').replace(/(^|\s)-\s+(?=\d)/g, '$1-').replace(/[^a-z0-9./_ -]/g, ' ').replace(/(^|\s)\.(\d)/g, '$10.$2').replace(/\.(?!\d)/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // turn number words into digits: "twenty five" -> 25, "one hundred twenty" -> 120, "two point five" -> 2.5
  function wordsToDigits(t){
    const w = t.split(' '); const out = [];
    for (let i = 0; i < w.length; i++){
      let x = w[i];
      if (x in ONES || x in TENS || (x === 'a' && (w[i + 1] === 'hundred' || w[i + 1] === 'thousand'))){
        if ((x === 'o' || x === 'oh') && !(i > 0 && /^\d|point/.test(out[out.length - 1] || ''))){ out.push(x); continue; }
        let total = 0, cur = 0, used = 0, j = i;
        while (j < w.length){
          const y = w[j];
          if (y in ONES && !(y === 'o' || y === 'oh')){ if (used && cur % 10 === 0 && cur % 100 !== 0 && ONES[y] < 10 && cur >= 20) cur += ONES[y]; else if (used && cur) break; else cur += ONES[y]; }
          else if (y in TENS){ if (used && cur) { if (cur % 100 === 0 && cur >= 100) cur += TENS[y]; else break; } else cur += TENS[y]; }
          else if (y === 'a' && !used && (w[j + 1] === 'hundred' || w[j + 1] === 'thousand')) cur = 1;
          else if (y === 'hundred' && used){ cur = (cur || 1) * 100; }
          else if (y === 'thousand' && used){ total += (cur || 1) * 1000; cur = 0; }
          else if (y === 'and' && used && cur >= 100 && (w[j + 1] in ONES || w[j + 1] in TENS)) { j++; continue; }
          else break;
          used++; j++;
          if (w[j - 1] in ONES && ONES[w[j - 1]] >= 10 && !(cur % 100 === 0)) { if (!(w[j] === 'hundred' || w[j] === 'thousand')) break; }
        }
        out.push(String(total + cur)); i = j - 1; continue;
      }
      out.push(x);
    }
    // "2 point 5", "point 2 5" -> decimals
    const s = out.join(' ').replace(/(\d+ )?point((?: \d)+)/g, (m, whole, ds) => (whole ? whole.trim() : '0') + '.' + ds.replace(/ /g, ''));
    return s;
  }
  // list of {v, kind} values in spoken text, longest/most specific first
  function values(raw){
    let t = wordsToDigits(clean(raw));
    t = t.replace(/\b(dollars_pre) (-?\d+(?:\.\d+)?)/g, '$2 dollars').replace(/\bdollars_pre\b/g, '');
    t = t.replace(/^(?:um+|uh+|so|ok|okay|well|i think|i say|i guess|its|it is|the answer is|my answer is|answer|that is|thats)\s+/g, '');
    t = t.replace(/^(?:x|ex|eggs|axe|next|acts|backs|it|y|n)\s*(?:=|equals?|equal to|is)\s*/, '').replace(/\b(?:x|ex)\s*(?:=|equals?)\s*/, '');
    const found = [];
    const neg = s => /^(negative|minus|- )/.test(s) || s.startsWith('-');
    const push = (v, kind, u) => found.push({ v, kind, u });
    let m;
    // mixed: 2 and 1/2, 2 and a half, 2 1/2, 2 and three fourths
    const NUM = '-?\\d+(?:\\.\\d+)?';
    const denWords = Object.keys(DEN).join('|');
    const sign = s => (s && /negative|minus/.test(s)) ? -1 : 1;
    const re = new RegExp(`(negative |minus )?(${NUM})?(?: and)? (a |an |${NUM} )?(${denWords})\\b|(negative |minus )?(${NUM})(?: and | )(\\d+)/(\\d+)|(negative |minus )?(${NUM})/(\\d+)|(negative |minus )?(${NUM}) (?:over|out of) (\\d+)|(negative |minus )?(${NUM})( percent| dollars?| cents?)?|(a |an )?(half|quarter|third)\\b`, 'g');
    const s = ' ' + t + ' ';
    while ((m = re.exec(s))){
      if (m[4]){   // [neg][whole][and] [count] denominator-word
        const den = DEN[m[4]]; let cnt = m[3] ? (/^an? $/.test(m[3]) ? 1 : Number(m[3])) : null;
        if (cnt == null && m[2] != null){ cnt = Number(m[2]); m[2] = null; }   // "three fourths": 3 is the count
        if (cnt == null) cnt = 1;
        let v = fr(cnt, den); if (m[2] != null) v = add(fr(Number(m[2])), v);
        if (sign(m[1]) < 0) v = fr(-v.n, v.d); push(v, m[2] != null ? 'mixed' : 'fraction', m[2] != null ? null : [cnt, den]);
      } else if (m[7]){ let v = add(fromDec(m[6]), fr(Number(m[7]), Number(m[8]))); if (sign(m[5]) < 0 || m[6].startsWith('-')) v = fr(-Math.abs(v.n), v.d); push(v, 'mixed'); }
      else if (m[10]){ let v = fr(Number(m[10]) * 1, Number(m[11])); if (m[10].includes('.')) v = fr(Math.round(Number(m[10]) * 1000), Number(m[11]) * 1000); if (sign(m[9]) < 0) v = fr(-v.n, v.d); push(v, 'fraction', [Number(m[10]), Number(m[11])]); }
      else if (m[13]){ let v = fr(Number(m[13]), Number(m[14])); if (sign(m[12]) < 0) v = fr(-v.n, v.d); push(v, 'fraction', [Number(m[13]), Number(m[14])]); }
      else if (m[16] != null){ let v = fromDec(m[16]); if (/^ cents?$/.test(m[17] || '')) v = fr(v.n, v.d * 100); if (sign(m[15]) < 0) v = fr(-v.n, v.d); push(v, /percent/.test(m[17] || '') ? 'percent' : /dollar|cent/.test(m[17] || '') ? 'money' : 'number'); }
      else if (m[19]){ push(fr(1, DEN[m[19]]), 'fraction'); }
    }
    // "12 dollars and 50 cents" -> 12.50
    const money = t.match(/(\d+) dollars? (?:and )?(\d{1,2}) cents?/); if (money) return [{ v: fr(Number(money[1]) * 100 + Number(money[2]), 100), kind:'money' }];
    const dc = t.match(/^(?:a|one|1) dollar (?:and )?(\d{1,2})$/); if (dc) return [{ v: fr(100 + Number(dc[1]), 100), kind:'money' }];
    return found;
  }
  // the one value the person said (null if none or several different ones)
  function value(raw){ const vs = values(raw); if (!vs.length) return null; const first = vs[0].v; return vs.every(x => eq(x.v, first)) || vs.length === 1 ? first : vs[vs.length - 1].v; }
  function said(raw){ const vs = values(raw); if (!vs.length) return null; const pick = vs.length === 1 || vs.every(x => eq(x.v, vs[0].v)) ? vs[0] : vs[vs.length - 1];
    return { v: pick.v, kind: pick.kind, unreduced: !!(pick.u && gcd(pick.u[0], pick.u[1]) > 1) }; }
  function parseValue(text){   // value of a choice string such as "3/4", "$12", "2 1/2 cups", "x = 4"
    return value(text);
  }
  const LETTERS = [
    ['a', 'ay', 'aye', 'eh', 'hey', 'hay', 'ah', 'ahh', 'uh', 'ey', 'alpha', 'alfa', 'al', 'ace', 'hey a'],
    ['b', 'be', 'bee', 'bea', 'bi', 'beat', 'bravo', 'b b', 'bb', 'baby', 'v', 'vee'],
    ['c', 'see', 'sea', 'si', 'cee', 'she', 'seed', 'charlie', 'cc', 'ce', 'z', 'zee'],
    ['d', 'dee', 'de', 'di', 'the', 'thee', 'delta', 'dd', 'dean', 'deet', 'tee', 'g']];
  const ORD = [['first', '1st', 'number one'], ['second', '2nd', 'number two'], ['third', '3rd', 'number three'], ['fourth', '4th', 'last', 'number four', 'last one']];
  const CARD = [['one', 'won', '1'], ['two', 'to', 'too', '2'], ['three', 'tree', '3'], ['four', 'for', 'fore', '4']];
  const FILL = /\b(?:the answer is|my answer is|i think its|i think it is|i think|i say|i pick|i choose|i will go with|ill go with|go with|it is|its|answer|letter|option|choice|choose|pick|number|is|um+|hmm+|please|okay|ok)\b/g;
  function letterIndex(raw, choices){
    let t = clean(raw).replace(/\./g, ' ').replace(/\s+/g, ' ').trim(); if (!t) return null;
    const nch = (choices || []).length || 4;
    const vals = (choices || []).map(c => parseValue(c));
    const choiceHas = n => vals.some(v => v && v.d === 1 && v.n === n);
    const strip = t.replace(FILL, ' ').replace(/\s+/g, ' ').trim() || t;
    // whole thing (or each word) is a letter sound-alike: "hey", "hey hey", "letter b", "answer c"
    const words = strip.split(' ');
    const idxOf = w => { for (let k = 0; k < 4; k++) if (LETTERS[k].includes(w)) return k; return -1; };
    let li = LETTERS.findIndex(l => l.includes(strip));
    if (li < 0 && words.length <= 3){ const ks = words.map(idxOf); if (ks.every(k => k >= 0 && k === ks[0])) li = ks[0];
      else if (/\b(letter|answer|option|choice)\b/.test(t)){ const k = ks.find(k => k >= 0 && k !== 3) ?? ks.find(k => k >= 0); if (k != null) li = k; } }
    if (li >= 0 && li < nch) return li;
    if (/^(yeah|yeah yeah|yah|ya)$/.test(strip) && nch) return 0;
    if (/^(8|eight|ate|hate)$/.test(strip) && !choiceHas(8)) return 0;
    for (let k = 0; k < Math.min(4, nch); k++) if (ORD[k].includes(strip)) return k;
    for (let k = 0; k < Math.min(4, nch); k++) if (CARD[k].includes(strip) && !choiceHas(k + 1)) return k;
    return null;
  }
  // index of the choice whose value the person said (exactly one match)
  function choiceByValue(raw, choices){
    if (!choices) return null; const v = value(raw); if (!v) return null;
    const hits = choices.map((c, i) => [parseValue(c), i]).filter(([cv]) => cv && eq(cv, v)).map(x => x[1]);
    return hits.length === 1 ? hits[0] : null;
  }
  return { clean, wordsToDigits, values, value, said, gcd, parseValue, letterIndex, choiceByValue, eq, fr, str, LETTERS };
})();
if (typeof module !== 'undefined') module.exports = MS;
