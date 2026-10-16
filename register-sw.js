// オフラインでも開けるように、Service Worker を登録する（https か localhost のときだけ）
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* 登録できなくてもアプリは動く */ });
  });
}
