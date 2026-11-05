// ===== ИНТЕРФЕЙС (мобильный: перетаскивание, анимации) =====
const $ = id => document.getElementById(id);
const r6 = () => 1 + Math.floor(Math.random() * 6);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (x) { } };
const G = {
  h: null, b: null, firstH: true, firstB: true, phase: 'wait', turn: null, dice: null, dd: null,
  sel: null, hintSeq: null, last: [], score: { h: 0, b: 0 }, level: 'strong', token: 0,
  legal: [], hide: null, rollAnim: null, busy: false
};

// Геометрия доски в «логических» координатах 900x570 (как в исходной игре).
// На экране весь #bd повёрнут на 90°, чтобы доска стояла вертикально.
const X0 = 30, PW = 62, GAP = 20, R = 24, TOPY = 30, BOTY = 530, TH = 215, TX = 812, TW = 64;
const MIDY = (TOPY + BOTY) / 2;
const colX = p => { const c = p >= 13 ? p - 13 : 12 - p; return X0 + c * PW + (c >= 6 ? GAP : 0); };
function slotY(p, i, n) {
  const step = n <= 4 ? 2 * R : Math.min(2 * R, (TH - 2 * R) / (n - 1));
  const dy = R + i * step;
  return p >= 13 ? TOPY + dy : BOTY - dy;
}
const slot = (p, i, n) => ({ x: colX(p) + PW / 2, y: slotY(p, i, n) });
const trayPos = (kind, count) => kind === 'h'
  ? { x: TX + TW / 2, y: BOTY - 8 - (count + 1) * 12 + 5 }
  : { x: TX + TW / 2, y: TOPY + 8 + count * 12 + 5 };
const colRect = p => { const x0 = colX(p), y0 = p >= 13 ? TOPY : BOTY - TH; return { x0, x1: x0 + PW, y0, y1: y0 + TH }; };
const TRAY_H = { x0: TX, x1: TX + TW, y0: BOTY - 200, y1: BOTY };
const rectDist = (L, r) => Math.hypot(Math.max(r.x0 - L.x, 0, L.x - r.x1), Math.max(r.y0 - L.y, 0, L.y - r.y1));
function pointAt(x, y) {
  for (let c = 0; c < 12; c++) {
    const x0 = X0 + c * PW + (c >= 6 ? GAP : 0);
    if (x >= x0 && x < x0 + PW) return y < MIDY ? 13 + c : 12 - c;
  }
  return null;
}

// Текст остаётся прямым: разворачиваем его обратно вокруг своей точки.
const txt = (x, y, s, size, fill, weight) =>
  `<text x="${x}" y="${y}" transform="rotate(-90 ${x} ${y})" text-anchor="middle" font-size="${size}"${weight ? ` font-weight="${weight}"` : ''} fill="${fill}">${s}</text>`;
function chkBody(cx, cy, kind) {
  if (kind === 'h') return `<circle cx="${cx}" cy="${cy}" r="${R - 2}" fill="#f2ead3" stroke="#3c2f17" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${R - 9}" fill="none" stroke="#c4b68c" stroke-width="2"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="${R - 2}" fill="#25262b" stroke="#a3a5b3" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${R - 9}" fill="none" stroke="#51535f" stroke-width="2"/>`;
}
// тень уходит вправо-вниз на экране, а это (+x, -y) в логических координатах
const chk = (cx, cy, kind) => `<circle cx="${cx + 3}" cy="${cy - 3}" r="${R - 1}" fill="rgba(0,0,0,0.28)"/>` + chkBody(cx, cy, kind);

function refreshLegal() { G.legal = (G.phase === 'human' && G.turn) ? legalMoves(G.turn) : []; }

function render() {
  const T = G.turn;
  const inTurn = G.phase === 'human' && T;
  const H = inTurn ? T.cur : G.h;
  const B = G.b;
  const legal = inTurn ? G.legal : [];
  const sources = new Set(legal.map(m => m.fr));
  const hid = G.hide || {};
  const selMoves = G.sel !== null ? legal.filter(m => m.fr === G.sel) : [];
  const offOk = selMoves.some(m => m.to === 0);
  let s = '';
  s += `<rect x="0" y="0" width="900" height="570" rx="16" fill="#4a3322"/>`;
  s += `<rect x="24" y="26" width="776" height="518" rx="6" fill="#2b4a3c"/>`;
  s += `<rect x="${X0 + 6 * PW}" y="26" width="${GAP}" height="518" fill="#1f3629"/>`;
  for (let p = 1; p <= 24; p++) {
    const x = colX(p) + 2, w = PW - 4, top = p >= 13;
    const c = top ? p - 13 : 12 - p;
    const col = c % 2 === 0 ? '#c29a52' : '#7a2e29';
    const pts = top ? `${x},${TOPY} ${x + w},${TOPY} ${x + w / 2},${TOPY + TH}` : `${x},${BOTY} ${x + w},${BOTY} ${x + w / 2},${BOTY - TH}`;
    s += `<polygon points="${pts}" fill="${col}"/>`;
    s += txt(colX(p) + PW / 2 + 5, top ? 14 : 560, p, 15, '#cfd8d1');
  }
  // шашки
  for (let p = 1; p <= 24; p++) {
    const hn = H[p], bn = B[oppPt(p)];
    const n = hn > 0 ? hn : bn;
    if (!n) continue;
    const kind = hn > 0 ? 'h' : 'b';
    const cx = colX(p) + PW / 2;
    const nd = n - (hid[p] || 0);
    for (let i = 0; i < nd; i++) s += chk(cx, slotY(p, i, n), kind);
    if (n > 5 && nd > 0) s += txt(cx + 5, slotY(p, nd - 1, n), nd, 15, kind === 'h' ? '#25262b' : '#f0efe8', 700);
    if (kind === 'h' && !G.hide && sources.has(p)) s += `<circle class="pulse" cx="${cx}" cy="${slotY(p, n - 1, n)}" r="${R + 3}" fill="none" stroke="#7dffd0" stroke-width="3" stroke-dasharray="5 4"/>`;
    if (G.sel === p && nd > 0 && !G.hide) s += `<circle cx="${cx}" cy="${slotY(p, nd - 1, n)}" r="${R + 4}" fill="none" stroke="#2ee6a6" stroke-width="5"/>`;
  }
  // куда можно сходить выбранной шашкой
  const seen = new Set();
  for (const m of selMoves) {
    if (m.to <= 0 || seen.has(m.to)) continue;
    seen.add(m.to);
    const cx = colX(m.to) + PW / 2, n = H[m.to];
    const cy = slotY(m.to, n, n + 1);
    s += `<circle id="gh-${m.to}" cx="${cx}" cy="${cy}" r="${R - 1}" fill="rgba(46,230,166,0.28)" stroke="#2ee6a6" stroke-width="3" stroke-dasharray="6 4"/>`;
    s += txt(cx + 6, cy, m.d, 18, '#e9fff6', 700);
  }
  // метки последнего хода бота и подсказки
  for (const p of G.last) s += `<circle cx="${colX(p) + PW / 2}" cy="${p >= 13 ? TOPY + 9 : BOTY - 9}" r="6" fill="#ff9f43" stroke="#2a1a05" stroke-width="1.5"/>`;
  if (G.hintSeq) {
    for (const m of G.hintSeq) {
      const f = colX(m[0]) + PW / 2 - 14;
      s += `<circle cx="${f}" cy="${m[0] >= 13 ? TOPY + 9 : BOTY - 9}" r="6" fill="#5aa9ff" stroke="#0a1b33" stroke-width="1.5"/>`;
      if (m[1] > 0) s += `<circle cx="${colX(m[1]) + PW / 2 + 14}" cy="${m[1] >= 13 ? TOPY + 9 : BOTY - 9}" r="6" fill="none" stroke="#5aa9ff" stroke-width="3"/>`;
    }
  }
  // лотки выноса
  s += `<rect id="gh-0" x="${TX}" y="${BOTY - 200}" width="${TW}" height="200" rx="6" fill="#1f3629" stroke="${offOk ? '#2ee6a6' : '#6b4f2f'}" stroke-width="${offOk ? 4 : 2}"/>`;
  s += `<rect x="${TX}" y="${TOPY}" width="${TW}" height="200" rx="6" fill="#1f3629" stroke="#6b4f2f" stroke-width="2"/>`;
  for (let i = 0; i < H[0]; i++) s += `<rect x="${TX + 6}" y="${BOTY - 8 - (i + 1) * 12}" width="${TW - 12}" height="10" rx="3" fill="#f2ead3" stroke="#3c2f17"/>`;
  for (let i = 0; i < B[0]; i++) s += `<rect x="${TX + 6}" y="${TOPY + 8 + i * 12}" width="${TW - 12}" height="10" rx="3" fill="#25262b" stroke="#a3a5b3"/>`;
  s += txt(TX + TW / 2 + 5, BOTY - 100, 'вынос', 14, 'rgba(207,216,209,0.45)');
  s += txt(TX + TW / 2 + 5, TOPY + 100, 'вынос', 14, 'rgba(207,216,209,0.45)');
  $('bd').innerHTML = s;

  renderDice();
  $('pipsLine').textContent = `до конца: вы ${pips(H)} · бот ${pips(G.b)}`;
  $('roll').disabled = G.phase !== 'idle';
  $('roll').classList.toggle('attn', G.phase === 'idle');
  $('undo').disabled = !(inTurn && T.hist.length && !G.busy);
  $('hint').disabled = !(inTurn && T.k === 0 && !G.busy);
}

// ----- летящая шашка -----
function showFlyer(kind) {
  $('fx').innerHTML = `<g id="fl"><circle id="fls" r="${R - 1}" fill="#000" opacity="0.28"/>${chkBody(0, 0, kind)}</g>`;
}
function hideFlyer() { $('fx').innerHTML = ''; }
function moveFlyer(x, y, lift, sc) {
  const el = $('fl'); if (!el) return;
  const s = (1 + 0.28 * lift) * sc;
  el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`);
  $('fls').setAttribute('transform', `translate(${(3 + 10 * lift).toFixed(1)} ${(-(4 + 12 * lift)).toFixed(1)})`);
}
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
// o: dur, arc (подъём в середине полёта), lift0 (начальный подъём), shrink (уменьшение при выносе)
function flyChecker(kind, from, to, o, done) {
  G.busy = true;
  const tk = G.token, t0 = performance.now(), dur = o.dur;
  const arc = o.arc === undefined ? 1 : o.arc, lift0 = o.lift0 || 0;
  showFlyer(kind);
  moveFlyer(from.x, from.y, lift0, 1);
  const step = () => {
    if (tk !== G.token) { hideFlyer(); G.busy = false; return; }
    const t = clamp((performance.now() - t0) / dur, 0, 1), e = easeInOut(t);
    moveFlyer(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, lift0 * (1 - e) + Math.sin(Math.PI * t) * arc, o.shrink ? 1 - 0.45 * e : 1);
    if (t < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
}

// ----- кубики -----
function dieHTML(v, used, bot, rolling) {
  const P = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[v];
  let c = '';
  for (let i = 0; i < 9; i++) c += `<i class="${P.includes(i) ? 'on' : ''}"></i>`;
  return `<div class="die${used ? ' used' : ''}${bot ? ' bot' : ''}${rolling ? ' rolling' : ''}">${c}</div>`;
}
function renderDice() {
  if (G.rollAnim) {
    const a = G.rollAnim;
    $('dice').innerHTML = a.vals.map(v => dieHTML(v, false, a.owner === 'b', true)).join('');
    return;
  }
  const T = G.turn;
  let init = null, left = null, bot = false;
  if (G.phase === 'human' && T) { init = T.init; left = T.left; }
  else if (G.dd) { init = G.dd.init; left = G.dd.left; bot = G.dd.owner === 'b'; }
  if (!init) { $('dice').innerHTML = ''; return; }
  const tmp = left.slice();
  let h = '';
  for (const d of init) {
    const i = tmp.indexOf(d);
    const used = i < 0;
    if (!used) tmp.splice(i, 1);
    h += dieHTML(d, used, bot, false);
  }
  $('dice').innerHTML = h;
}
function rollDiceAnim(owner, cb) {
  const tk = G.token;
  let n = 0;
  G.rollAnim = { owner, vals: [r6(), r6()] };
  renderDice();
  buzz(15);
  const iv = setInterval(() => {
    if (tk !== G.token) { clearInterval(iv); G.rollAnim = null; return; }
    if (++n >= 8) { clearInterval(iv); G.rollAnim = null; cb(); return; }
    G.rollAnim.vals = [r6(), r6()];
    renderDice();
  }, 85);
}

// ----- меню / статистика -----
const pct = x => (x * 100).toFixed(1).replace('.', ',') + '%';
function renderPips() {
  const H = (G.phase === 'human' && G.turn) ? G.turn.cur : G.h;
  const mine = pips(H), bot = pips(G.b), diff = bot - mine;
  $('pips').innerHTML =
    `<div class="pipline"><span>Вы</span><strong>${mine}</strong></div>` +
    `<div class="pipline"><span>Бот</span><strong>${bot}</strong></div>` +
    `<p class="pipnote">${diff === 0 ? 'Поровну.' : diff > 0 ? `Вы впереди на ${diff}.` : `Бот впереди на ${-diff}.`} Для победы нужно вынести все 15 шашек.</p>`;
}
function updateStats() {
  const H = (G.phase === 'human' && G.turn) ? G.turn.cur : G.h;
  const me = moverStats(H, G.b, G.firstH);
  const bt = moverStats(G.b, H, G.firstB);
  const line = (name, st) => `<div class="stat"><h4>${name}</h4><p>Сыграет бросок полностью: ${pct(st.full)}<br>Не сможет сходить совсем: ${pct(st.stuck)}<br>Теряет в среднем очков: ${st.lost.toFixed(2).replace('.', ',')}</p></div>`;
  $('stats').innerHTML = line('Ваш следующий бросок', me) + line('Следующий бросок бота', bt);
  let t = '<thead><tr><th>Куш</th><th>Шанс</th><th>Вариантов</th><th>Очков</th></tr></thead><tbody>';
  for (const r of me.rows) t += `<tr><td>${r.dice[0]}-${r.dice[1]}</td><td>${pct(r.p)}</td><td>${r.n}</td><td>${r.best} из ${r.total}</td></tr>`;
  $('rolltable').innerHTML = t + '</tbody>';
}
let sheetOpen = false;
function openSheet() {
  if (sheetOpen) return;
  sheetOpen = true;
  renderPips();
  $('stats').innerHTML = '<p class="pipnote">Считаю…</p>';
  $('rolltable').innerHTML = '';
  $('sheet').hidden = false;
  try { history.pushState({ sheet: 1 }, ''); } catch (x) { }
  setTimeout(() => { if (sheetOpen) updateStats(); }, 40);
}
function hideSheet() { sheetOpen = false; $('sheet').hidden = true; }
function closeSheet() {
  if (!sheetOpen) return;
  let viaHistory = false;
  try { if (history.state && history.state.sheet) { history.back(); viaHistory = true; } } catch (x) { }
  if (!viaHistory) hideSheet();
}
window.addEventListener('popstate', () => { if (sheetOpen) hideSheet(); });

const setStatus = t => { $('status').textContent = t; };
function addLog(t) { const li = document.createElement('li'); li.textContent = t; $('log').prepend(li); }
const fmtH = seq => seq.map(m => `${m[0]}→${m[1] === 0 ? 'вынос' : m[1]}`).join(', ');
const fmtB = seq => seq.map(m => `${oppPt(m[0])}→${m[1] === 0 ? 'вынос' : oppPt(m[1])}`).join(', ');
function updateScore() { $('score').innerHTML = `Вы <b>${G.score.h}</b> : <b>${G.score.b}</b> Бот`; }

// ----- ход игры -----
function newGame() {
  G.token++;
  G.h = startPos(); G.b = startPos();
  G.firstH = G.firstB = true;
  G.turn = null; G.dd = null; G.sel = null; G.hintSeq = null; G.last = []; G.legal = [];
  G.hide = null; G.rollAnim = null; G.busy = false;
  ptr = null;
  hideFlyer();
  hideSheet();
  $('over').hidden = true;
  $('log').innerHTML = '';
  const humanFirst = Math.random() < 0.5;
  if (humanFirst) {
    G.phase = 'idle';
    setStatus('Жребий: первым ходите вы. Бросьте кубики.');
    render();
  } else {
    G.phase = 'bot';
    setStatus('Жребий: первым ходит бот.');
    render();
    const tk = G.token;
    setTimeout(() => { if (tk === G.token) botTurn(); }, 800);
  }
}

function humanRoll() {
  if (G.phase !== 'idle') return;
  const dice = [r6(), r6()];
  G.phase = 'rolling'; G.sel = null; G.hintSeq = null; G.last = []; G.dd = null;
  setStatus('Бросаю кубики…');
  render();
  const tk = G.token;
  rollDiceAnim('h', () => { if (tk === G.token) afterHumanRoll(dice); });
}
function afterHumanRoll(dice) {
  G.dice = dice;
  G.turn = newTurn(G.h, G.b, dice, G.firstH);
  const a = dice[0], b = dice[1];
  if (G.turn.maxlen === 0) {
    G.phase = 'wait';
    G.dd = { init: a === b ? [a, a, a, a] : [a, b], left: [], owner: 'h' };
    addLog(`Вы ${a}-${b}: нет ходов`);
    setStatus(`Выпало ${a}-${b}, но ходить нечем. Ход переходит к боту.`);
    render();
    const tk = G.token;
    setTimeout(() => { if (tk !== G.token) return; G.firstH = false; G.turn = null; botTurn(); }, 1500);
    return;
  }
  G.phase = 'human';
  refreshLegal();
  const extra = (G.firstH && a === b && (a === 3 || a === 4 || a === 6)) ? ' На первом ходу с этим дублем можно взять две шашки с головы.' : '';
  setStatus(`Выпало ${a}-${b}. Перетащите подсвеченную шашку на свободный пункт или нажмите на неё.${extra}`);
  render();
}

// Ход человека с анимацией. startPos задан, если шашку отпустили после перетаскивания.
function tryHumanMove(m, startPos) {
  const H = G.turn.cur;
  const n = H[m.fr];
  const from = startPos || slot(m.fr, n - 1, n);
  const to = m.to === 0 ? trayPos('h', H[0]) : slot(m.to, H[m.to], H[m.to] + 1);
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  G.hide = { [m.fr]: 1 }; G.sel = null; G.hintSeq = null;
  render();
  flyChecker('h', from, to, startPos
    ? { dur: 160, arc: 0, lift0: 1, shrink: m.to === 0 }
    : { dur: clamp(260 + dist * 0.6, 300, 560), shrink: m.to === 0 },
  () => { G.hide = null; hideFlyer(); commitHumanMove(m); });
}
function commitHumanMove(m) {
  const T = G.turn;
  playMove(T, m);
  G.busy = false; G.sel = null;
  refreshLegal();
  buzz(10);
  if (T.k >= T.maxlen) {
    G.phase = 'wait';
    render();
    const tk = G.token;
    setTimeout(() => { if (tk === G.token) endHumanTurn(); }, 450);
    return;
  }
  setStatus('Ходите дальше: у вас остались кости ' + T.left.join(' и ') + '.');
  render();
}
function endHumanTurn() {
  const T = G.turn;
  addLog(`Вы ${G.dice[0]}-${G.dice[1]}: ${fmtH(T.seq)}`);
  G.h = T.cur; G.firstH = false; G.turn = null; G.dd = null; G.legal = [];
  if (G.h[0] === 15) { gameOver('h'); return; }
  botTurn();
}

function botTurn() {
  G.phase = 'bot'; G.sel = null; G.hintSeq = null; G.last = []; G.legal = []; G.dd = null;
  const dice = [r6(), r6()];
  const a = dice[0], b = dice[1];
  const init = a === b ? [a, a, a, a] : [a, b];
  setStatus('Бот бросает кубики…');
  render();
  const tk = G.token;
  rollDiceAnim('b', () => {
    if (tk !== G.token) return;
    G.dd = { init, left: init.slice(), owner: 'b' };
    setStatus(`Бот бросил ${a}-${b} и думает…`);
    render();
    setTimeout(() => {
      if (tk !== G.token) return;
      const r = chooseTurn(G.b, G.h, dice, G.firstB, G.firstH, G.level);
      G.firstB = false;
      if (!r) {
        addLog(`Бот ${a}-${b}: нет ходов`);
        G.dd.left = [];
        startHuman('У бота нет ходов. Ваш ход, бросьте кубики.');
        return;
      }
      animateBot(r.seq, 0, dice, tk);
    }, 350);
  });
}
function animateBot(seq, i, dice, tk) {
  if (tk !== G.token) return;
  if (i >= seq.length) {
    addLog(`Бот ${dice[0]}-${dice[1]}: ${fmtB(seq)}`);
    if (G.b[0] === 15) { gameOver('b'); return; }
    startHuman(`Бот сыграл ${fmtB(seq)}. Оранжевые точки показывают его ход. Ваш ход, бросьте кубики.`);
    return;
  }
  const [fr, to, d] = seq[i];
  const pS = oppPt(fr), nS = G.b[fr];
  const from = slot(pS, nS - 1, nS);
  const dest = to === 0 ? trayPos('b', G.b[0]) : slot(oppPt(to), G.b[to], G.b[to] + 1);
  const dist = Math.hypot(dest.x - from.x, dest.y - from.y);
  const k = G.dd.left.indexOf(d);
  if (k >= 0) G.dd.left.splice(k, 1);
  G.hide = { [pS]: 1 };
  render();
  flyChecker('b', from, dest, { dur: clamp(340 + dist * 0.7, 420, 760), shrink: to === 0 }, () => {
    if (tk !== G.token) return;
    G.b = applyMove(G.b, fr, to);
    G.hide = null; hideFlyer(); G.busy = false;
    G.last.push(pS);
    if (to > 0) G.last.push(oppPt(to));
    render();
    setTimeout(() => animateBot(seq, i + 1, dice, tk), 170);
  });
}
function startHuman(msg) {
  G.phase = 'idle';
  setStatus(msg);
  render();
}

function gameOver(who) {
  G.phase = 'over';
  const loserOff = who === 'h' ? G.b[0] : G.h[0];
  const pts = loserOff === 0 ? 2 : 1;
  G.score[who] += pts;
  updateScore();
  render();
  $('overTitle').textContent = who === 'h' ? 'Вы выиграли!' : 'Выиграл бот';
  $('overText').textContent = (pts === 2 ? 'Марс: соперник не вынес ни одной шашки, это 2 очка. ' : 'Это 1 очко. ') + `Счёт ${G.score.h} : ${G.score.b}.`;
  $('over').hidden = false;
  setStatus(who === 'h' ? 'Партия окончена, вы победили.' : 'Партия окончена, победил бот.');
  buzz(who === 'h' ? [30, 60, 30] : 40);
}

// ----- ввод: перетаскивание и касание -----
const svg = $('board');
const LIFT = 52; // насколько шашка «поднята» над пальцем (в единицах viewBox)
let ptr = null;
function clientToRoot(cx, cy) {
  const m = svg.getScreenCTM();
  if (!m) return { X: 0, Y: 0 };
  const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
  return { X: p.x, Y: p.y };
}
const rootToLogical = (X, Y) => ({ x: Y, y: 570 - X });
const logicalToRoot = (x, y) => ({ X: 570 - y, Y: x });
const isSource = p => G.legal.some(m => m.fr === p);

function nearestDest(L, src) {
  let best = null, bs = 1e9;
  const H = G.turn.cur;
  for (const m of G.legal) {
    if (m.fr !== src) continue;
    let sc;
    if (m.to === 0) {
      const d = rectDist(L, TRAY_H);
      sc = d <= 46 ? d : 1e9;
    } else {
      const r = colRect(m.to), d = rectDist(L, r);
      sc = d <= 30 ? d * 4 + Math.abs(L.x - (r.x0 + PW / 2)) : 1e9;
    }
    if (sc < bs) { bs = sc; best = m.to; }
  }
  return best;
}
function styleGhost(to, on) {
  const el = $('gh-' + to);
  if (!el) return;
  if (to === 0) {
    el.setAttribute('stroke-width', on ? 7 : 4);
    el.setAttribute('fill', on ? 'rgba(46,230,166,0.35)' : '#1f3629');
  } else {
    el.setAttribute('fill', on ? 'rgba(46,230,166,0.65)' : 'rgba(46,230,166,0.28)');
    el.setAttribute('stroke-width', on ? 6 : 3);
    el.setAttribute('r', on ? R + 3 : R - 1);
  }
}
function setNear(to) {
  if (!ptr || ptr.near === to) return;
  if (ptr.near !== null && ptr.near !== undefined) styleGhost(ptr.near, false);
  ptr.near = to;
  if (to !== null) { styleGhost(to, true); buzz(4); }
}

function startDrag() {
  const p = ptr.p, n = G.turn.cur[p];
  G.sel = p; G.hide = { [p]: 1 };
  render();
  const from = slot(p, n - 1, n);
  const fr = logicalToRoot(from.x, from.y), pr = clientToRoot(ptr.cx, ptr.cy);
  ptr.dragging = true; ptr.from = from; ptr.pos = from; ptr.near = null;
  ptr.grab = { X: fr.X - pr.X, Y: fr.Y - pr.Y };
  ptr.t0 = performance.now();
  ptr.lcx = ptr.cx; ptr.lcy = ptr.cy;
  showFlyer('h');
  moveFlyer(from.x, from.y, 0, 1);
  buzz(8);
  const loop = () => { if (!ptr || !ptr.dragging) return; updateDrag(); ptr.raf = requestAnimationFrame(loop); };
  ptr.raf = requestAnimationFrame(loop);
}
function updateDrag() {
  const r = clientToRoot(ptr.lcx, ptr.lcy);
  const t = clamp((performance.now() - ptr.t0) / 150, 0, 1), lift = 1 - Math.pow(1 - t, 3);
  const L = rootToLogical(r.X + ptr.grab.X * (1 - lift), r.Y + ptr.grab.Y * (1 - lift) - LIFT * lift);
  ptr.pos = L;
  moveFlyer(L.x, L.y, lift, 1);
  setNear(nearestDest(L, ptr.p));
}
function finishDrag(d, cancelled) {
  const L = d.pos;
  const to = cancelled ? null : nearestDest(L, d.p);
  if (to !== null) {
    const m = G.legal.filter(x => x.fr === d.p && x.to === to).sort((x, y) => x.d - y.d)[0];
    tryHumanMove(m, L);
    return;
  }
  // не попали никуда: шашка возвращается на место
  const dist = Math.hypot(L.x - d.from.x, L.y - d.from.y);
  G.sel = null;
  flyChecker('h', L, d.from, { dur: clamp(160 + dist * 0.5, 200, 380), arc: 0, lift0: 1 }, () => {
    G.hide = null; G.busy = false; hideFlyer(); render();
  });
}
function handleTap(p) {
  if (G.phase !== 'human' || G.busy) return;
  const legal = G.legal;
  if (G.sel !== null && p !== null) {
    const c = legal.filter(m => m.fr === G.sel && m.to === p).sort((x, y) => x.d - y.d);
    if (c.length) { tryHumanMove(c[0]); return; }
  }
  const from = p === null ? [] : legal.filter(m => m.fr === p);
  if (from.length) {
    const ds = [...new Set(from.map(m => m.to))];
    if (ds.length === 1) { tryHumanMove(from.sort((x, y) => x.d - y.d)[0]); return; }
    G.sel = p;
  } else {
    G.sel = null;
  }
  render();
}

svg.addEventListener('pointerdown', e => {
  if (G.phase !== 'human' || G.busy || ptr) return;
  const r = clientToRoot(e.clientX, e.clientY), L = rootToLogical(r.X, r.Y);
  let p = pointAt(L.x, L.y);
  if (p === null && rectDist(L, TRAY_H) === 0) p = 0;
  ptr = { id: e.pointerId, cx: e.clientX, cy: e.clientY, p, dragging: false };
  try { svg.setPointerCapture(e.pointerId); } catch (x) { }
});
svg.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (!ptr.dragging) {
    if (Math.hypot(e.clientX - ptr.cx, e.clientY - ptr.cy) < 10) return;
    if (ptr.p === null || ptr.p === 0 || !isSource(ptr.p)) return;
    startDrag();
  }
  ptr.lcx = e.clientX; ptr.lcy = e.clientY;
});
const endPointer = (e, cancelled) => {
  if (!ptr || e.pointerId !== ptr.id) return;
  const d = ptr; ptr = null;
  if (d.dragging) { cancelAnimationFrame(d.raf); finishDrag(d, cancelled); }
  else if (!cancelled) handleTap(d.p);
};
svg.addEventListener('pointerup', e => endPointer(e, false));
svg.addEventListener('pointercancel', e => endPointer(e, true));
svg.addEventListener('contextmenu', e => e.preventDefault());

$('roll').addEventListener('click', humanRoll);
$('newGame').addEventListener('click', newGame);
$('again').addEventListener('click', newGame);
$('menuBtn').addEventListener('click', openSheet);
$('closeSheet').addEventListener('click', closeSheet);
$('sheet').addEventListener('click', e => { if (e.target === $('sheet')) closeSheet(); });
$('undo').addEventListener('click', () => {
  if (G.phase !== 'human' || !G.turn || G.busy) return;
  if (undoMove(G.turn)) { G.sel = null; G.hintSeq = null; refreshLegal(); setStatus('Ход отменён.'); render(); }
});
$('hint').addEventListener('click', () => {
  if (G.phase !== 'human' || !G.turn || G.turn.k !== 0 || G.busy) return;
  setStatus('Бот ищет лучший ход…');
  const tk = G.token;
  setTimeout(() => {
    if (tk !== G.token || G.phase !== 'human') return;
    const r = chooseTurn(G.h, G.b, G.dice, G.firstH, G.firstB, 'strong');
    if (!r) return;
    G.hintSeq = r.seq;
    setStatus('Совет: ' + fmtH(r.seq) + '. Синяя точка показывает, откуда идти, кольцо куда.');
    render();
  }, 30);
});
$('level').addEventListener('change', e => { G.level = e.target.value; try { localStorage.setItem('nardy-level', G.level); } catch (x) { } });
try { const l = localStorage.getItem('nardy-level'); if (l && ['easy', 'normal', 'strong'].includes(l)) { G.level = l; $('level').value = l; } } catch (x) { }
G.level = $('level').value;
updateScore();
newGame();

// офлайн-режим для установки как PWA (в упакованном APK не нужен)
try {
  const native = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !native) navigator.serviceWorker.register('sw.js').catch(() => { });
} catch (x) { }
