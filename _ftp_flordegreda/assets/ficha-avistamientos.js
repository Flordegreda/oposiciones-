(function () {
  'use strict';

  var cfg = window.fdgCampoFichaAvistamientos;
  if (!cfg || !cfg.html) return;

  function insertSection() {
    if (document.getElementById('fdg-avistamientos-campo')) return;

    var html = cfg.html;
    var compartir = document.getElementById('fdg-compartir-ficha');
    var galeria = document.querySelector('.fdg-galeria');
    var anchor = compartir || galeria ||
      document.querySelector('.fdg-mapa') ||
      document.querySelector('.fdg-ficha-wrap');

    if (!anchor || !anchor.parentNode) return;

    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var section = wrap.firstElementChild;
    if (!section) return;

    if (compartir || (galeria && anchor === galeria)) {
      anchor.parentNode.insertBefore(section, anchor.nextSibling);
    } else {
      anchor.parentNode.insertBefore(section, anchor);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertSection);
  } else {
    insertSection();
  }
})();
