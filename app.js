// ===== Constantes =====
const CLAVE_LOCAL = 'mi-rutina-datos-v1';
const CLAVE_CONFIG = 'mi-rutina-config-v1';
const RUTA_JSON_INICIAL = 'data/ejercicios.json';

let datos = null;
let sesionActualId = null;
let snapshotSesion = null;

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

// ===== Fechas =====
function formatFecha(iso) {
  if (!iso) return 'Sin entrenar aún';
  const fecha = new Date(iso);
  const ahora = new Date();
  const dias = Math.floor((ahora - fecha) / (1000 * 60 * 60 * 24));

  if (dias <= 0) return 'Última vez: hoy';
  if (dias === 1) return 'Última vez: ayer';
  if (dias < 7) return `Última vez: hace ${dias} días`;
  const semanas = Math.floor(dias / 7);
  if (semanas === 1) return 'Última vez: hace 1 semana';
  if (semanas < 5) return `Última vez: hace ${semanas} semanas`;
  const meses = Math.floor(dias / 30);
  if (meses <= 1) return 'Última vez: hace 1 mes';
  return `Última vez: hace ${meses} meses`;
}

function inicioSemana() {
  const hoy = new Date();
  const diaSemana = (hoy.getDay() + 6) % 7; // Lunes = 0
  const lunes = new Date(hoy);
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(hoy.getDate() - diaSemana);
  return lunes;
}

function sesionesEstaSemana() {
  const lunes = inicioSemana();
  return datos.sesiones.filter(s => s.actualizadoEn && new Date(s.actualizadoEn) >= lunes).length;
}

// ===== Pantalla inicio: disco de sesiones =====
function renderInicio() {
  const banner = document.getElementById('banner-semana');
  const hechas = sesionesEstaSemana();
  banner.textContent = `${hechas}/${datos.sesiones.length} sesiones esta semana`;

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
      <p class="disco-fecha">${formatFecha(sesion.actualizadoEn)}</p>
    `;
    btn.addEventListener('click', () => abrirSesion(sesion.id));
    cont.appendChild(btn);
  });
}

function esComplet(ej) {
  const repsOk = ej.reps !== null && ej.reps !== undefined && ej.reps !== '';

  let pesoOk;
  if (ej.tipo === 'alternativa') {
    pesoOk = ej.opciones.some(o => o.peso !== null && o.peso !== undefined && o.peso !== '');
  } else if (ej.tipo === 'mancuernasVariable') {
    pesoOk = Array.isArray(ej.pesos) && ej.pesos.every(p => p !== null && p !== '');
  } else {
    pesoOk = ej.peso !== null && ej.peso !== undefined && ej.peso !== '';
  }

  return pesoOk && repsOk;
}

// ===== Pantalla de sesión =====
function abrirSesion(id) {
  sesionActualId = id;
  const sesion = datos.sesiones.find(s => s.id === id);
  snapshotSesion = JSON.parse(JSON.stringify(sesion));

  document.documentElement.style.setProperty('--acento', sesion.color);
  document.getElementById('sesion-enfoque').textContent = sesion.enfoque;
  document.getElementById('sesion-nombre').textContent = sesion.nombre;
  document.getElementById('sesion-nombre').style.color = '';
  document.querySelector('#pantalla-sesion .titulo-sesion').style.setProperty('--acento', sesion.color);

  renderEjercicios(sesion);
  mostrarPantalla('pantalla-sesion');
}

function snapshotDeEjercicio(ejId) {
  if (!snapshotSesion) return null;
  return snapshotSesion.ejercicios.find(e => e.id === ejId) || null;
}

function renderEjercicios(sesion) {
  const cont = document.getElementById('lista-ejercicios');
  cont.innerHTML = '';

  sesion.ejercicios.forEach(ej => {
    const div = document.createElement('div');
    div.className = 'ejercicio ' + (esComplet(ej) ? 'completo' : 'pendiente');
    div.style.setProperty('--acento', sesion.color);

    const snap = snapshotDeEjercicio(ej.id);
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
      const snapOpcion = snap ? snap.opciones[idxSel] : null;
      htmlCargas = campoCarga(ej.id + '-opt' + idxSel, opcionActiva.tipo, opcionActiva.peso, 'peso', snapOpcion ? snapOpcion.peso : null);
    } else if (ej.tipo === 'mancuernasVariable') {
      htmlCargas = `<div class="fila-cargas">` +
        ej.pesos.map((p, i) => campoCarga(ej.id + '-m' + i, 'mancuernaUnica', p, 'set ' + (i + 1), snap ? snap.pesos[i] : null))
          .join('') +
        `</div>`;
    } else {
      htmlCargas = `<div class="fila-cargas">${campoCarga(ej.id, ej.tipo, ej.peso, 'peso', snap ? snap.peso : null)}</div>`;
    }

    const notaValor = ej.notaUsuario || '';

    div.innerHTML = `
      <div class="ejercicio-cabecera">
        <div>
          <div class="ejercicio-nombre">${ej.nombre}</div>
          ${ej.nota ? `<div class="ejercicio-nota">${ej.nota}</div>` : ''}
        </div>
        <div class="ejercicio-series">
          <span>${ej.series} series</span>
          ${renderReps(ej)}
        </div>
      </div>
      ${htmlOpciones}
      ${htmlCargas}
      <input type="text" class="campo-nota-usuario" data-notaej="${ej.id}"
        value="${notaValor.replace(/"/g, '&quot;')}" placeholder="+ Añadir nota (opcional)">
    `;
    cont.appendChild(div);

    // Listeners de inputs de peso
    div.querySelectorAll('input[data-campo]').forEach(input => {
      input.addEventListener('input', () => onCambioPeso(ej, input));
    });

    // Listener del input de repeticiones
    const inputReps = div.querySelector('input[data-reps]');
    if (inputReps) {
      inputReps.addEventListener('input', () => onCambioReps(ej, inputReps));
    }

    // Listener de la nota
    const inputNota = div.querySelector('input[data-notaej]');
    inputNota.addEventListener('input', () => {
      ej.notaUsuario = inputNota.value.trim() || null;
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

function renderReps(ej) {
  const vacio = (ej.reps === null || ej.reps === undefined || ej.reps === '');
  return `
    <span class="reps-editable ${vacio ? 'vacio' : ''}">
      · <input type="number" inputmode="numeric" step="1"
          data-reps="${ej.id}"
          value="${vacio ? '' : ej.reps}"
          placeholder="?"> reps
    </span>
  `;
}

function campoCarga(idCampo, tipo, valor, etiqueta, snapshotValor) {
  const unidad = tipo === 'porLado' ? 'kg / lado'
    : tipo === 'mancuernaUnica' ? 'kg mancuerna'
    : 'kg total';
  const vacio = (valor === null || valor === undefined || valor === '');
  const esRecord = !vacio && snapshotValor !== null && snapshotValor !== undefined && parseFloat(valor) > parseFloat(snapshotValor);
  return `
    <div class="campo-carga ${vacio ? 'vacio' : ''} ${esRecord ? 'record' : ''}">
      <label>${etiqueta}</label>
      <input type="number" inputmode="decimal" step="0.5"
        data-campo="${idCampo}"
        data-snapshot="${snapshotValor ?? ''}"
        value="${vacio ? '' : valor}"
        placeholder="?">
      <span class="unidad">${unidad}</span>
      <span class="record-star" title="Has subido peso respecto a la última vez">⭐</span>
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
  const snapshotValor = input.dataset.snapshot;
  const esRecord = valor !== null && snapshotValor !== '' && valor > parseFloat(snapshotValor);

  carga.classList.toggle('vacio', valor === null);
  carga.classList.toggle('record', esRecord);
  tarjeta.classList.toggle('completo', esComplet(ej));
  tarjeta.classList.toggle('pendiente', !esComplet(ej));

  const sesion = datos.sesiones.find(s => s.id === sesionActualId);
  actualizarProgreso(sesion);
}

function onCambioReps(ej, input) {
  const valor = input.value === '' ? null : parseInt(input.value, 10);
  ej.reps = valor;

  const span = input.closest('.reps-editable');
  if (span) span.classList.toggle('vacio', valor === null);

  const tarjeta = input.closest('.ejercicio');
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
  document.getElementById('btn-deshacer').addEventListener('click', deshacerCambios);
  document.getElementById('btn-guardar-config').addEventListener('click', guardarConfigDesdeFormulario);
});

function deshacerCambios() {
  if (!snapshotSesion) return;
  const sesion = datos.sesiones.find(s => s.id === sesionActualId);
  sesion.ejercicios = JSON.parse(JSON.stringify(snapshotSesion.ejercicios));
  renderEjercicios(sesion);
}

async function guardarSesionActual() {
  const sesion = datos.sesiones.find(s => s.id === sesionActualId);
  sesion.actualizadoEn = new Date().toISOString();
  guardarDatosLocales(datos);
  snapshotSesion = JSON.parse(JSON.stringify(sesion));
  renderEjercicios(sesion);

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
