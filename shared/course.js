// Alonzo course glue — wires "Try it in the Lab" links to the webapp.
//
// A tutorial can be opened three ways, and the Lab lives at a different place in each:
//   1. Published build:  https://host/course/track1-engine/01_term_ast/tutorial.html  → app at https://host/
//   2. Vite dev server:  http://localhost:5173/course/...                              → app at http://localhost:5173/
//   3. Straight from disk (file://)                                                    → app must be running: npm run dev
// Case 3 cannot load the app from disk: Vite's ES-module bundle is blocked by browsers on file:// URLs.
(function () {
  var DEV_URL = 'http://localhost:5173/';
  var base;
  if (location.protocol === 'file:') {
    base = DEV_URL;
  } else {
    var i = location.pathname.indexOf('/course/');
    base = i >= 0 ? location.origin + location.pathname.slice(0, i + 1) : location.origin + '/';
  }
  document.querySelectorAll('a.lab-link').forEach(function (a) {
    var lab = a.getAttribute('data-lab');
    var term = a.getAttribute('data-term');
    var ex = a.getAttribute('data-ex');
    var q = [];
    if (term) q.push('term=' + encodeURIComponent(term));
    if (ex) q.push('ex=' + encodeURIComponent(ex));
    a.href = base + '#/lab/' + lab + (q.length ? '?' + q.join('&') : '');
    a.target = '_blank';
    a.rel = 'noopener';
  });
  // Markdown links (DECISIONS.md, GLOSSARY.md, ROADMAP.md …) open in the app's rendered viewer (#/doc/…)
  // when served over http; opened from disk they stay plain file links.
  if (location.protocol !== 'file:') {
    var courseRoot = location.pathname.indexOf('/course/');
    document.querySelectorAll('a[href$=".md"]').forEach(function (a) {
      var abs = new URL(a.getAttribute('href'), location.href).pathname;
      var i = abs.indexOf('/course/');
      if (courseRoot < 0 || i < 0) return;
      a.href = base + '#/doc/' + decodeURIComponent(abs.slice(i + '/course/'.length));
    });
  }
  if (location.protocol === 'file:') {
    document.querySelectorAll('.lab-note').forEach(function (n) {
      n.textContent = 'You opened this page from disk, so Lab links point at the dev server. Start it first: cd alonzo/webapp && npm install && npm run dev';
    });
  }
})();
