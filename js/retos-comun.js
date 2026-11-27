// ═══════════════════════════════════════════════════════════════════
//  RETOS Y ÁLBUM COMUNES (v1.1, 25 de noviembre de 2026)
//  Esqueleto de retos.js: lista con anillo de progreso, álbum en miniatura y
//  en tabla, sello nuevo, guardado en localStorage con clave propia y
//  «Borrar lo conseguido». Se copia tal cual; cada escena solo declara sus
//  retos y su álbum. Requiere js/escena-comun.js (crearAlmacen, iniciarPanelRetos).
//
//  const R = crearRetos({
//      clave: 'simulaciencia-NOMBRE-retos',
//      retos: [{ id, txt, n?, pista? }],           // n > 1: reto con varias estrellas
//      progreso: (r, datos) => 0..1,                // por defecto: datos.hechos[r.id] ? 1 : 0
//      titulo: 'Texto del modo',                    // opcional, junto a «Retos»
//      album: {
//          ids: ['corcho', …],
//          mini:  (k, ok) => ({ txt, col, titulo }), // sello pequeño
//          celda: (k, ok) => ({ txt, col, nombre, detalle }), // celda de la tabla
//          nota:  (nuevo) => 'frase bajo el álbum',
//      },
//  });
//  R.hecho('id')  R.sello('k')  R.datos  R.nuevo (sello recién ganado)  R.pintar()
// ═══════════════════════════════════════════════════════════════════
function crearRetos(cfg) {
    const ALMACEN = crearAlmacen(cfg.clave, () => ({ sellos: {}, hechos: {}, secreto: false }));
    const R = { datos: ALMACEN.leer(), nuevo: null };
    if (!R.datos.sellos) R.datos.sellos = {};
    if (!R.datos.hechos) R.datos.hechos = {};
    const prog = cfg.progreso || ((r, d) => d.hechos[r.id] ? 1 : 0);

    R.guardar = () => { ALMACEN.guardar(R.datos); R.pintar(); };
    R.hecho = (id) => { if (R.datos.hechos[id]) return; R.datos.hechos[id] = true; R.guardar(); };
    R.sello = (k) => { if (R.datos.sellos[k]) return false; R.datos.sellos[k] = true; R.nuevo = k; R.guardar(); return true; };

    R.pintar = () => {
        const lista = document.getElementById('lista-retos');
        if (!lista) return;
        const modo = document.getElementById('retos-modo');
        if (modo && cfg.titulo) modo.textContent = '· ' + i18n.t(cfg.titulo);
        lista.innerHTML = '';
        cfg.retos.forEach(r => {
            const p = prog(r, R.datos), hecho = p >= 1, n = r.n || 1, txt = i18n.t(r.txt);
            const li = document.createElement('li');
            li.className = hecho ? 'hecho' : '';
            li.style.setProperty('--progreso', String(p));
            const est = n > 1 ? '★'.repeat(Math.round(p * n)) + '☆'.repeat(n - Math.round(p * n)) : (hecho ? '★' : '☆');
            li.innerHTML = `<span class="anillo" aria-hidden="true"></span><span class="reto-txt"></span><span class="reto-estrella" aria-hidden="true">${est}</span>`;
            const t = li.querySelector('.reto-txt');
            t.textContent = txt;
            if (r.pista && !hecho) { const s = document.createElement('small'); s.className = 'reto-pista'; s.textContent = i18n.t(r.pista); t.appendChild(document.createElement('br')); t.appendChild(s); }
            li.setAttribute('aria-label', txt + ' · ' + (hecho ? i18n.t('conseguido') : n > 1 ? `${Math.round(p * n)} / ${n}` : i18n.t('pendiente')));
            lista.appendChild(li);
        });
        const al = cfg.album;
        if (!al) return;
        const mini = document.getElementById('album-mini');
        mini.innerHTML = '';
        let cuenta = 0;
        al.ids.forEach(k => {
            const ok = !!R.datos.sellos[k]; if (ok) cuenta++;
            const m = al.mini(k, ok);
            const el = document.createElement('span');
            el.className = 'sello' + (ok ? ' ganado' : '') + (k === R.nuevo ? ' nuevo' : '');
            el.style.setProperty('--col', m.col);
            el.textContent = ok ? m.txt : '?';
            el.title = m.titulo;
            mini.appendChild(el);
        });
        document.getElementById('album-cuenta').textContent = `${cuenta} / ${al.ids.length}`;
        const nota = document.getElementById('nota-album');
        if (nota && al.nota) nota.textContent = al.nota(R.nuevo);
    };
    R.pintarAlbum = () => {
        const tabla = document.getElementById('album-tabla');
        let h = '<div class="mat-fila">';
        cfg.album.ids.forEach(k => {
            const ok = !!R.datos.sellos[k], c = cfg.album.celda(k, ok);
            h += `<div class="mat-celda"><span class="sello grande${ok ? ' ganado' : ''}" style="--col:${c.col}">${ok ? c.txt : '?'}</span>` +
                 `<strong>${c.nombre}</strong><small>${c.detalle}</small></div>`;
        });
        tabla.innerHTML = h + '</div>';
    };
    document.addEventListener('DOMContentLoaded', () => iniciarPanelRetos({
        pintar: R.pintar,
        pintarAlbum: R.pintarAlbum,
        alBorrar: () => { R.datos = ALMACEN.vacio(); R.nuevo = null; R.pintar(); },
    }, ALMACEN));
    return R;
}
