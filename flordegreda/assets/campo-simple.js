(function () {
  'use strict';

  var cfg = window.fdgCampo || {};
  var liveNonce = '';

  function $(id) {
    return document.getElementById(id);
  }

  function ajaxUrl() {
    return cfg.ajax || window.FDG_AJAX || '/wp-admin/admin-ajax.php';
  }

  /** Nonce fresco del plugin (no el del HTML cacheado por LiteSpeed). */
  function readPageNonce() {
    if (cfg.nonce) {
      return cfg.nonce;
    }
    var input = document.querySelector('#fdg-rapida-form input[name="fdg_nonce"]');
    if (input && input.value) {
      return input.value;
    }
    if (window.FDG_NONCE) {
      return window.FDG_NONCE;
    }
    return '';
  }

  function applyNonce(nonce) {
    if (!nonce) return;
    liveNonce = nonce;
    window.FDG_NONCE = nonce;
    cfg.nonce = nonce;
    document.querySelectorAll('input[name="fdg_nonce"]').forEach(function (el) {
      el.value = nonce;
    });
  }

  function fetchFreshNonce() {
    var body = new URLSearchParams();
    body.set('action', 'fdg_campo_nonce');
    return fetch(ajaxUrl(), {
      method: 'POST',
      body: body,
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success && data.data && data.data.nonce) {
          applyNonce(data.data.nonce);
          return data.data.nonce;
        }
        throw new Error('No se pudo renovar la sesión');
      });
  }

  function setFechaHora() {
    var now = new Date();
    var f = $('rapida-fecha');
    var h = $('rapida-hora');
    var fecha = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var hora = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    if (f) f.value = fecha;
    if (h) h.value = hora;
  }

  function toast(msg, ok) {
    var box = $('fdg-campo-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'fdg-campo-toast';
      box.className = 'fdg-campo-toast';
      document.body.appendChild(box);
    }
    box.textContent = msg;
    box.className = 'fdg-campo-toast fdg-campo-toast--' + (ok ? 'ok' : 'err');
    box.style.display = 'block';
    clearTimeout(box._t);
    box._t = setTimeout(function () { box.style.display = 'none'; }, ok ? 5000 : 8000);
  }

  function showInline(msg, ok) {
    var res = $('rapida-resultado');
    if (res) {
      res.textContent = msg;
      res.className = 'fdg-campo__resultado fdg-campo__resultado--' + (ok ? 'ok' : 'error');
      res.style.display = 'block';
    }
    toast(msg, ok);
  }

  /** Quita listeners duplicados del tema (enviarForm). */
  function resetRapidaForm() {
    var form = $('fdg-rapida-form');
    if (!form || !form.parentNode) return null;
    var clone = form.cloneNode(true);
    form.parentNode.replaceChild(clone, form);
    return clone;
  }

  function injectSitio(form) {
    var src = document.querySelector('#tab-registrar select[name="habitat"]');
    if (!form || !src || $('rapida-habitat')) return;

    var wrap = document.createElement('div');
    wrap.className = 'fdg-campo__field';
    var label = document.createElement('label');
    label.setAttribute('for', 'rapida-habitat');
    label.textContent = 'Sitio';
    var sel = src.cloneNode(true);
    sel.id = 'rapida-habitat';
    sel.name = 'habitat';
    wrap.appendChild(label);
    wrap.appendChild(sel);

    var coordsWrap = $('rapida-coords') && $('rapida-coords').closest('.fdg-campo__coords-wrap');
    if (coordsWrap && coordsWrap.parentElement) {
      coordsWrap.parentElement.insertBefore(wrap, coordsWrap);
    } else {
      var submit = form.querySelector('[type="submit"]');
      form.insertBefore(wrap, submit || null);
    }
  }

  function injectHint() {
    var section = document.querySelector('#tab-foto-rapida .fdg-campo__section');
    if (!section || $('fdg-campo-hint')) return;

    var n = parseInt(cfg.pendientes, 10) || 0;
    var hint = document.createElement('div');
    hint.id = 'fdg-campo-hint';
    hint.className = 'fdg-campo-simple-hint';
    hint.innerHTML = 'Guarda y listo. Identifica en casa desde <strong>Escritorio → Campo</strong>' +
      (n > 0 ? ' (' + n + ' pendiente' + (n === 1 ? '' : 's') + ').' : '.');

    var h2 = section.querySelector('h2');
    if (h2) {
      h2.textContent = 'Nueva captura';
      section.insertBefore(hint, h2.nextSibling);
    }

    var desc = section.querySelector('.fdg-campo__section-desc');
    if (desc) {
      desc.textContent = 'Foto, GPS, sitio y nota. Fecha y hora automáticas.';
      desc.classList.add('fdg-campo-simple-desc');
    }

    var submit = $('btn-rapida-submit');
    if (submit) submit.textContent = 'Guardar captura';
  }

  function showOnlyCaptura() {
    document.querySelectorAll('.fdg-campo__panel').forEach(function (p) {
      if (p.id !== 'tab-foto-rapida') p.style.display = 'none';
    });
    var rapida = $('tab-foto-rapida');
    if (rapida) rapida.style.display = 'block';
  }

  function parseCoordsValue(val) {
    if (!val || typeof val !== 'string') return null;
    var m = val.trim().match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (!m) return null;
    var lat = parseFloat(m[1]);
    var lng = parseFloat(m[2]);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat: lat, lng: lng };
  }

  function hasValidCoords() {
    var input = $('rapida-coords');
    return input && !!parseCoordsValue(input.value);
  }

  function setGpsStatus(msg, ok) {
    var st = $('rapida-gps-status');
    if (!st) return;
    st.textContent = msg || '';
    st.className = 'fdg-campo__gps-status' + (ok ? ' fdg-campo__gps-status--ok' : (msg ? ' fdg-campo__gps-status--warn' : ''));
  }

  function autoGps() {
    var input = $('rapida-coords');
    if (!input) return;
    if (input.value && hasValidCoords()) {
      setGpsStatus('GPS listo.', true);
      return;
    }
    if (!navigator.geolocation) {
      setGpsStatus('Sin GPS en este navegador.', false);
      return;
    }
    setGpsStatus('Obteniendo ubicación…', true);
    if (typeof obtenerGPS === 'function') {
      obtenerGPS('rapida-coords', 'rapida-gps-status');
      setTimeout(function () {
        if (!hasValidCoords()) {
          setGpsStatus('Sin GPS. No saldrá en el mapa.', false);
        } else {
          setGpsStatus('GPS listo.', true);
        }
      }, 8000);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        input.value = pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6);
        setGpsStatus('GPS listo.', true);
      },
      function () {
        setGpsStatus('Sin GPS. No saldrá en el mapa.', false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function bindCoordsWatch() {
    var input = $('rapida-coords');
    if (!input || input.dataset.fdgGpsWatch === '1') return;
    input.dataset.fdgGpsWatch = '1';
    input.addEventListener('input', function () {
      if (hasValidCoords()) {
        setGpsStatus('GPS listo.', true);
      } else if (input.value.trim()) {
        setGpsStatus('Coordenadas no válidas.', false);
      } else {
        setGpsStatus('', false);
      }
    });
  }

  function bindPhotoPreview() {
    var input = $('rapida-foto');
    var preview = $('rapida-foto-preview');
    if (!input || input.dataset.fdgPreview === '1') return;
    input.dataset.fdgPreview = '1';
    input.addEventListener('change', function () {
      if (preview) preview.innerHTML = '';
      if (!this.files || !this.files[0]) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        if (!preview) return;
        var img = document.createElement('img');
        img.src = ev.target.result;
        preview.appendChild(img);
      };
      reader.readAsDataURL(this.files[0]);
    });
  }

  function resetFormUi(form) {
    form.querySelectorAll('.fdg-campo__foto-preview').forEach(function (p) { p.innerHTML = ''; });
    var st = $('rapida-gps-status');
    if (st) st.textContent = '';
    setFechaHora();
  }

  function postCapture(form, retry) {
    setFechaHora();
    applyNonce(liveNonce);

    var formData = new FormData(form);
    formData.set('action', 'fdg_guardar_avistamiento');
    formData.set('fdg_nonce', liveNonce);
    formData.set('sin_identificar', '1');

    return fetch(ajaxUrl(), {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('Respuesta no válida del servidor. Recarga /campo/.');
        }

        if (!data.success) {
          var errMsg = (typeof data.data === 'string' ? data.data : 'Error al guardar');
          var retryable = /nonce|sesi/i.test(errMsg);
          if (retryable && !retry) {
            return fetchFreshNonce().then(function () {
              return postCapture(form, true);
            });
          }
          throw new Error(errMsg);
        }
        return data;
      });
  }

  function bindSubmit(form) {
    var btn = $('btn-rapida-submit');
    if (!form || form.dataset.fdgBound === '1') return;
    form.dataset.fdgBound = '1';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      var foto = $('rapida-foto');
      if (foto && (!foto.files || !foto.files.length)) {
        showInline('Añade una foto antes de guardar.', false);
        foto.focus();
        return;
      }

      if (!hasValidCoords()) {
        var okSinGps = window.confirm(
          'No hay GPS en esta captura.\n\nSe guardará igual, pero no aparecerá en el mapa hasta que tenga coordenadas.\n\n¿Continuar?'
        );
        if (!okSinGps) {
          var coordsInput = $('rapida-coords');
          if (coordsInput) coordsInput.focus();
          autoGps();
          return;
        }
      }

      var textoOrig = btn ? btn.textContent : 'Guardar';
      if (btn) {
        btn.textContent = 'Guardando…';
        btn.disabled = true;
      }

      postCapture(form, false)
        .then(function (data) {
          var titulo = (data.data && data.data.especie) ? data.data.especie : 'Captura guardada';
          showInline('✓ Guardado: ' + titulo, true);
          if (data.data && data.data.tiene_gps === false) {
            toast('Sin GPS: esta captura no saldrá en el mapa.', false);
          }
          form.reset();
          resetFormUi(form);
          cfg.pendientes = (parseInt(cfg.pendientes, 10) || 0) + 1;
          var hint = $('fdg-campo-hint');
          if (hint) {
            var n = cfg.pendientes;
            hint.innerHTML = 'Guarda y listo. Identifica en casa desde <strong>Escritorio → Campo</strong>' +
              (n > 0 ? ' (' + n + ' pendiente' + (n === 1 ? '' : 's') + ').' : '.');
          }
        })
        .catch(function (err) {
          showInline(err.message || 'Sin conexión. Inténtalo de nuevo.', false);
        })
        .finally(function () {
          if (btn) {
            btn.textContent = textoOrig;
            btn.disabled = false;
          }
        });
    }, true);
  }

  function prefillHabitatFromUrl() {
    var sel = $('rapida-habitat');
    if (!sel) return;
    var params = new URLSearchParams(window.location.search);
    var habitat = params.get('habitat');
    if (!habitat) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === habitat || sel.options[i].text === habitat) {
        sel.value = sel.options[i].value;
        break;
      }
    }
  }

  function initCampo() {
    if (!document.querySelector('.fdg-campo')) return;

    showOnlyCaptura();
    var form = resetRapidaForm();
    if (!form) return;

    applyNonce(readPageNonce());
    setFechaHora();
    injectSitio(form);
    prefillHabitatFromUrl();
    injectHint();
    bindPhotoPreview();
    bindCoordsWatch();
    bindSubmit(form);

    fetchFreshNonce().catch(function () {
      /* Si falla, usamos el nonce inline; el retry al guardar lo intentará otra vez. */
    }).finally(function () {
      setTimeout(autoGps, 300);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCampo);
  } else {
    initCampo();
  }
})();
