// ===== ДВИЖОК ПРАВИЛ =====
const HEAD = 24;
const oppPt = p => (p + 11) % 24 + 1;
const startPos = () => { const a = new Array(25).fill(0); a[24] = 15; return a; };
const key = m => String.fromCharCode.apply(null, m);
function pips(m) { let s = 0; for (let p = 1; p <= 24; p++) s += p * m[p]; return s; }
function allHome(m) { for (let p = 7; p <= 24; p++) if (m[p]) return false; return true; }
function applyMove(m, fr, to) { const n = m.slice(); n[fr]--; n[to]++; return n; }

// Путь соперника в нумерации ходящего: 12, 11, ..., 1, 24, 23, ..., 13.
// Дальше забора с нижним пунктом low лежат: при low >= 13 пункты 13..low-1,
// при low <= 12 пункты 1..low-1 и 13..24.
function oppAheadOf(opp, low) {
  if (low >= 13) { for (let p = 13; p < low; p++) if (opp[oppPt(p)] > 0) return true; return false; }
  for (let p = 1; p < low; p++) if (opp[oppPt(p)] > 0) return true;
  for (let p = 13; p <= 24; p++) if (opp[oppPt(p)] > 0) return true;
  return false;
}
function formsBlock(m, opp, fr, to) {
  if (m[to] > 0) return false;
  const n = m.slice(); n[fr]--; n[to]++;
  for (let low = Math.max(1, to - 5); low <= Math.min(to, 19); low++) {
    let ok = true;
    for (let p = low; p < low + 6; p++) if (!n[p]) { ok = false; break; }
    if (ok && !oppAheadOf(opp, low)) return true;
  }
  return false;
}

function singleMoves(m, opp, d, headOk) {
  const res = [];
  const home = allHome(m);
  for (let fr = 24; fr >= 1; fr--) {
    if (!m[fr]) continue;
    if (fr === HEAD && !headOk) continue;
    const to = fr - d;
    if (to >= 1) {
      if (opp[oppPt(to)] > 0) continue;
      if (formsBlock(m, opp, fr, to)) continue;
      res.push([fr, to]);
    } else {
      if (!home) continue;
      let ok = (to === 0);
      if (!ok) { ok = true; for (let p = fr + 1; p <= 6; p++) if (m[p]) { ok = false; break; } }
      if (ok) res.push([fr, 0]);
    }
  }
  return res;
}

function generateTurns(me, opp, dice, first) {
  const a = dice[0], b = dice[1];
  let orders, headLimit;
  if (a === b) { orders = [[a, a, a, a]]; headLimit = (first && (a === 3 || a === 4 || a === 6)) ? 2 : 1; }
  else { orders = [[a, b], [b, a]]; headLimit = 1; }
  const terminals = new Map();
  const seen = new Set();
  function rec(cur, oi, i, head, seq) {
    const order = orders[oi];
    const k = key(cur) + '|' + oi + '|' + i + '|' + head;
    if (seen.has(k)) return;
    seen.add(k);
    if (i < order.length) {
      const mv = singleMoves(cur, opp, order[i], head < headLimit);
      if (mv.length) {
        for (const [fr, to] of mv) rec(applyMove(cur, fr, to), oi, i + 1, head + (fr === HEAD ? 1 : 0), seq.concat([[fr, to, order[i]]]));
        return;
      }
    }
    const kk = key(cur);
    const prev = terminals.get(kk);
    if (!prev || seq.length > prev.seq.length) terminals.set(kk, { pos: cur, seq });
  }
  for (let oi = 0; oi < orders.length; oi++) rec(me, oi, 0, 0, []);
  let maxlen = 0;
  for (const v of terminals.values()) maxlen = Math.max(maxlen, v.seq.length);
  if (maxlen === 0) return { map: new Map(), maxlen: 0 };
  const res = new Map();
  for (const [k, v] of terminals) if (v.seq.length === maxlen) res.set(k, v);
  if (maxlen === 1 && a !== b) {
    const big = Math.max(a, b);
    const bigger = new Map();
    for (const [k, v] of res) if (v.seq[0][2] === big) bigger.set(k, v);
    if (bigger.size) return { map: bigger, maxlen };
  }
  return { map: res, maxlen };
}

// Пошаговый ввод хода человеком
function newTurn(me, opp, dice, first) {
  const g = generateTurns(me, opp, dice, first);
  const a = dice[0], b = dice[1];
  const init = a === b ? [a, a, a, a] : [a, b];
  const headLimit = (a === b && first && (a === 3 || a === 4 || a === 6)) ? 2 : 1;
  return { opp, F: g.map, maxlen: g.maxlen, headLimit, init, cur: me.slice(), left: init.slice(), k: 0, head: 0, hist: [], seq: [], memo: new Map() };
}
function without(arr, i) { return arr.slice(0, i).concat(arr.slice(i + 1)); }
function playable(T, cur, left, k, head) {
  if (k === T.maxlen) return T.F.has(key(cur));
  const mk = key(cur) + '|' + left.join('') + '|' + k + '|' + head;
  if (T.memo.has(mk)) return T.memo.get(mk);
  let ok = false;
  const tried = new Set();
  for (let i = 0; i < left.length && !ok; i++) {
    const d = left[i];
    if (tried.has(d)) continue;
    tried.add(d);
    const rest = without(left, i);
    for (const [fr, to] of singleMoves(cur, T.opp, d, head < T.headLimit)) {
      if (playable(T, applyMove(cur, fr, to), rest, k + 1, head + (fr === HEAD ? 1 : 0))) { ok = true; break; }
    }
  }
  T.memo.set(mk, ok);
  return ok;
}
function legalMoves(T) {
  const res = [];
  if (T.k >= T.maxlen) return res;
  const tried = new Set();
  for (let i = 0; i < T.left.length; i++) {
    const d = T.left[i];
    if (tried.has(d)) continue;
    tried.add(d);
    const rest = without(T.left, i);
    for (const [fr, to] of singleMoves(T.cur, T.opp, d, T.head < T.headLimit)) {
      if (playable(T, applyMove(T.cur, fr, to), rest, T.k + 1, T.head + (fr === HEAD ? 1 : 0))) res.push({ fr, to, d });
    }
  }
  return res;
}
function playMove(T, m) {
  T.hist.push({ cur: T.cur, left: T.left, k: T.k, head: T.head });
  T.seq.push([m.fr, m.to, m.d]);
  T.left = without(T.left, T.left.indexOf(m.d));
  T.cur = applyMove(T.cur, m.fr, m.to);
  T.k++;
  if (m.fr === HEAD) T.head++;
}
function undoMove(T) {
  const h = T.hist.pop();
  if (!h) return false;
  T.cur = h.cur; T.left = h.left; T.k = h.k; T.head = h.head;
  T.seq.pop();
  return true;
}

// ===== ВЕРОЯТНОСТИ =====
const ROLLS = [];
for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push({ dice: [a, b], p: (a === b ? 1 : 2) / 36 });
function pipsUsed(seq) { let s = 0; for (const m of seq) s += m[2]; return s; }
function moverStats(mover, other, first) {
  let full = 0, stuck = 0, lost = 0;
  const rows = [];
  for (const r of ROLLS) {
    const a = r.dice[0], b = r.dice[1];
    const total = a === b ? 4 * a : a + b;
    const g = generateTurns(mover, other, r.dice, first);
    let best = 0;
    for (const v of g.map.values()) { const u = pipsUsed(v.seq); if (u > best) best = u; }
    if (g.maxlen === 0) stuck += r.p;
    if (best === total) full += r.p;
    lost += r.p * (total - best);
    rows.push({ dice: r.dice, p: r.p, n: g.map.size, best, total });
  }
  return { full, stuck, lost, rows };
}

// ===== БОТ =====
const EW = { head: -0.4182, blockA: 0.3363, blockB: 0.2427, run: 0.3311, run4: 1.0053, zoneA: 1.1359, zoneC: 0.9355, zoneD: 0.4867, zoneH: 0.1739, stack: -0.8802 };
const RIDX = [0];
for (let p = 1; p <= 24; p++) RIDX[p] = (((12 - p) % 24) + 24) % 24;
function pointOfRoute(s) { const p = (((12 - s) % 24) + 24) % 24; return p === 0 ? 24 : p; }
const NEXT = [[]];
for (let q = 1; q <= 24; q++) { const a = []; for (let d = 1; d <= 6; d++) { const s = RIDX[q] + d; a.push(s <= 23 ? pointOfRoute(s) : 0); } NEXT[q] = a; }
function toPov(arr) { const r = new Array(25).fill(0); for (let p = 1; p <= 24; p++) r[p] = arr[oppPt(p)]; return r; }
// Признаки строения для владельца A; Bp - шашки соперника в нумерации A.
function feats(A, Bp) {
  const cum = new Array(25).fill(0), byR = new Array(24).fill(0);
  for (let q = 1; q <= 24; q++) if (Bp[q]) byR[RIDX[q]] = Bp[q];
  let s = 0;
  for (let r = 0; r < 24; r++) { cum[r] = s; s += byR[r]; }
  cum[24] = s;
  let blockA = 0, blockB = 0;
  for (let q = 1; q <= 24; q++) {
    const c = Bp[q];
    if (c) {
      let nb = 0;
      const nx = NEXT[q];
      for (let i = 0; i < 6; i++) { const t = nx[i]; if (t && A[t]) nb++; }
      if (q <= 12) blockA += c * nb; else blockB += c * nb;
    }
  }
  let run = 0, run4 = 0, zA = 0, zC = 0, zD = 0, zH = 0, stack = 0, length = 0, firstR = 99;
  for (let p = 24; p >= 0; p--) {
    const occ = p >= 1 && A[p] > 0;
    if (occ) {
      length++;
      if (RIDX[p] < firstR) firstR = RIDX[p];
      if (cum[RIDX[p]]) {
        if (p >= 7 && p <= 12) zA++; else if (p >= 13 && p <= 18) zC++; else if (p >= 19) zD++; else zH++;
      }
      if (A[p] > 3) stack += A[p] - 3;
    } else {
      if (length >= 2 && cum[firstR]) { run += length - 1; if (length > 3) run4 += length - 3; }
      length = 0; firstR = 99;
    }
  }
  return { head: A[24], blockA, blockB, run, run4, zoneA: zA, zoneC: zC, zoneD: zD, zoneH: zH, stack };
}
function evaluate(me, opp) {
  const a = feats(me, toPov(opp)), b = feats(opp, toPov(me));
  let v = pips(opp) - pips(me);
  for (const k in EW) v += EW[k] * (a[k] - b[k]);
  return v;
}
function bestReply(om, oo, dice, first) {
  const g = generateTurns(om, oo, dice, first);
  if (!g.map.size) return evaluate(om, oo);
  let best = -1e9;
  for (const v of g.map.values()) { const s = evaluate(v.pos, oo); if (s > best) best = s; }
  return best;
}
function chooseTurn(me, opp, dice, first, oppFirst, level) {
  const g = generateTurns(me, opp, dice, first);
  const arr = [];
  for (const v of g.map.values()) arr.push({ s: evaluate(v.pos, opp), pos: v.pos, seq: v.seq });
  if (!arr.length) return null;
  arr.sort((x, y) => y.s - x.s);
  if (level === 'easy') return arr[Math.floor(Math.random() * Math.min(3, arr.length))];
  if (level === 'normal' || arr.length === 1) return arr[0];
  let best = null;
  for (const c of arr.slice(0, 6)) {
    if (c.pos[0] === 15) return c;
    let exp = 0;
    for (const r of ROLLS) exp += r.p * bestReply(opp, c.pos, r.dice, oppFirst);
    if (!best || -exp > best.v) best = { v: -exp, c };
  }
  return best.c;
}

