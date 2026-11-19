/*
 * Red de seguridad del arranque. Si la app no llega a dibujarse (código que no se pudo bajar, o una copia guardada
 * que no corresponde a la versión publicada), en vez de dejar la pantalla en blanco: primero se repara sola una vez
 * (se borra el modo sin conexión guardado y se recarga) y, si sigue sin abrir, se muestra un aviso con un botón.
 * Nunca toca los datos del usuario (temas, progreso, ajustes): sólo el service worker y su caché.
 */
(function () {
  var FLAG = 'hj:reparado';
  var fallo = '';
  function vacio() {
    var r = document.getElementById('root');
    return !r || r.childElementCount === 0;
  }
  function reciente() {
    try {
      var t = Number(sessionStorage.getItem(FLAG) || 0);
      return t > 0 && Date.now() - t < 120000;
    } catch (e) {
      return false;
    }
  }
  function reparar() {
    try {
      sessionStorage.setItem(FLAG, String(Date.now()));
    } catch (e) {
      /* sin almacenamiento de sesión */
    }
    var tareas = [];
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      tareas.push(
        navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }),
      );
    }
    if (window.caches && caches.keys) {
      tareas.push(
        caches.keys().then(function (ks) {
          return Promise.all(ks.filter(function (k) { return k.indexOf('harmonyjazz-') === 0; }).map(function (k) { return caches.delete(k); }));
        }),
      );
    }
    var recargar = function () { location.reload(); };
    Promise.all(tareas).then(recargar, recargar);
  }
  function aviso() {
    if (document.getElementById('hj-arranque')) return;
    var d = document.createElement('div');
    d.id = 'hj-arranque';
    d.setAttribute('role', 'alert');
    d.style.cssText = 'font:16px/1.5 system-ui,sans-serif;padding:24px;max-width:32em;margin:0 auto;color:#2b2118';
    var h = document.createElement('h1');
    h.textContent = 'No se pudo abrir la app';
    h.style.cssText = 'font-size:1.3em;margin:0 0 .5em';
    var p = document.createElement('p');
    p.textContent = 'Seguramente quedó guardada una versión a medias. Tocá «Reparar»: se borra la copia guardada para el modo sin conexión y se vuelve a bajar. Tus temas, progreso y ajustes no se tocan.';
    var b = document.createElement('button');
    b.textContent = 'Reparar';
    b.style.cssText = 'font:inherit;padding:.7em 1.4em;min-height:44px';
    b.onclick = function () { reparar(); };
    d.appendChild(h);
    d.appendChild(p);
    d.appendChild(b);
    if (fallo) {
      var s = document.createElement('p');
      s.textContent = 'Detalle: ' + fallo;
      s.style.cssText = 'font-size:.8em;opacity:.7;word-break:break-word';
      d.appendChild(s);
    }
    document.body.appendChild(d);
  }
  function revisar() {
    if (!vacio()) return;
    if (reciente()) aviso();
    else reparar();
  }
  // un script que no se pudo bajar no sube por window: se lo escucha en la captura
  window.addEventListener(
    'error',
    function (e) {
      var t = e.target;
      if (t && t !== window && t.tagName === 'SCRIPT') {
        fallo = 'no se pudo bajar ' + (t.src || 'un archivo');
        setTimeout(revisar, 300);
      } else if (e.message) {
        fallo = e.message;
      }
    },
    true,
  );
  window.addEventListener('unhandledrejection', function (e) {
    fallo = String((e.reason && e.reason.message) || e.reason || '');
  });
  setTimeout(revisar, 8000);
})();
