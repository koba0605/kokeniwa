// 表示テーマ（自動／ライト／ダーク）を、画面が描かれる前に適用する
// 選んだテーマはこの端末の localStorage にだけ保存する
(function () {
  var KEY = 'kokeniwa:theme';
  var BG = { light: '#F3F5F1', dark: '#232B26' };

  function read() {
    try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; }
  }
  function apply(mode) {
    var root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
    // スマホ上部のバーの色も合わせる（自動のときは元の設定に戻す）
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var m = metas[i];
      if (!m.hasAttribute('data-media')) m.setAttribute('data-media', m.getAttribute('media') || '');
      if (mode === 'auto') m.setAttribute('media', m.getAttribute('data-media'));
      else { m.removeAttribute('media'); m.setAttribute('content', BG[mode]); }
      if (mode === 'auto') m.setAttribute('content', /dark/.test(m.getAttribute('data-media')) ? BG.dark : BG.light);
    }
  }
  function set(mode) {
    try { if (mode === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch (e) { /* 保存できなくても今回は反映する */ }
    apply(mode);
  }

  apply(read());
  window.KokeniwaTheme = { get: read, set: set, apply: apply };
})();
