(function () {
  'use strict';

  /* ---------- 定数・日付ユーティリティ ---------- */
  var LS_KEY = 'kokeniwa:v1';
  var RANKS = [
    { id: 'high', short: '高', label: '今日かならず', weight: 3 },
    { id: 'mid',  short: '中', label: 'できれば今日', weight: 2 },
    { id: 'low',  short: '低', label: '余裕があれば', weight: 1 }
  ];
  var RANK_W = { high: 3, mid: 2, low: 1 };
  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function todayStr() { return ymd(new Date()); }
  function weekStart(s) { return addDays(s, -((parse(s).getDay() + 6) % 7)); }
  function fmtLong(s) { var d = parse(s); return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WD[d.getDay()] + '曜日'; }
  function fmtShort(s) { var d = parse(s); return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '）'; }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 七十二候（日付は目安。年によって1日前後します） */
  var KOU = [
    [1,5,'小寒','芹乃栄','せりすなわちさかう'],[1,10,'小寒','水泉動','しみずあたたかをふくむ'],[1,15,'小寒','雉始雊','きじはじめてなく'],
    [1,20,'大寒','款冬華','ふきのはなさく'],[1,25,'大寒','水沢腹堅','さわみずこおりつめる'],[1,30,'大寒','鶏始乳','にわとりはじめてとやにつく'],
    [2,4,'立春','東風解凍','はるかぜこおりをとく'],[2,9,'立春','黄鶯睍睆','うぐいすなく'],[2,14,'立春','魚上氷','うおこおりをいずる'],
    [2,19,'雨水','土脉潤起','つちのしょううるおいおこる'],[2,24,'雨水','霞始靆','かすみはじめてたなびく'],[3,1,'雨水','草木萌動','そうもくめばえいずる'],
    [3,5,'啓蟄','蟄虫啓戸','すごもりむしとをひらく'],[3,10,'啓蟄','桃始笑','ももはじめてさく'],[3,15,'啓蟄','菜虫化蝶','なむしちょうとなる'],
    [3,20,'春分','雀始巣','すずめはじめてすくう'],[3,25,'春分','桜始開','さくらはじめてひらく'],[3,30,'春分','雷乃発声','かみなりすなわちこえをはっす'],
    [4,4,'清明','玄鳥至','つばめきたる'],[4,9,'清明','鴻雁北','こうがんかえる'],[4,14,'清明','虹始見','にじはじめてあらわる'],
    [4,20,'穀雨','葭始生','あしはじめてしょうず'],[4,25,'穀雨','霜止出苗','しもやんでなえいずる'],[4,30,'穀雨','牡丹華','ぼたんはなさく'],
    [5,5,'立夏','蛙始鳴','かわずはじめてなく'],[5,10,'立夏','蚯蚓出','みみずいずる'],[5,15,'立夏','竹笋生','たけのこしょうず'],
    [5,21,'小満','蚕起食桑','かいこおきてくわをはむ'],[5,26,'小満','紅花栄','べにばなさかう'],[5,31,'小満','麦秋至','むぎのときいたる'],
    [6,6,'芒種','蟷螂生','かまきりしょうず'],[6,11,'芒種','腐草為螢','くされたるくさほたるとなる'],[6,16,'芒種','梅子黄','うめのみきばむ'],
    [6,21,'夏至','乃東枯','なつかれくさかるる'],[6,26,'夏至','菖蒲華','あやめはなさく'],[7,2,'夏至','半夏生','はんげしょうず'],
    [7,7,'小暑','温風至','あつかぜいたる'],[7,12,'小暑','蓮始開','はすはじめてひらく'],[7,17,'小暑','鷹乃学習','たかすなわちわざをならう'],
    [7,23,'大暑','桐始結花','きりはじめてはなをむすぶ'],[7,28,'大暑','土潤溽暑','つちうるおうてむしあつし'],[8,2,'大暑','大雨時行','たいうときどきふる'],
    [8,7,'立秋','涼風至','すずかぜいたる'],[8,12,'立秋','寒蝉鳴','ひぐらしなく'],[8,17,'立秋','蒙霧升降','ふかききりまとう'],
    [8,23,'処暑','綿柎開','わたのはなしべひらく'],[8,28,'処暑','天地始粛','てんちはじめてさむし'],[9,2,'処暑','禾乃登','こくものすなわちみのる'],
    [9,7,'白露','草露白','くさのつゆしろし'],[9,12,'白露','鶺鴒鳴','せきれいなく'],[9,17,'白露','玄鳥去','つばめさる'],
    [9,22,'秋分','雷乃収声','かみなりすなわちこえをおさむ'],[9,28,'秋分','蟄虫坏戸','むしかくれてとをふさぐ'],[10,3,'秋分','水始涸','みずはじめてかるる'],
    [10,8,'寒露','鴻雁来','こうがんきたる'],[10,13,'寒露','菊花開','きくのはなひらく'],[10,18,'寒露','蟋蟀在戸','きりぎりすとにあり'],
    [10,23,'霜降','霜始降','しもはじめてふる'],[10,28,'霜降','霎時施','こさめときどきふる'],[11,2,'霜降','楓蔦黄','もみじつたきばむ'],
    [11,7,'立冬','山茶始開','つばきはじめてひらく'],[11,12,'立冬','地始凍','ちはじめてこおる'],[11,17,'立冬','金盞香','きんせんかさく'],
    [11,22,'小雪','虹蔵不見','にじかくれてみえず'],[11,27,'小雪','朔風払葉','きたかぜこのはをはらう'],[12,2,'小雪','橘始黄','たちばなはじめてきばむ'],
    [12,7,'大雪','閉塞成冬','そらさむくふゆとなる'],[12,12,'大雪','熊蟄穴','くまあなにこもる'],[12,16,'大雪','鱖魚群','さけのうおむらがる'],
    [12,21,'冬至','乃東生','なつかれくさしょうず'],[12,26,'冬至','麋角解','さわしかのつのおつる'],[12,31,'冬至','雪下出麦','ゆきわたりてむぎのびる']
  ];
  var PHASE = ['初候', '次候', '末候'];
  function kouFor(s) {
    var d = parse(s), key = (d.getMonth() + 1) * 100 + d.getDate(), idx = KOU.length - 1;
    for (var i = 0; i < KOU.length; i++) { if (KOU[i][0] * 100 + KOU[i][1] <= key) idx = i; }
    var k = KOU[idx];
    return { sekki: k[2], phase: PHASE[idx % 3], name: k[3], reading: k[4] };
  }

  /* ---------- 状態 ---------- */
  function emptyState() { return { v: 1, updatedAt: Date.now(), tasks: [], done: {} }; }
  function valid(s) { return !!s && s.v === 1 && Array.isArray(s.tasks) && s.done && typeof s.done === 'object'; }

  function sampleState() {
    var t = todayStr(), start = addDays(t, -34), order = 0;
    function mk(title, rank, repeat, date) {
      return { id: newId() + order, title: title, rank: rank, repeat: repeat, date: date, createdAt: ++order, sample: true };
    }
    var daily = [mk('明日の予定を確認する', 'high', 'daily', start), mk('30分歩く', 'mid', 'daily', start), mk('本を20ページ読む', 'low', 'daily', start)];
    var once = [mk('レポートを提出する', 'high', 'once', t), mk('メールの返信を3件', 'mid', 'once', t), mk('机の上を片づける', 'low', 'once', t), mk('図書館の本を返す', 'mid', 'once', addDays(t, -1))];
    var done = {}, seed = 20261016;
    function rnd() { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; }
    var prob = { high: 0.9, mid: 0.68, low: 0.45 };
    for (var i = 34; i >= 1; i--) {
      var d = addDays(t, -i);
      var ids = daily.filter(function (x) { return rnd() < prob[x.rank]; }).map(function (x) { return x.id; });
      if (ids.length) done[d] = ids;
    }
    done[t] = [once[0].id, once[1].id, daily[1].id];
    return { v: 1, updatedAt: 0, pristine: true, tasks: daily.concat(once), done: done };
  }

  // 端末内のキャッシュはユーザーごとに分ける（同じ端末で別アカウントに切り替えても混ざらない）
  function lsKey() { return LS_KEY + ':' + (user ? user.id : 'guest'); }
  function loadLocal() {
    try { var raw = localStorage.getItem(lsKey()); if (!raw) return null; var s = JSON.parse(raw); return valid(s) ? s : null; }
    catch (e) { return null; }
  }
  function saveLocal() { if (!state) return; try { localStorage.setItem(lsKey(), JSON.stringify(state)); } catch (e) { /* 保存できない環境ではメモリ上だけで動く */ } }
  function prune(s) {
    var limit = addDays(todayStr(), -400);
    Object.keys(s.done).forEach(function (k) { if (k < limit) delete s.done[k]; });
    s.tasks = s.tasks.filter(function (t) { return !(t.repeat === 'once' && t.date < limit) && !(t.end && t.end < limit); });
    return s;
  }

  var state = null;   // ログイン後に startApp() で読み込む
  var user = null;
  var view = { date: todayStr(), anchor: todayStr(), tab: 'today' };
  var lastToday = todayStr();

  function tasksFor(d) {
    return state.tasks.filter(function (t) {
      return t.repeat === 'once' ? t.date === d : (t.date <= d && (!t.end || d < t.end));
    });
  }
  function doneSet(d) { return new Set(state.done[d] || []); }
  function dayStats(d) {
    var list = tasksFor(d), set = doneSet(d), done = 0;
    var r = { high: { done: 0, total: 0 }, mid: { done: 0, total: 0 }, low: { done: 0, total: 0 } };
    list.forEach(function (t) {
      var x = r[t.rank] || r.mid; x.total++;
      if (set.has(t.id)) { x.done++; done++; }
    });
    return { total: list.length, done: done, rank: r, p: list.length ? done / list.length : 0 };
  }
  function carryList() {
    var t = todayStr(), from = addDays(t, -14);
    return state.tasks.filter(function (x) {
      return x.repeat === 'once' && x.date < t && x.date >= from && !doneSet(x.date).has(x.id);
    });
  }
  function hasSamples() { return state.tasks.some(function (t) { return t.sample; }); }

  /* ---------- 同期（Supabase。つながらないときは端末に保存して後で送る） ---------- */
  var CFG = window.KOKENIWA_CONFIG || {};
  var sb = null;
  var sync = { writing: false, dirty: false, timer: null, pending: false };
  var SYNC_TEXT = {
    local: 'この端末に保存しています。',
    connecting: '同期を確認しています…',
    saving: '保存しています…',
    synced: 'Supabaseに保存しています。iPhoneとPCで同じデータを使えます。',
    offline: 'オフラインです。この端末に保存し、つながったら同期します。',
    error: '同期できませんでした。この端末には保存されています。時間をおいて開き直してください。'
  };
  function setSync(k) { var el = document.getElementById('sync-status'); if (el) el.textContent = SYNC_TEXT[k] || SYNC_TEXT.local; }
  function syncFailed() { setSync(navigator.onLine === false ? 'offline' : 'error'); }

  function pullRemote() {
    if (!sb || !user || !state) return Promise.resolve();
    setSync('connecting');
    var uid = user.id;
    return sb.from('app_state').select('state').eq('user_id', uid).maybeSingle().then(function (res) {
      if (res.error) throw res.error;
      if (!user || user.id !== uid) return;           // 途中でログアウトした
      var remote = res.data && res.data.state;
      if (remote && valid(remote) && (remote.updatedAt || 0) > (state.updatedAt || 0)) {
        state = prune(JSON.parse(JSON.stringify(remote)));   // ほかの端末の方が新しい
        delete state.pristine;
        saveLocal(); render(); setSync('synced');
      } else if (!state.pristine && (!remote || (remote.updatedAt || 0) < (state.updatedAt || 0))) {
        sync.pending = true; flushRemote();               // この端末の方が新しい（オフライン中の変更など）
      } else {
        setSync('synced');
      }
    }).catch(syncFailed);
  }

  function scheduleRemote() {
    if (!sb || !user) return;
    sync.pending = true;
    clearTimeout(sync.timer);
    sync.timer = setTimeout(flushRemote, 700);
  }
  // 1つの書き込みが終わるまで次を送らない。途中で変更があれば終わったあとにもう一度送る
  function flushRemote() {
    clearTimeout(sync.timer);
    if (!sb || !user || !state) return Promise.resolve();
    if (sync.writing) { sync.dirty = true; return sync.writing; }
    sync.dirty = false; setSync('saving');
    var body = JSON.parse(JSON.stringify(state)); delete body.pristine;
    sync.writing = sb.from('app_state').upsert({ user_id: user.id, state: body }).then(function (res) {
      if (res.error) throw res.error;
      sync.pending = false; setSync('synced');
    }).catch(syncFailed).then(function () {
      sync.writing = false;
      if (sync.dirty) return flushRemote();
    });
    return sync.writing;
  }
  window.addEventListener('online', function () { if (user && state) { if (sync.pending) flushRemote(); else pullRemote(); } });
  function commit(opts) {
    state.updatedAt = Date.now();
    delete state.pristine;
    saveLocal();
    scheduleRemote();
    render(opts);
  }

  /* ---------- 描画 ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var els = {
    kou: $('kou'), dayTitle: $('day-title'), backToday: $('back-today'), gardenLabel: $('garden-label'),
    pct: $('pct'), count: $('count'), rankMini: $('rank-mini'), gardenMsg: $('garden-msg'),
    stem: $('stem'), leaves: Array.prototype.slice.call(document.querySelectorAll('.leaf')), bud: $('bud'), flower: $('flower'),
    weekLabel: $('week-label'), weekDays: $('week-days'), notices: $('notices'), groups: $('groups'),
    stats: $('stats'), heat: $('heat'), rankRates: $('rank-rates'), wall: $('wall'),
    fabWrap: $('fab-wrap'), toast: $('toast'), toastMsg: $('toast-msg'), toastUndo: $('toast-undo'),
    sheet: $('sheet'), form: $('task-form'), sheetTitle: $('sheet-title'), sheetSub: $('sheet-sub'),
    title: $('task-title'), formError: $('form-error'), sheetDelete: $('sheet-delete'), sheetSubmit: $('sheet-submit'),
    clearSamples2: $('clear-samples-2'), resetConfirm: $('reset-confirm')
  };

  function ring(p, size, stroke) {
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, h = size / 2, len = Math.max(0, Math.min(1, p)) * c;
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<circle class="rbg" cx="' + h + '" cy="' + h + '" r="' + r + '" stroke-width="' + stroke + '"/>' +
      '<circle class="rfg" cx="' + h + '" cy="' + h + '" r="' + r + '" stroke-width="' + stroke + '" stroke-linecap="' + (len > 0 ? 'round' : 'butt') + '"' +
      ' stroke-dasharray="' + len.toFixed(2) + ' ' + c.toFixed(2) + '" transform="rotate(-90 ' + h + ' ' + h + ')"/></svg>';
  }

  function renderHeader() {
    var k = kouFor(view.date), isToday = view.date === todayStr();
    els.kou.innerHTML = esc(k.sekki + '・' + k.phase) + '　<b>' + esc(k.name) + '</b>（' + esc(k.reading) + '）';
    els.kou.title = '七十二候（日付は目安）';
    els.dayTitle.textContent = fmtLong(view.date);
    els.backToday.hidden = isToday;
    els.gardenLabel.textContent = isToday ? '今日の達成度' : 'この日の達成度';
  }

  function renderGarden() {
    var s = dayStats(view.date), p = s.p;
    els.pct.textContent = Math.round(p * 100);
    els.count.textContent = s.total ? s.total + '件中 ' + s.done + '件 完了' : 'タスクはまだありません';
    els.rankMini.innerHTML = RANKS.map(function (r) {
      var x = s.rank[r.id], w = x.total ? (x.done / x.total) * 100 : 0;
      return '<li><span class="badge ' + r.id + '">' + r.short + '</span><span class="bar ' + r.id + '"><span style="width:' + w + '%"></span></span><span>' + x.done + '/' + x.total + '</span></li>';
    }).join('');
    var len = s.total ? Math.min(1, 0.18 + p) : 0.1;
    els.stem.style.strokeDashoffset = String(1 - len);
    els.leaves.forEach(function (lf) { lf.classList.toggle('on', s.done > 0 && p >= Number(lf.getAttribute('data-at'))); });
    els.bud.classList.toggle('on', s.total > 0 && p >= 0.82 && p < 1);
    els.flower.classList.toggle('on', s.total > 0 && p >= 1);
    var msg;
    if (!s.total) msg = 'タスクを追加すると、ここに芽が出ます。';
    else if (!s.done) msg = '種をまきました。ひとつ目から始めましょう。';
    else if (p < 0.5) msg = '芽が伸びはじめました。';
    else if (p < 1) msg = '葉が増えてきました。あと' + (s.total - s.done) + '件で花が咲きます。';
    else msg = '花が咲きました。この日のタスクはすべて完了です。';
    if (p < 1 && s.rank.high.total > s.rank.high.done && s.done > 0) msg += '「高」があと' + (s.rank.high.total - s.rank.high.done) + '件残っています。';
    els.gardenMsg.textContent = msg;
  }

  function renderWeek() {
    var start = weekStart(view.anchor), mid = parse(addDays(start, 3)), t = todayStr();
    els.weekLabel.textContent = mid.getFullYear() + '年' + (mid.getMonth() + 1) + '月';
    var html = '';
    for (var i = 0; i < 7; i++) {
      var d = addDays(start, i), dd = parse(d), s = dayStats(d);
      var cls = 'wd' + (d === view.date ? ' sel' : '') + (d === t ? ' today' : '');
      html += '<button type="button" class="' + cls + '" data-date="' + d + '" aria-pressed="' + (d === view.date) + '" aria-label="' +
        esc(fmtShort(d) + (s.total ? ' ' + s.done + '/' + s.total + '件完了' : ' タスクなし')) + '">' +
        '<span class="w">' + WD[dd.getDay()] + '</span><span class="n">' + dd.getDate() + '</span>' + ring(s.p, 22, 3) + '</button>';
    }
    els.weekDays.innerHTML = html;
  }

  function renderNotices() {
    var html = '';
    if (hasSamples()) {
      html += '<div class="notice"><p>サンプルのタスクと記録を表示しています。</p><button type="button" class="text-btn" data-action="clear-samples">サンプルを消す</button></div>';
    }
    if (view.date === todayStr()) {
      var n = carryList().length;
      if (n) html += '<div class="notice"><p>前の日にやり残したタスクが' + n + '件あります。</p><button type="button" class="text-btn" data-action="carry">今日に移す</button></div>';
    }
    els.notices.innerHTML = html;
  }

  function taskRow(t, done) {
    var meta = '';
    if (t.repeat === 'daily' || t.sample) {
      meta = '<span class="task-meta">' + (t.repeat === 'daily' ? '<span class="pill">毎日</span>' : '') + (t.sample ? '<span class="pill sample">サンプル</span>' : '') + '</span>';
    }
    return '<li class="task ' + esc(t.rank) + (done ? ' done' : '') + '" data-id="' + esc(t.id) + '">' +
      '<button type="button" class="check" aria-pressed="' + done + '" aria-label="「' + esc(t.title) + '」を完了にする"><span class="box">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="14"/></svg></span></button>' +
      '<button type="button" class="task-main"><span class="task-title">' + esc(t.title) + '</span>' + meta + '</button></li>';
  }

  var listTimer = null;
  function renderGroups() {
    var d = view.date, set = doneSet(d), list = tasksFor(d);
    els.groups.innerHTML = RANKS.map(function (r) {
      var items = list.filter(function (t) { return t.rank === r.id; }).sort(function (a, b) {
        return (set.has(a.id) - set.has(b.id)) || ((a.createdAt || 0) - (b.createdAt || 0));
      });
      var dn = items.filter(function (t) { return set.has(t.id); }).length;
      var rows = items.length ? items.map(function (t) { return taskRow(t, set.has(t.id)); }).join('') : '<li class="empty">まだありません</li>';
      return '<section class="group" aria-labelledby="g-' + r.id + '"><div class="group-head"><span class="badge ' + r.id + '">' + r.short + '</span>' +
        '<h2 id="g-' + r.id + '">' + r.label + '</h2><span class="gc">' + (items.length ? dn + ' / ' + items.length : '') + '</span></div>' +
        '<ul class="tasks">' + rows + '</ul></section>';
    }).join('');
  }

  function renderRecords() {
    var t = todayStr(), total = 0, done = 0, full = 0;
    var rk = { high: [0, 0], mid: [0, 0], low: [0, 0] };
    for (var i = 0; i < 30; i++) {
      var s = dayStats(addDays(t, -i));
      total += s.total; done += s.done;
      if (s.total && s.done === s.total) full++;
      RANKS.forEach(function (r) { rk[r.id][0] += s.rank[r.id].done; rk[r.id][1] += s.rank[r.id].total; });
    }
    // 連続達成：今日が未完了でも昨日までの連続は数える
    var streak = 0, d = t, st = dayStats(d);
    if (st.total && st.done === st.total) streak = 1;
    d = addDays(d, -1);
    for (var j = 0; j < 400; j++) {
      var sd = dayStats(d);
      if (sd.total && sd.done === sd.total) { streak++; d = addDays(d, -1); } else break;
    }
    var rate = total ? Math.round(done / total * 100) : 0;
    els.stats.innerHTML =
      '<div class="stat"><div class="v">' + streak + '<small>日</small></div><div class="k">連続達成<span>全部完了した日</span></div></div>' +
      '<div class="stat"><div class="v">' + rate + '<small>%</small></div><div class="k">達成率<span>直近30日</span></div></div>' +
      '<div class="stat"><div class="v">' + full + '<small>日</small></div><div class="k">花が咲いた日<span>直近30日</span></div></div>';

    var start = addDays(weekStart(t), -28), html = '';
    ['月', '火', '水', '木', '金', '土', '日'].forEach(function (w) { html += '<span class="hw">' + w + '</span>'; });
    for (var k = 0; k < 35; k++) {
      var day = addDays(start, k), dd = parse(day), cls = 'hc', label;
      if (day > t) { cls += ' future'; label = fmtShort(day); }
      else {
        var x = dayStats(day);
        if (!x.total) { cls += ' none'; label = fmtShort(day) + ' タスクなし'; }
        else {
          cls += x.p >= 1 ? ' l4' : x.p >= 0.67 ? ' l3' : x.p >= 0.34 ? ' l2' : x.p > 0 ? ' l1' : '';
          label = fmtShort(day) + ' ' + x.done + '/' + x.total + '件完了';
        }
      }
      if (day === t) cls += ' today';
      html += '<button type="button" class="' + cls + '" data-date="' + day + '"' + (day > t ? ' disabled' : '') + ' aria-label="' + esc(label) + '" title="' + esc(label) + '">' + dd.getDate() + '</button>';
    }
    els.heat.innerHTML = html;

    els.rankRates.innerHTML = RANKS.map(function (r) {
      var a = rk[r.id], pc = a[1] ? Math.round(a[0] / a[1] * 100) : 0;
      return '<li><span class="badge ' + r.id + '">' + r.short + '</span><span>' + r.label + '</span><span class="bar ' + r.id + '"><span style="width:' + pc + '%"></span></span>' +
        '<span class="num"><b>' + pc + '%</b>（' + a[0] + '/' + a[1] + '）</span></li>';
    }).join('');
    els.clearSamples2.hidden = !hasSamples();
  }

  function renderWidgets() {
    var t = todayStr(), s = dayStats(t), set = doneSet(t), pc = Math.round(s.p * 100);
    var remaining = tasksFor(t).filter(function (x) { return !set.has(x.id); }).sort(function (a, b) {
      return (RANK_W[b.rank] - RANK_W[a.rank]) || ((a.createdAt || 0) - (b.createdAt || 0));
    });
    var highLeft = s.rank.high.total - s.rank.high.done;
    var foot = !s.total ? 'タスクなし' : !remaining.length ? 'すべて完了' : highLeft ? '「高」があと' + highLeft + '件' : 'のこり' + remaining.length + '件';
    var list = remaining.slice(0, 3).map(function (x) {
      return '<li><span class="dot ' + esc(x.rank) + '"></span><span>' + esc(x.title) + '</span></li>';
    }).join('');
    els.wall.innerHTML =
      '<div class="wcell"><div class="wg wg-s"><div class="wg-top"><span>今日</span><span class="wg-pct">' + pc + '%</span></div>' +
        '<div class="wg-ring">' + ring(s.p, 70, 8) + '<span>' + s.done + '/' + s.total + '</span></div>' +
        '<div class="wg-foot">' + esc(foot) + '</div></div><span class="wcap">ホーム画面・小</span></div>' +
      '<div class="wcell"><div class="wg-lock">' + ring(s.p, 62, 5) + '<span>' + s.done + '/' + s.total + '</span></div><span class="wcap">ロック画面</span></div>' +
      '<div class="wcell full"><div class="wg wg-m"><div class="wg-m-ring">' + ring(s.p, 86, 9) + '<span>' + pc + '%</span></div>' +
        '<div class="wg-m-right"><p class="wg-date">' + esc(fmtShort(t)) + '</p>' +
        (list ? '<ul class="wg-list">' + list + '</ul>' : '<p class="wg-done">' + (s.total ? 'すべて完了しました。' : 'タスクはまだありません。') + '</p>') +
        '</div></div><span class="wcap">ホーム画面・中</span></div>';
  }

  function render(opts) {
    if (!state) return;
    opts = opts || {};
    renderHeader(); renderGarden(); renderWeek(); renderNotices();
    clearTimeout(listTimer);
    if (opts.deferList) listTimer = setTimeout(renderGroups, 420); else renderGroups();
    renderRecords(); renderWidgets();
  }

  /* ---------- 操作 ---------- */
  function setDate(d) { view.date = d; view.anchor = d; render(); }

  function toggleDone(id) {
    var d = view.date, arr = (state.done[d] || []).slice(), i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1); else arr.push(id);
    if (arr.length) state.done[d] = arr; else delete state.done[d];
    commit({ deferList: true });
  }

  function removeIdsFromDone(ids, fromDate) {
    Object.keys(state.done).forEach(function (k) {
      if (fromDate && k < fromDate) return;
      var a = state.done[k].filter(function (x) { return ids.indexOf(x) < 0; });
      if (a.length) state.done[k] = a; else delete state.done[k];
    });
  }

  var toastTimer = null, undoSnap = null;
  function toast(msg, snap) {
    els.toastMsg.textContent = msg;
    undoSnap = snap || null;
    els.toastUndo.hidden = !snap;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; undoSnap = null; }, 5000);
  }
  els.toastUndo.addEventListener('click', function () {
    if (!undoSnap) return;
    state = JSON.parse(undoSnap); undoSnap = null; els.toast.hidden = true;
    commit();
  });

  function clearSamples() {
    var snap = JSON.stringify(state);
    var ids = state.tasks.filter(function (t) { return t.sample; }).map(function (t) { return t.id; });
    state.tasks = state.tasks.filter(function (t) { return !t.sample; });
    removeIdsFromDone(ids);
    commit();
    toast('サンプルを消しました', snap);
  }
  function carryOver() {
    var snap = JSON.stringify(state), list = carryList(), t = todayStr();
    list.forEach(function (x) { x.date = t; });
    commit();
    toast(list.length + '件を今日に移しました', snap);
  }

  /* シート（追加・編集） */
  var editingId = null, lastFocus = null;
  function setRadio(name, value) { var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]'); if (el) el.checked = true; }
  function getRadio(name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; }

  function openSheet(id) {
    lastFocus = document.activeElement;
    var t = id ? state.tasks.find(function (x) { return x.id === id; }) : null;
    editingId = t ? t.id : null;
    els.formError.hidden = true;
    els.title.value = t ? t.title : '';
    setRadio('rank', t ? t.rank : 'mid');
    setRadio('repeat', t ? t.repeat : 'once');
    els.sheetTitle.textContent = t ? 'タスクを編集' : '新しいタスク';
    els.sheetSubmit.textContent = t ? '保存する' : '追加する';
    els.sheetDelete.hidden = !t;
    if (t) {
      els.sheetDelete.textContent = t.repeat === 'daily' ? 'この日からやめる' : '削除する';
      els.sheetSub.textContent = t.repeat === 'daily' ? fmtShort(t.date) + 'から毎日' : fmtShort(t.date) + 'のタスク';
    } else {
      els.sheetSub.textContent = fmtShort(view.date) + 'に追加します';
    }
    els.sheet.hidden = false;
    setTimeout(function () { els.title.focus(); }, 60);
  }
  function closeSheet() {
    els.sheet.hidden = true; editingId = null;
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  els.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var title = els.title.value.trim();
    if (!title) { els.formError.hidden = false; els.title.focus(); return; }
    var rank = getRadio('rank') || 'mid', repeat = getRadio('repeat') || 'once';
    if (editingId) {
      var t = state.tasks.find(function (x) { return x.id === editingId; });
      if (t) {
        t.title = title; t.rank = rank;
        if (t.repeat !== repeat) {
          t.repeat = repeat; t.date = view.date; delete t.end;
        }
        delete t.sample;
      }
    } else {
      state.tasks.push({ id: newId(), title: title, rank: rank, repeat: repeat, date: view.date, createdAt: Date.now() });
    }
    closeSheet();
    commit();
  });
  els.sheetDelete.addEventListener('click', function () {
    var t = state.tasks.find(function (x) { return x.id === editingId; });
    if (!t) return closeSheet();
    var snap = JSON.stringify(state);
    if (t.repeat === 'daily' && view.date > t.date) {
      t.end = view.date;                       // 過去の記録は残し、この日以降は表示しない
      removeIdsFromDone([t.id], view.date);
    } else {
      state.tasks = state.tasks.filter(function (x) { return x.id !== t.id; });
      removeIdsFromDone([t.id]);
    }
    closeSheet();
    commit();
    toast('「' + t.title + '」を削除しました', snap);
  });
  $('sheet-cancel').addEventListener('click', closeSheet);
  els.sheet.addEventListener('click', function (e) { if (e.target === els.sheet) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !els.sheet.hidden) closeSheet(); });
  els.title.addEventListener('input', function () { if (els.title.value.trim()) els.formError.hidden = true; });

  /* 一覧・週・通知 */
  els.groups.addEventListener('click', function (e) {
    var row = e.target.closest('.task'); if (!row) return;
    var id = row.getAttribute('data-id');
    if (e.target.closest('.check')) {
      var nowDone = !row.classList.contains('done');
      row.classList.toggle('done', nowDone);
      row.querySelector('.check').setAttribute('aria-pressed', String(nowDone));
      toggleDone(id);
    } else if (e.target.closest('.task-main')) {
      openSheet(id);
    }
  });
  els.weekDays.addEventListener('click', function (e) {
    var b = e.target.closest('[data-date]'); if (!b) return;
    view.date = b.getAttribute('data-date'); render();
  });
  $('week-prev').addEventListener('click', function () { view.anchor = addDays(view.anchor, -7); renderWeek(); });
  $('week-next').addEventListener('click', function () { view.anchor = addDays(view.anchor, 7); renderWeek(); });
  els.backToday.addEventListener('click', function () { setDate(todayStr()); });
  els.notices.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]'); if (!b) return;
    var a = b.getAttribute('data-action');
    if (a === 'clear-samples') clearSamples();
    if (a === 'carry') carryOver();
  });
  $('fab').addEventListener('click', function () { openSheet(null); });

  /* 記録 */
  els.heat.addEventListener('click', function (e) {
    var b = e.target.closest('[data-date]'); if (!b || b.disabled) return;
    view.date = b.getAttribute('data-date'); view.anchor = view.date;
    setTab('today');
  });
  els.clearSamples2.addEventListener('click', clearSamples);
  $('reset').addEventListener('click', function () { els.resetConfirm.hidden = false; });
  $('reset-cancel').addEventListener('click', function () { els.resetConfirm.hidden = true; });
  $('reset-go').addEventListener('click', function () {
    var snap = JSON.stringify(state);
    state = emptyState();
    els.resetConfirm.hidden = true;
    commit();
    toast('すべてのデータを削除しました', snap);
  });

  /* タブ */
  function setTab(name) {
    view.tab = name;
    ['today', 'records', 'widgets'].forEach(function (n) {
      $('panel-' + n).hidden = n !== name;
      $('tab-' + n).setAttribute('aria-selected', String(n === name));
    });
    els.fabWrap.hidden = name !== 'today';
    els.resetConfirm.hidden = true;
    render();
    if (name === 'widgets') loadTokens();
    window.scrollTo(0, 0);
  }
  document.querySelector('.tabbar').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (b) setTab(b.getAttribute('data-tab'));
  });

  /* 日付が変わったら「今日」を進める（書き込みはしない） */
  function checkDayChange() {
    if (!state) return;
    var t = todayStr();
    if (t === lastToday) return;
    if (view.date === lastToday) { view.date = t; view.anchor = t; }
    lastToday = t; render();
  }
  // アプリに戻ってきたら、日付の更新と、ほかの端末での変更の取り込みを行う
  document.addEventListener('visibilitychange', function () {
    if (document.hidden || !state) return;
    checkDayChange();
    if (sync.pending) flushRemote(); else pullRemote();
  });
  setInterval(checkDayChange, 60000);

  /* ---------- ログインと画面の切り替え ---------- */
  var auth = {
    login: $('panel-login'), setup: $('panel-setup'), setupMsg: $('setup-msg'), tabbar: document.querySelector('.tabbar'),
    form: $('login-form'), email: $('login-email'), password: $('login-password'), error: $('login-error'), submit: $('login-submit'),
    account: $('account')
  };

  function hideMainUI() {
    ['today', 'records', 'widgets'].forEach(function (n) { $('panel-' + n).hidden = true; });
    auth.tabbar.hidden = true; els.fabWrap.hidden = true; els.toast.hidden = true;
    if (!els.sheet.hidden) closeSheet();
  }
  function showSetup(msg) {
    hideMainUI(); auth.login.hidden = true;
    auth.setupMsg.textContent = msg; auth.setup.hidden = false;
  }
  function showLogin() {
    clearTimeout(sync.timer); clearTimeout(listTimer);
    user = null; state = null; sync.pending = false;
    hideMainUI(); auth.setup.hidden = true;
    auth.error.hidden = true; auth.login.hidden = false;
    resetTokenUI();
  }
  function startApp(u) {
    user = u;
    state = prune(loadLocal() || sampleState());
    view.date = todayStr(); view.anchor = view.date; lastToday = view.date;
    auth.login.hidden = true; auth.setup.hidden = true; auth.tabbar.hidden = false;
    auth.account.textContent = u.email ? u.email + ' でログイン中' : '';
    setTab(view.tab || 'today');
    pullRemote();
  }

  function jwtRole(k) {
    try {
      var p = k.split('.'); if (p.length !== 3) return '';
      return JSON.parse(atob(p[1].replace(/-/g, '+').replace(/_/g, '/'))).role || '';
    } catch (e) { return ''; }
  }
  function configProblem(url, key) {
    if (!url || /YOUR-PROJECT/i.test(url) || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
      return 'config.js の SUPABASE_URL を、SupabaseプロジェクトのURL（https://〜.supabase.co）に書き換えてください。';
    }
    if (/^sb_secret_/.test(key) || jwtRole(key) === 'service_role') {
      return '危険：config.js に秘密キー（secret / service_role）が入っています。公開されると、誰でもデータベースを操作できてしまいます。' +
        'Supabaseの管理画面でこのキーを無効化して作り直し、config.js には公開用キー（sb_publishable_〜）を入れてください。';
    }
    if (!key || /YOUR-PUBLISHABLE-KEY/i.test(key)) {
      return 'config.js の SUPABASE_KEY に、Supabaseの公開用キー（sb_publishable_〜）を入れてください。';
    }
    return '';
  }

  function boot() {
    var url = String(CFG.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    var key = String(CFG.SUPABASE_KEY || '').trim();
    var problem = configProblem(url, key);
    if (problem) return showSetup(problem);
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      return showSetup('Supabaseのライブラリ（vendor/supabase.js）を読み込めませんでした。ファイルがアップロードされているか確認してください。');
    }
    sb = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'kokeniwa-auth' }
    });
    sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT' && user) showLogin();
    });
    sb.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (s && s.user) startApp(s.user); else showLogin();
    }).catch(function () { showLogin(); });
  }

  auth.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = auth.email.value.trim(), pw = auth.password.value;
    function fail(msg) { auth.error.textContent = msg; auth.error.hidden = false; }
    if (!email || !pw) return fail('メールアドレスとパスワードを入力してください。');
    auth.submit.disabled = true; auth.submit.textContent = 'ログインしています…'; auth.error.hidden = true;
    sb.auth.signInWithPassword({ email: email, password: pw }).then(function (r) {
      if (r.error) throw r.error;
      auth.password.value = '';
      startApp(r.data.user);
    }).catch(function (err) {
      var m = (err && err.message) || '';
      if (navigator.onLine === false) fail('オフラインです。ネットにつないでから、もう一度ログインしてください。');
      else if (/invalid login credentials/i.test(m)) fail('メールアドレスかパスワードが違います。');
      else if (/email not confirmed/i.test(m)) fail('メールアドレスの確認が済んでいません。Supabaseでユーザーを作るときに「Auto Confirm User」をオンにしてください。');
      else fail('ログインできませんでした。時間をおいて、もう一度試してください。');
    }).then(function () { auth.submit.disabled = false; auth.submit.textContent = 'ログイン'; });
  });

  // ログアウト：未送信の変更を送ってから、この端末のキャッシュを消す（共用PCでも残らないように）
  $('logout').addEventListener('click', function () {
    var key = lsKey(), btn = this;
    btn.disabled = true;
    (sync.pending ? flushRemote() : Promise.resolve()).then(function () {
      return sb.auth.signOut();
    }).catch(function () { /* ネットがなくてもログアウトは進める */ }).then(function () {
      try { localStorage.removeItem(key); } catch (e) { /* なし */ }
      btn.disabled = false;
      showLogin();
    });
  });

  /* ---------- ウィジェット用キー ---------- */
  var tok = { issue: $('wkey-issue'), box: $('wkey-new'), value: $('wkey-value'), copy: $('wkey-copy'), list: $('wkey-list'), msg: $('wkey-msg') };

  function b64url(bytes) {
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function sha256hex(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function fmtDateTime(iso) {
    if (!iso) return 'まだ使われていません';
    var d = new Date(iso);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function tokenMsg(text) { tok.msg.textContent = text || ''; tok.msg.hidden = !text; }
  function resetTokenUI() { tok.box.hidden = true; tok.value.value = ''; tok.list.innerHTML = ''; tokenMsg(''); }

  function loadTokens() {
    if (!sb || !user) return;
    sb.from('widget_tokens').select('id,label,created_at,last_used_at').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) throw r.error;
      var rows = r.data || [];
      tok.list.innerHTML = rows.length ? rows.map(function (x) {
        return '<li><div class="wkey-info"><b>' + esc(x.label) + '</b><span>発行 ' + esc(fmtDateTime(x.created_at)) + '・最終利用 ' + esc(fmtDateTime(x.last_used_at)) + '</span></div>' +
          '<button type="button" class="btn ghost small" data-revoke="' + esc(x.id) + '">取り消す</button></li>';
      }).join('') : '<li class="wkey-empty">発行済みのキーはありません。</li>';
    }).catch(function () { tokenMsg('キーの一覧を読み込めませんでした。ネット接続を確認してください。'); });
  }

  tok.issue.addEventListener('click', function () {
    if (!sb || !user) return;
    var raw = new Uint8Array(32); crypto.getRandomValues(raw);
    var token = 'kkn_' + b64url(raw);
    tok.issue.disabled = true; tokenMsg('');
    sha256hex(token).then(function (hash) {
      return sb.from('widget_tokens').insert({ token_hash: hash, label: 'iPhone ' + fmtShort(todayStr()) });
    }).then(function (r) {
      if (r.error) throw r.error;
      tok.value.value = token; tok.box.hidden = false;
      loadTokens();
    }).catch(function () {
      tokenMsg('キーを発行できませんでした。schema.sql を実行済みか、ネットにつながっているか確認してください。');
    }).then(function () { tok.issue.disabled = false; });
  });

  tok.copy.addEventListener('click', function () {
    var v = tok.value.value; if (!v) return;
    function selectIt() { tok.value.focus(); tok.value.select(); tok.value.setSelectionRange(0, v.length); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(v).then(function () { toast('キーをコピーしました'); }).catch(function () { selectIt(); toast('長押しでコピーしてください'); });
    } else { selectIt(); toast('長押しでコピーしてください'); }
  });

  // 取り消しは2回タップで実行（1回目で確認表示）
  tok.list.addEventListener('click', function (e) {
    var b = e.target.closest('[data-revoke]'); if (!b) return;
    if (b.getAttribute('data-armed') !== '1') {
      b.setAttribute('data-armed', '1'); b.textContent = 'もう一度押すと無効化'; b.classList.add('warn');
      return;
    }
    b.disabled = true;
    sb.from('widget_tokens').delete().eq('id', b.getAttribute('data-revoke')).then(function (r) {
      if (r.error) throw r.error;
      toast('キーを取り消しました。このキーのウィジェットは表示されなくなります');
      loadTokens();
    }).catch(function () { b.disabled = false; tokenMsg('取り消せませんでした。ネット接続を確認してください。'); });
  });

  boot();
})();
