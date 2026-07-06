// ===== Constantes =====
const CLAVE_LOCAL = 'mi-rutina-datos-v1';
const CLAVE_CONFIG = 'mi-rutina-config-v1';
const RUTA_JSON_INICIAL = 'data/ejercicios.json';

let datos = null;
let sesionActualId = null;

// ===== Utilidades de almacenamiento local =====
function cargarDatosLocales() {
  const guardado = localStorage.getItem(CLAVE_LOCAL);
  return guardado ? JSON.parse(guardado) : null;
}

function guardarDatosLocales(d) {
  localStorage.setItem(CLAVE_LOCAL, JSON.stringify(d));
}

function cargarConfig() {
  const c = localStorage.getItem(CLAVE_CONFIG);
  return c ? JSON.parse(c) : { owner: '', repo: '', path: RUTA_JSON_INICIAL, token: '' };
}

function guardarConfig(c) {
  localStorage.setItem(CLAVE_CONFIG, JSON.stringify(c));
}

// ===== Inicialización =====
async function iniciar() {
  const local = cargarDatosLocales();
  if (local) {
    datos = local;
  } else {
    const resp = await fetch(RUTA_JSON_INICIAL);
    datos = await resp.json();
    guardarDatosLocales(datos);
  }
  renderInicio();
  cargarConfigEnFormulario();
  registrarServiceWorker();
}

// ===== Pantallas =====
function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.getElementById(id).classList.add('activa');
  window.scrollTo(0, 0);
}

// ===== Pantalla inicio: disco de sesiones =====
function renderInicio() {
  const cont = document.getElementById('disco-sesiones');
  cont.innerHTML = '';
  datos.sesiones.forEach(sesion => {
    const total = sesion.ejercicios.length;
    const completos = sesion.ejercicios.filter(esComplet).length;
    const btn = document.createElement('button');
    btn.className = 'disco';
    btn.style.setProperty('--acento', sesion.color);
    btn.innerHTML = `
      <p class="disco-enfoque">${sesion.enfoque}</p>
      <p class="disco-nombre">${sesion.nombre}</p>
      <p class="disco-meta">${completos}/${total} pesos anotados</p>
    `;
    btn.addEventListener('click', () => abrirSesion(sesion.id));
    cont.appendChild(btn);
  });
}

function esComplet(ej) {
  if (ej.tipo === 'alternativa') {
    return ej.opciones.some(o => o.peso !== null && o.peso !== undefined && o.peso !== '');
  }
  if (ej.tipo === 'mancuernasVariable') {
    return Array.isArray(ej.pesos) && ej.pesos.every(p => p !== null && p !== '');
  }
  return ej.peso !== null && ej.peso !== undefined && ej.peso !== '';
}

// ===== Pantalla de sesión =====
function abrirSesion(id) {
  sesionActualId = id;
  const sesion = datos.sesiones.find(s => s.id === id);

  document.documentElement.style.setProperty('--acento', sesion.color);
  document.getElementById('sesion-enfoque').textContent = sesion.enfoque;
  document.getElementById('sesion-nombre').textContent = sesion.nombre;
  document.getElementById('sesion-nombre').style.color = '';
  document.querySelector('#pantalla-sesion .titulo-sesion').style.setProperty('--acento', sesion.color);

  renderEjercicios(sesion);
  mostrarPantalla('pantalla-sesion');
}

function renderEjercicios(sesion) {
  const cont = document.getElementById('lista-ejercicios');
  cont.innerHTML = '';

  sesion.ejercicios.forEach(ej => {
    const div = document.createElement('div');
    div.className = 'ejercicio ' + (esComplet(ej) ? 'completo' : 'pendiente');
    div.style.setProperty('--acento', sesion.color);

    let htmlCargas = '';
    let htmlOpciones = '';

    if (ej.tipo === 'alternativa') {
      htmlOpciones = `
        <div class="opciones-alt" data-ej="${ej.id}">
          ${ej.opciones.map((o, i) => `
            <button class="chip-opcion ${i === (ej._seleccion || 0) ? 'activa' : ''}" data-idx="${i}">${o.nombre}</button>
          `).join('')}
        </div>
      `;
      const idxSel = ej._seleccion || 0;
      const opcionActiva = ej.opciones[idxSel];
      htmlCargas = campoCarga(ej.id + '-opt' + idxSel, opcionActiva.tipo, opcionActiva.peso, 'peso');
    } else if (ej.tipo === 'mancuernasVariable') {
      htmlCargas = `<div class="fila-cargas">` +
        ej.pesos.map((p, i) => campoCarga(ej.id + '-m' + i, 'mancuernaUnica', p, 'set ' + (i + 1)))
          .join('') +
        `</div>`;
    } else {
      htmlCargas = `<div class="fila-cargas">${campoCarga(ej.id, ej.tipo, ej.peso, 'peso')}</div>`;
    }

    div.innerHTML = `
      <div class="ejercicio-cabecera">
        <div>
          <div class="ejercicio-nombre">${ej.nombre}</div>
          ${ej.nota ? `<div class="ejercicio-nota">${ej.nota}</div>` : ''}
        </div>
        <div class="ejercicio-series">${ej.series} series · ${ej.reps ?? '?'} reps</div>
      </div>
      ${htmlOpciones}
      ${htmlCargas}
    `;
    cont.appendChild(div);

    // Listeners de inputs de peso
    div.querySelectorAll('input[data-campo]').forEach(input => {
      input.addEventListener('input', () => onCambioPeso(ej, input));
    });

    // Listeners de chips de alternativa
    div.querySelectorAll('.chip-opcion').forEach(chip => {
      chip.addEventListener('click', () => {
        ej._seleccion = parseInt(chip.dataset.idx, 10);
        renderEjercicios(sesion);
      });
    });
  });

  actualizarProgreso(sesion);
}

function campoCarga(idCampo, tipo, valor, etiqueta) {
  const unidad = tipo === 'porLado' ? 'kg / lado'
    : tipo === 'mancuernaUnica' ? 'kg mancuerna'
    : 'kg total';
  const vacio = (valor === null || valor === undefined || valor === '');
  return `
    <div class="campo-carga ${vacio ? 'vacio' : ''}">
      <label>${etiqueta}</label>
      <input type="number" inputmode="decimal" step="0.5"
        data-campo="${idCampo}"
        value="${vacio ? '' : valor}"
        placeholder="?">
      <span class="unidad">${unidad}</span>
    </div>
  `;
}

function onCambioPeso(ej, input) {
  const valor = input.value === '' ? null : parseFloat(input.value);
  const campo = input.dataset.campo;

  if (ej.tipo === 'alternativa') {
    const idxSel = ej._seleccion || 0;
    ej.opciones[idxSel].peso = valor;
  } else if (ej.tipo === 'mancuernasVariable') {
    const idx = parseInt(campo.split('-m')[1], 10);
    ej.pesos[idx] = valor;
  } else {
    ej.peso = valor;
  }

  const tarjeta = input.closest('.ejercicio');
  const carga = input.closest('.campo-carga');
  carga.classList.toggle('vacio', valor === null);
  tarjeta.classList.toggle('completo', esComplet(ej));
  tarjeta.classList.toggle('pendiente', !esComplet(ej));

  const sesion = datos.sesiones.find(s => s.id === sesionActualId);
  actualizarProgreso(sesion);
}

function actualizarProgreso(sesion) {
  const total = sesion.ejercicios.length;
  const completos = sesion.ejercicios.filter(esComplet).length;
  document.getElementById('sesion-progreso').textContent = `${completos}/${total}`;
}

// ===== Guardar =====
document.addEventListener('DOMContentLoaded', () => {
  iniciar();

  document.getElementById('btn-volver-sesion').addEventListener('click', () => {
    document.documentElement.style.removeProperty('--acento');
    renderInicio();
    mostrarPantalla('pantalla-inicio');
  });

  document.getElementById('btn-config').addEventListener('click', () => {
    mostrarPantalla('pantalla-ajustes');
  });

  document.getElementById('btn-volver-ajustes').addEventListener('click', () => {
    mostrarPantalla('pantalla-inicio');
  });

  document.getElementById('btn-guardar').addEventListener('click', guardarSesionActual);
  document.getElementById('btn-guardar-config').addEventListener('click', guardarConfigDesdeFormulario);
});

async function guardarSesionActual() {
  const sesion = datos.sesiones.find(s => s.id === sesionActualId);
  sesion.actualizadoEn = new Date().toISOString();
  guardarDatosLocales(datos);

  const boton = document.getElementById('btn-guardar');
  boton.textContent = 'Guardado ✓';
  boton.classList.add('guardado');
  setTimeout(() => {
    boton.textContent = 'Guardar pesos de hoy';
    boton.classList.remove('guardado');
  }, 1600);

  const config = cargarConfig();
  if (config.owner && config.repo && config.token) {
    await sincronizarConGitHub(config);
  }
}

// ===== Ajustes / GitHub =====
function cargarConfigEnFormulario() {
  const c = cargarConfig();
  document.getElementById('input-owner').value = c.owner || '';
  document.getElementById('input-repo').value = c.repo || '';
  document.getElementById('input-path').value = c.path || RUTA_JSON_INICIAL;
  document.getElementById('input-token').value = c.token || '';
}

function guardarConfigDesdeFormulario() {
  const c = {
    owner: document.getElementById('input-owner').value.trim(),
    repo: document.getElementById('input-repo').value.trim(),
    path: document.getElementById('input-path').value.trim() || RUTA_JSON_INICIAL,
    token: document.getElementById('input-token').value.trim()
  };
  guardarConfig(c);
  const estado = document.getElementById('estado-sync');
  estado.textContent = 'Configuración guardada en este móvil.';
  estado.className = 'estado-sync ok';
}

async function sincronizarConGitHub(config) {
  const estado = document.getElementById('estado-sync');
  try {
    const urlBase = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`;

    // Necesitamos el sha actual del archivo para poder actualizarlo
    let sha = null;
    const respActual = await fetch(urlBase, {
      headers: { Authorization: `Bearer ${config.token}` }
    });
    if (respActual.ok) {
      const actual = await respActual.json();
      sha = actual.sha;
    }

    const contenido = btoa(unescape(encodeURIComponent(JSON.stringify(datos, null, 2))));

    const respPut = await fetch(urlBase, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Actualiza pesos - ${new Date().toLocaleString('es-ES')}`,
        content: contenido,
        sha: sha || undefined
      })
    });

    if (!respPut.ok) throw new Error('Fallo al sincronizar (' + respPut.status + ')');

    if (estado) {
      estado.textContent = 'Sincronizado con GitHub ✓';
      estado.className = 'estado-sync ok';
    }
  } catch (err) {
    if (estado) {
      estado.textContent = 'No se pudo sincronizar: ' + err.message;
      estado.className = 'estado-sync error';
    }
  }
}

// ===== Service worker =====
function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
