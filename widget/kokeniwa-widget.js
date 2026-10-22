// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: seedling;

// =====================================================================
// こけにわ ウィジェット（iPhoneアプリ「Scriptable」用）
//
// 使い方
//   1. 下の3つの値（APP_URL / SUPABASE_URL / SUPABASE_KEY）を自分のものに書き換える
//   2. Scriptableでスクリプト名を「こけにわ」にして1回実行し、アプリで発行したキーを貼り付ける
//   3. ホーム画面を長押し →「＋」→ Scriptable のウィジェットを追加 → 長押しで編集 → Script に「こけにわ」
//      （ホーム画面の小・中、ロック画面の丸型・長方形・1行に対応）
//   キーを入れ直したいときは、Scriptableでこのスクリプトを実行してください。
//
// セキュリティ
//   ・SUPABASE_KEY には公開用キー（sb_publishable_〜）を入れる。秘密キーは絶対に入れない
//   ・ウィジェット用キーはこのファイルには書かず、iPhoneのキーチェーンに保存する
//   ・このキーでできるのは「タスクの読み取り」だけ。アプリの「取り消す」でいつでも無効にできる
// =====================================================================

const APP_URL = 'https://koba0605.github.io/kokeniwa/';
const SUPABASE_URL = 'https://sorfgjomevotbrbvaesb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_88wYeulSGx722DyNoRYs7A_vZLmv62n';

const KEYCHAIN_KEY = 'kokeniwa.widgetToken';
const CACHE_FILE = 'kokeniwa-widget-cache.json';
const REFRESH_MIN = 15;

// ---------- 色（アプリと同じ配色。ライト／ダークで切り替わる） ----------
function dyn(light, dark) { return Color.dynamic(new Color(light), new Color(dark)); }
const C = {
  bg: dyn('#FCFDFB', '#2C352F'),
  ink: dyn('#2A352E', '#E8EDE7'),
  ink2: dyn('#66736A', '#AEB9B0'),
  moss: dyn('#557A5E', '#A3C7A7'),
  high: dyn('#B0614C', '#EBA592'),
  mid: dyn('#9A7A26', '#E3C27E'),
  low: dyn('#4F8577', '#9DCDBE')
};
// 画像（リング）はライト／ダークを切り替えられないので、どちらでも読める中間の色にする
const RING_FG = new Color('#7BA582');
const RING_BG = new Color('#A3C2A7', 0.32);
const RANK_W = { high: 3, mid: 2, low: 1 };
const WD = ['日', '月', '火', '水', '木', '金', '土'];

// ---------- 日付と集計（アプリ本体と同じ計算） ----------
function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayStr() { return ymd(new Date()); }
function fmtShort(s) {
  const p = s.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2]);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '）';
}
function tasksFor(state, d) {
  return (state.tasks || []).filter(function (t) {
    return t.repeat === 'once' ? t.date === d : (t.date <= d && (!t.end || d < t.end));
  });
}
function summarize(state) {
  const d = todayStr(), list = tasksFor(state, d), set = new Set((state.done || {})[d] || []);
  let done = 0, highTotal = 0, highDone = 0;
  list.forEach(function (t) {
    const ok = set.has(t.id);
    if (ok) done++;
    if (t.rank === 'high') { highTotal++; if (ok) highDone++; }
  });
  const remaining = list.filter(function (t) { return !set.has(t.id); }).sort(function (a, b) {
    return ((RANK_W[b.rank] || 0) - (RANK_W[a.rank] || 0)) || ((a.createdAt || 0) - (b.createdAt || 0));
  });
  return { date: d, total: list.length, done: done, p: list.length ? done / list.length : 0, highLeft: highTotal - highDone, remaining: remaining };
}

// ---------- 設定とキー ----------
function configProblem() {
  if (/YOUR-/.test(APP_URL + SUPABASE_URL + SUPABASE_KEY)) return 'スクリプト冒頭の APP_URL・SUPABASE_URL・SUPABASE_KEY を書き換えてください。';
  if (/^sb_secret_/.test(SUPABASE_KEY)) return '危険：SUPABASE_KEY に秘密キーが入っています。公開用キー（sb_publishable_〜）に替えてください。';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL)) return 'SUPABASE_URL は https://〜.supabase.co の形で書いてください。';
  return '';
}
function getToken() { return Keychain.contains(KEYCHAIN_KEY) ? Keychain.get(KEYCHAIN_KEY) : null; }

async function askToken() {
  const a = new Alert();
  a.title = 'ウィジェット用キー';
  a.message = 'こけにわの「ウィジェット」タブで発行したキー（kkn_〜）を貼り付けてください。';
  a.addTextField('kkn_…', '');
  a.addAction('保存');
  a.addCancelAction('キャンセル');
  if (await a.presentAlert() === -1) return null;
  const v = (a.textFieldValue(0) || '').trim();
  if (!/^kkn_[A-Za-z0-9_-]{40,}$/.test(v)) {
    await notice('キーの形式が違います', '「kkn_」で始まるキーを、前後の空白なしで貼り付けてください。');
    return null;
  }
  Keychain.set(KEYCHAIN_KEY, v);
  return v;
}
async function notice(title, message) {
  const a = new Alert(); a.title = title; a.message = message; a.addAction('OK');
  await a.presentAlert();
}

// ---------- 通信とキャッシュ ----------
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
function readCache() {
  try { return fm.fileExists(cachePath) ? JSON.parse(fm.readString(cachePath)) : null; } catch (e) { return null; }
}
function writeCache(state) {
  try { fm.writeString(cachePath, JSON.stringify({ fetchedAt: Date.now(), state: state })); } catch (e) { /* なし */ }
}

// 戻り値: { state, fetchedAt, stale, error }
async function loadState(token) {
  try {
    const req = new Request(SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/get_widget_state');
    req.method = 'POST';
    req.headers = { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' };
    req.body = JSON.stringify({ p_token: token });
    req.timeoutInterval = 15;
    const text = await req.loadString();
    const code = req.response ? req.response.statusCode : 0;
    if (code !== 200) throw new Error('HTTP ' + code);
    const state = JSON.parse(text);
    if (state === null) return { error: 'invalid-key' };      // キーが取り消された／間違っている、またはデータがまだない
    writeCache(state);
    return { state: state, fetchedAt: Date.now(), stale: false };
  } catch (e) {
    const c = readCache();
    if (c && c.state) return { state: c.state, fetchedAt: c.fetchedAt, stale: true };
    return { error: 'network' };
  }
}

// ---------- 描画 ----------
function ringImage(p, size, line, fg, bg) {
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const r = (size - line) / 2, cx = size / 2, cy = size / 2;
  ctx.setStrokeColor(bg);
  ctx.setLineWidth(line);
  ctx.strokeEllipse(new Rect(line / 2, line / 2, size - line, size - line));
  const q = Math.max(0, Math.min(1, p));
  if (q > 0) {
    const path = new Path(), steps = Math.max(2, Math.round(160 * q));
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + 2 * Math.PI * q * (i / steps);
      const pt = new Point(cx + r * Math.cos(a), cy + r * Math.sin(a));
      if (i === 0) path.move(pt); else path.addLine(pt);
    }
    ctx.addPath(path);
    ctx.setStrokeColor(fg);
    ctx.setLineWidth(line);
    ctx.strokePath();
    ctx.setFillColor(fg);   // 線の両端を丸くする
    [0, q].forEach(function (t) {
      const a = -Math.PI / 2 + 2 * Math.PI * t;
      ctx.fillEllipse(new Rect(cx + r * Math.cos(a) - line / 2, cy + r * Math.sin(a) - line / 2, line, line));
    });
  }
  return ctx.getImage();
}
function addText(stack, str, font, color, lines) {
  const t = stack.addText(str);
  t.font = font; t.textColor = color;
  if (lines) t.lineLimit = lines;
  return t;
}
function ringStack(parent, s, size, line, label, font) {
  const st = parent.addStack();
  st.size = new Size(size, size);
  st.backgroundImage = ringImage(s.p, size, line, RING_FG, RING_BG);
  st.layoutHorizontally();
  st.centerAlignContent();
  st.addSpacer();
  addText(st, label, font, C.ink);
  st.addSpacer();
  return st;
}
function footText(s) {
  if (!s.total) return 'タスクはまだありません';
  if (!s.remaining.length) return 'すべて完了。花が咲きました';
  if (s.highLeft) return 'Aがあと' + s.highLeft + '件';
  return 'のこり' + s.remaining.length + '件';
}
function staleLabel(r) {
  if (!r.stale || !r.fetchedAt) return null;
  const d = new Date(r.fetchedAt);
  return '前回 ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' の情報';
}
function baseWidget() {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60 * 1000);
  return w;
}
function messageWidget(family, title, body) {
  const w = baseWidget();
  if (family.indexOf('accessory') === 0) {
    addText(w, family === 'accessoryCircular' ? '⚙︎' : title, Font.boldSystemFont(12), Color.white());
    return w;
  }
  w.setPadding(14, 14, 14, 14);
  addText(w, title, Font.boldSystemFont(13), C.ink, 2);
  w.addSpacer(6);
  addText(w, body, Font.systemFont(11), C.ink2, 5);
  w.addSpacer();
  return w;
}

function smallWidget(s, r) {
  const w = baseWidget();
  w.setPadding(13, 14, 12, 14);
  const top = w.addStack(); top.layoutHorizontally(); top.centerAlignContent();
  addText(top, '今日', Font.boldSystemFont(12), C.ink);
  top.addSpacer();
  addText(top, Math.round(s.p * 100) + '%', Font.boldRoundedSystemFont(17), C.moss);
  w.addSpacer();
  const mid = w.addStack(); mid.layoutHorizontally(); mid.addSpacer();
  ringStack(mid, s, 70, 8, s.done + '/' + s.total, Font.boldRoundedSystemFont(14));
  mid.addSpacer();
  w.addSpacer();
  const foot = addText(w, staleLabel(r) || footText(s), Font.systemFont(11), C.ink2, 1);
  foot.minimumScaleFactor = 0.8;
  return w;
}

function mediumWidget(s, r) {
  const w = baseWidget();
  w.setPadding(14, 16, 14, 16);
  const row = w.addStack(); row.layoutHorizontally(); row.centerAlignContent(); row.spacing = 14;
  ringStack(row, s, 86, 9, Math.round(s.p * 100) + '%', Font.boldRoundedSystemFont(19));
  const right = row.addStack(); right.layoutVertically(); right.spacing = 5;
  addText(right, fmtShort(s.date), Font.boldSystemFont(12), C.ink);
  if (s.remaining.length) {
    s.remaining.slice(0, 3).forEach(function (t) {
      const line = right.addStack(); line.layoutHorizontally(); line.centerAlignContent(); line.spacing = 6;
      addText(line, '●', Font.systemFont(8), C[t.rank] || C.mid);
      const tt = addText(line, String(t.title || ''), Font.systemFont(12.5), C.ink, 1);
      tt.minimumScaleFactor = 0.85;
    });
    if (s.remaining.length > 3) addText(right, 'ほか' + (s.remaining.length - 3) + '件', Font.systemFont(11), C.ink2);
  } else {
    addText(right, s.total ? 'すべて完了しました。' : 'タスクはまだありません。', Font.systemFont(12.5), C.ink2);
  }
  const st = staleLabel(r);
  if (st) addText(right, st, Font.systemFont(10), C.ink2);
  row.addSpacer();
  return w;
}

function circularWidget(s) {
  const w = new ListWidget();
  w.addAccessoryWidgetBackground = true;
  w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60 * 1000);
  const row = w.addStack(); row.layoutHorizontally(); row.addSpacer();
  const st = row.addStack();
  st.size = new Size(56, 56);
  st.backgroundImage = ringImage(s.p, 56, 5, Color.white(), new Color('#FFFFFF', 0.25));
  st.layoutHorizontally(); st.centerAlignContent(); st.addSpacer();
  addText(st, s.done + '/' + s.total, Font.boldRoundedSystemFont(13), Color.white());
  st.addSpacer();
  row.addSpacer();
  return w;
}

function rectangularWidget(s) {
  const w = new ListWidget();
  w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60 * 1000);
  addText(w, 'こけにわ ' + Math.round(s.p * 100) + '%（' + s.done + '/' + s.total + '）', Font.boldSystemFont(13), Color.white(), 1);
  if (s.remaining[0]) addText(w, '次：' + s.remaining[0].title, Font.systemFont(12), Color.white(), 1);
  addText(w, footText(s), Font.systemFont(11), Color.white(), 1);
  return w;
}

function inlineWidget(s) {
  const w = new ListWidget();
  w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60 * 1000);
  addText(w, 'こけにわ ' + s.done + '/' + s.total, Font.systemFont(12), Color.white());
  return w;
}

async function buildWidget(family) {
  const problem = configProblem();
  if (problem) return messageWidget(family, '設定が必要です', problem);
  const token = getToken();
  if (!token) return messageWidget(family, 'キーが未設定です', 'Scriptableアプリでこのスクリプトを実行して、ウィジェット用キーを貼り付けてください。');
  const r = await loadState(token);
  if (r.error === 'invalid-key') return messageWidget(family, '表示できません', 'キーが取り消されたか、まだタスクが保存されていません。アプリで確認してください。');
  if (r.error) return messageWidget(family, 'つながりません', 'ネットにつながると表示されます。');
  const s = summarize(r.state);
  if (family === 'small') return smallWidget(s, r);
  if (family === 'accessoryCircular') return circularWidget(s);
  if (family === 'accessoryRectangular') return rectangularWidget(s);
  if (family === 'accessoryInline') return inlineWidget(s);
  return mediumWidget(s, r);   // medium / large
}

// ---------- アプリ内で実行したときのメニュー ----------
async function appMenu() {
  const problem = configProblem();
  if (problem) { await notice('設定が必要です', problem); return; }
  if (!getToken()) {
    if (!(await askToken())) return;
    await (await buildWidget('medium')).presentMedium();
    return;
  }
  const a = new Alert();
  a.title = 'こけにわ';
  a.message = 'ウィジェット用キーは設定済みです。';
  a.addAction('プレビュー（小）');
  a.addAction('プレビュー（中）');
  a.addAction('キーを入れ直す');
  a.addDestructiveAction('キーを削除');
  a.addCancelAction('閉じる');
  const i = await a.presentAlert();
  if (i === 0) await (await buildWidget('small')).presentSmall();
  else if (i === 1) await (await buildWidget('medium')).presentMedium();
  else if (i === 2) { if (await askToken()) await (await buildWidget('medium')).presentMedium(); }
  else if (i === 3) { Keychain.remove(KEYCHAIN_KEY); await notice('削除しました', 'ウィジェットには「キーが未設定です」と表示されます。'); }
}

// ---------- 実行 ----------
if (config.runsInWidget) {
  Script.setWidget(await buildWidget(config.widgetFamily || 'medium'));
} else {
  await appMenu();
}
Script.complete();
