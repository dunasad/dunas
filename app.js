// ─────────────────────────────────────────────
//  DUNAS – app.js
//  Lógica principal: Auth, Notas, Clientes, Modelos
// ─────────────────────────────────────────────

// ── Supabase client ──────────────────────────
const { createClient } = supabase;
const SB = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ── Estado global ────────────────────────────
let clientes = [];
let modelos  = [];
let notas    = [];
let notaActualId  = null;
let usuarioActual = null;
let itemSeq = 0;

// ════════════════════════════════════════════
//  UTILIDADES
// ════════════════════════════════════════════
const $ = id => document.getElementById(id);

function loader(on) {
  $('loader').classList.toggle('on', on);
}

let _toastTimer;
function toast(msg, tipo = 'ok') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast toast-${tipo}`;
  el.style.display = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => (el.style.display = 'none'), 3500);
}

function fmtMoney(n) {
  return parseFloat(n || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtFecha(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ════════════════════════════════════════════
//  SESIÓN  (sessionStorage → dura hasta cerrar pestaña)
// ════════════════════════════════════════════
function getSesion() {
  try { return JSON.parse(sessionStorage.getItem('dunas_user')); }
  catch { return null; }
}
function setSesion(user) {
  sessionStorage.setItem('dunas_user', JSON.stringify(user));
}
function limpiarSesion() {
  sessionStorage.removeItem('dunas_user');
}

// ════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════
async function doLogin() {
  const usuario = $('login-usuario').value.trim();
  const pass    = $('login-pass').value;
  const errEl   = $('login-error');
  const btnEl   = $('btn-login');

  if (!usuario || !pass) {
    errEl.textContent = 'Ingresa tu usuario y contraseña.';
    errEl.classList.add('visible');
    return;
  }

  errEl.classList.remove('visible');
  btnEl.disabled      = true;
  btnEl.textContent   = 'Verificando…';

  try {
    const { data, error } = await SB
      .from('usuarios')
      .select('id, nombre, usuario')
      .eq('usuario', usuario)
      .eq('password', pass)
      .single();

    if (error || !data) {
      errEl.textContent = 'Usuario o contraseña incorrectos.';
      errEl.classList.add('visible');
      $('login-pass').value = '';
      $('login-pass').focus();
    } else {
      usuarioActual = data;
      setSesion(data);
      mostrarApp();
    }
  } catch {
    errEl.textContent = 'Error de conexión. Intenta de nuevo.';
    errEl.classList.add('visible');
  }

  btnEl.disabled    = false;
  btnEl.textContent = 'Entrar';
}

function mostrarApp() {
  $('login-screen').classList.remove('visible');
  $('app').classList.add('visible');
  const nombre = usuarioActual.nombre || usuarioActual.usuario || 'Usuario';
  $('nav-username').textContent = nombre;
  $('nav-avatar').textContent   = nombre.charAt(0).toUpperCase();
  cargarTodo();
}

function cerrarSesion() {
  if (!confirm('¿Cerrar sesión?')) return;
  limpiarSesion();
  usuarioActual = null;
  $('app').classList.remove('visible');
  $('login-screen').classList.add('visible');
  $('login-usuario').value = '';
  $('login-pass').value    = '';
  $('login-error').classList.remove('visible');
  setTimeout(() => $('login-usuario').focus(), 100);
}

// ════════════════════════════════════════════
//  VISTAS
// ════════════════════════════════════════════
function gotoView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  $('view-' + name)?.classList.add('active');
  $('nav-' + name)?.classList.add('active');
  notaActualId = null;
}

function gotoViewRaw(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  $('view-' + name)?.classList.add('active');
}

// ════════════════════════════════════════════
//  CARGA DE DATOS
// ════════════════════════════════════════════
async function cargarTodo() {
  loader(true);
  try {
    const [rc, rm, rn] = await Promise.all([
      SB.from('clientes').select('*').order('nombre'),
      SB.from('modelos').select('*').order('nombre'),
      SB.from('notas')
        .select('id, folio, pedido, fecha, total, cliente_id, clientes(nombre)')
        .order('created_at', { ascending: false }),
    ]);
    clientes = rc.data || [];
    modelos  = rm.data || [];
    notas    = rn.data || [];
    renderClientes();
    renderModelos();
    renderNotas();
    poblarSelectCliente();
  } catch (e) {
    toast('❌ Error al cargar datos: ' + e.message, 'err');
  }
  loader(false);
}

// ════════════════════════════════════════════
//  NOTAS – Lista
// ════════════════════════════════════════════
function renderNotas() {
  const tb = $('tb-notas');
  if (!notas.length) {
    tb.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>Aún no hay notas registradas</p>
      </div></td></tr>`;
    return;
  }
  tb.innerHTML = notas.map(n => `
    <tr>
      <td><span class="folio-badge">${n.folio || '—'}</span></td>
      <td>${n.pedido || '—'}</td>
      <td>${fmtFecha(n.fecha)}</td>
      <td><strong>${n.clientes?.nombre || '—'}</strong></td>
      <td><strong>$&nbsp;${fmtMoney(n.total || 0)}</strong></td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="verNota(${n.id})">👁️ Ver</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarNota(${n.id})">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

// ════════════════════════════════════════════
//  AUTONUMERACIÓN
// ════════════════════════════════════════════
async function generarNumeros() {
  // Folio: DUN00300, DUN00301, DUN00302 …
  // Pedido: 001110, 001111, 001112 …
  const FOLIO_INICIO  = 300;   // DUN00300
  const PEDIDO_INICIO = 1110;  // 001110

  try {
    const { data } = await SB
      .from('notas')
      .select('folio, pedido')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextFolio  = 'DUN' + String(FOLIO_INICIO).padStart(5, '0');
    let nextPedido = String(PEDIDO_INICIO).padStart(6, '0');

    if (data) {
      // Folio: extraer número de "DUN00300"
      const fm = data.folio?.match(/DUN0*(\d+)/i);
      if (fm) {
        nextFolio = 'DUN' + String(parseInt(fm[1]) + 1).padStart(5, '0');
      }
      // Pedido: extraer número
      const pm = data.pedido?.match(/(\d+)/);
      if (pm) {
        nextPedido = String(parseInt(pm[1]) + 1).padStart(6, '0');
      }
    }
    return { folio: nextFolio, pedido: nextPedido };
  } catch {
    return {
      folio:  'DUN' + String(FOLIO_INICIO).padStart(5, '0'),
      pedido: String(PEDIDO_INICIO).padStart(6, '0'),
    };
  }
}

// ════════════════════════════════════════════
//  NOTAS – Nueva
// ════════════════════════════════════════════
async function abrirNuevaNota() {
  notaActualId = null;
  $('nota-form-titulo').textContent = 'Nueva Nota';
  $('btn-guardar').textContent      = '💾 Guardar Nota';
  $('btn-guardar').style.display    = '';
  $('btn-imprimir').style.display   = 'none';

  $('nf-fecha').value   = new Date().toISOString().split('T')[0];
  $('nf-folio').value   = '…';
  $('nf-pedido').value  = '…';
  $('nf-trabajo').value = 'Fabricacion de palas tejidas';
  $('nf-cliente').value = '';
  $('items-wrap').innerHTML = '';
  itemSeq = 0;
  agregarItem();
  calcTotal();
  gotoViewRaw('nota-form');

  // Generar números después de mostrar la vista
  const nums = await generarNumeros();
  $('nf-folio').value  = nums.folio;
  $('nf-pedido').value = nums.pedido;
}

// ════════════════════════════════════════════
//  NOTAS – Ver / Editar
// ════════════════════════════════════════════
async function verNota(id) {
  loader(true);
  const { data: nota } = await SB.from('notas').select('*, clientes(*)').eq('id', id).single();
  const { data: det  } = await SB.from('detalle_notas').select('*, modelos(nombre)').eq('nota_id', id);
  loader(false);
  if (!nota) return;

  notaActualId = id;
  $('nota-form-titulo').textContent = `Nota: ${nota.folio}`;
  $('btn-guardar').textContent      = '💾 Guardar Cambios';
  $('btn-guardar').style.display    = '';
  $('btn-imprimir').style.display   = '';

  $('nf-folio').value   = nota.folio       || '';
  $('nf-pedido').value  = nota.pedido      || '';
  $('nf-fecha').value   = nota.fecha       || '';
  $('nf-trabajo').value = nota.trabajo     || '';
  $('nf-cliente').value = nota.cliente_id  || '';

  $('items-wrap').innerHTML = '';
  itemSeq = 0;
  (det || []).forEach(d => {
    agregarItemConDatos({
      modelo_id:   d.modelo_id,
      descripcion: d.descripcion || '',
      cantidad:    d.cantidad,
      precio:      d.precio,
    });
  });
  calcTotal();
  gotoViewRaw('nota-form');
}

// ════════════════════════════════════════════
//  NOTAS – Guardar
// ════════════════════════════════════════════
async function guardarNota() {
  const folio     = $('nf-folio').value.trim();
  const pedido    = $('nf-pedido').value.trim();
  const fecha     = $('nf-fecha').value;
  const clienteId = $('nf-cliente').value;
  const trabajo   = $('nf-trabajo').value.trim();
  const items     = getItemsData();

  if (!folio)        { alert('Ingresa el folio de la nota');    return; }
  if (!fecha)        { alert('Selecciona la fecha');            return; }
  if (!clienteId)    { alert('Selecciona un cliente');          return; }
  if (!items.length) { alert('Agrega al menos un producto');    return; }

  const total = items.reduce((s, i) => s + i.total, 0);
  loader(true);

  try {
    if (notaActualId) {
      // ── UPDATE ─────────────────────────────
      await SB.from('notas')
        .update({ folio, pedido, fecha, cliente_id: clienteId, trabajo, total })
        .eq('id', notaActualId);
      await SB.from('detalle_notas').delete().eq('nota_id', notaActualId);
      await SB.from('detalle_notas')
        .insert(items.map(i => ({ ...i, nota_id: notaActualId })));
    } else {
      // ── INSERT ─────────────────────────────
      const { data: n, error } = await SB
        .from('notas')
        .insert({ folio, pedido, fecha, cliente_id: clienteId, trabajo, total })
        .select()
        .single();
      if (error) throw error;
      notaActualId = n.id;
      await SB.from('detalle_notas')
        .insert(items.map(i => ({ ...i, nota_id: n.id })));
    }

    $('nota-form-titulo').textContent = `Nota: ${folio}`;
    $('btn-guardar').textContent      = '💾 Guardar Cambios';
    $('btn-imprimir').style.display   = '';
    await cargarTodo();
    toast('✅ Nota guardada correctamente', 'ok');
  } catch (e) {
    toast('❌ Error al guardar: ' + e.message, 'err');
  }
  loader(false);
}

async function eliminarNota(id) {
  if (!confirm('¿Eliminar esta nota? No se puede deshacer.')) return;
  loader(true);
  await SB.from('detalle_notas').delete().eq('nota_id', id);
  await SB.from('notas').delete().eq('id', id);
  await cargarTodo();
  toast('🗑️ Nota eliminada', 'ok');
  loader(false);
}

// ════════════════════════════════════════════
//  ITEMS (productos dentro de la nota)
// ════════════════════════════════════════════
function agregarItem() {
  agregarItemConDatos({ modelo_id: '', descripcion: '', cantidad: 1, precio: 0 });
}

function agregarItemConDatos({ modelo_id, descripcion, cantidad, precio }) {
  itemSeq++;
  const sid  = `item-${itemSeq}`;
  const opts = modelos
    .map(m => `<option value="${m.id}" ${m.id == modelo_id ? 'selected' : ''}>${m.nombre}</option>`)
    .join('');

  $('items-wrap').insertAdjacentHTML('beforeend', `
    <div class="item-row" id="${sid}">
      <span class="item-num">PRODUCTO ${itemSeq}</span>
      <button class="btn-remove-item" onclick="quitarItem('${sid}')">✕ Quitar</button>
      <div style="margin-top:8px">
        <div class="grid-2" style="margin-bottom:12px">
          <div class="form-group" style="margin-bottom:0">
            <label>Modelo</label>
            <select class="item-modelo" onchange="calcTotal()">
              <option value="">— Selecciona modelo —</option>
              ${opts}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>Descripción (talla, color, pares…)</label>
            <input type="text" class="item-desc"
              placeholder="520 PARES NEGROS" value="${descripcion}">
          </div>
        </div>
        <div class="grid-4">
          <div class="form-group" style="margin-bottom:0">
            <label>Cantidad</label>
            <input type="number" class="item-qty" min="0" value="${cantidad}"
              oninput="calcItemTotal('${sid}'); calcTotal()">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>Precio por unidad</label>
            <input type="number" class="item-price" min="0" step="0.01" value="${precio}"
              oninput="calcItemTotal('${sid}'); calcTotal()">
          </div>
          <div class="form-group" style="margin-bottom:0; grid-column:span 2">
            <label>Subtotal</label>
            <input type="text" class="item-total" readonly
              value="$ ${fmtMoney(cantidad * precio)}">
          </div>
        </div>
      </div>
    </div>`);
}

function quitarItem(id) {
  $(id)?.remove();
  calcTotal();
}

function calcItemTotal(id) {
  const row = $(id); if (!row) return;
  const qty   = parseFloat(row.querySelector('.item-qty').value)   || 0;
  const price = parseFloat(row.querySelector('.item-price').value) || 0;
  row.querySelector('.item-total').value = '$ ' + fmtMoney(qty * price);
}

function calcTotal() {
  let total = 0;
  document.querySelectorAll('.item-row').forEach(row => {
    const qty   = parseFloat(row.querySelector('.item-qty')?.value)   || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    total += qty * price;
  });
  $('nf-total-display').textContent = '$ ' + fmtMoney(total);
}

function getItemsData() {
  return Array.from(document.querySelectorAll('.item-row')).map(row => {
    const qty   = parseFloat(row.querySelector('.item-qty').value)   || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    return {
      modelo_id:   row.querySelector('.item-modelo').value || null,
      descripcion: row.querySelector('.item-desc').value.trim(),
      cantidad: qty,
      precio:   price,
      total:    qty * price,
    };
  });
}

// ════════════════════════════════════════════
//  IMPRIMIR
// ════════════════════════════════════════════
async function imprimirNota() {
  if (!notaActualId) return;
  loader(true);
  const { data: nota } = await SB.from('notas').select('*, clientes(*)').eq('id', notaActualId).single();
  const { data: det  } = await SB.from('detalle_notas').select('*, modelos(nombre)').eq('nota_id', notaActualId);
  loader(false);

  const folio   = nota.folio  || 'nota';
  const cliente = nota.clientes?.nombre || 'cliente';

  $('pv-fecha').textContent   = fmtFecha(nota.fecha);
  $('pv-pedido').textContent  = nota.pedido || '';
  $('pv-folio').textContent   = folio;
  $('pv-cliente').textContent = cliente;
  $('pv-ciudad').textContent  = nota.clientes?.ciudad   || '';
  $('pv-tel').textContent     = nota.clientes?.telefono || '';
  $('pv-trabajo').textContent = nota.trabajo || '';
  $('pv-total').textContent   = fmtMoney(nota.total || 0);
  $('pv-address').textContent = CONFIG.EMPRESA_DIRECCION;

  $('pv-items').innerHTML = (det || []).map(d => `
    <tr>
      <td class="tc w-qty">${d.cantidad}</td>
      <td>
        <strong>${d.modelos?.nombre || ''}</strong>
        ${d.descripcion ? '<br>' + d.descripcion : ''}
      </td>
      <td class="tr w-price">$ ${fmtMoney(d.precio)}</td>
      <td class="tr w-total">$ ${fmtMoney(d.total)}</td>
    </tr>`).join('');

  // Nombre del archivo PDF = "DUN00301-RADDOCK"
  const tituloOriginal = document.title;
  document.title = `${folio}-${cliente}`;
  window.print();
  // Restaurar título tras un momento (print es sincrónico en Chrome)
  setTimeout(() => { document.title = tituloOriginal; }, 1500);
}

// ════════════════════════════════════════════
//  CLIENTES
// ════════════════════════════════════════════
function renderClientes() {
  const tb = $('tb-clientes');
  if (!clientes.length) {
    tb.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="icon">👥</div><p>No hay clientes registrados</p>
      </div></td></tr>`;
    return;
  }
  tb.innerHTML = clientes.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.ciudad   || '—'}</td>
      <td>${c.telefono || '—'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="editarCliente(${c.id})">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarCliente(${c.id})">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

function poblarSelectCliente() {
  const sel = $('nf-cliente');
  const val = sel.value;
  sel.innerHTML = '<option value="">— Selecciona un cliente —</option>' +
    clientes.map(c =>
      `<option value="${c.id}">${c.nombre}${c.ciudad ? ' – ' + c.ciudad : ''}</option>`
    ).join('');
  if (val) sel.value = val;
}

function abrirModalCliente(id) {
  $('mc-id').value     = '';
  $('mc-nombre').value = '';
  $('mc-ciudad').value = '';
  $('mc-tel').value    = '';
  $('modal-cliente-titulo').textContent = 'Nuevo Cliente';
  if (id) {
    const c = clientes.find(x => x.id === id);
    if (c) {
      $('mc-id').value     = c.id;
      $('mc-nombre').value = c.nombre;
      $('mc-ciudad').value = c.ciudad   || '';
      $('mc-tel').value    = c.telefono || '';
      $('modal-cliente-titulo').textContent = 'Editar Cliente';
    }
  }
  abrirModal('modal-cliente');
}
const editarCliente = id => abrirModalCliente(id);

async function guardarCliente() {
  const nombre = $('mc-nombre').value.trim();
  if (!nombre) { alert('El nombre es requerido'); return; }
  const id   = $('mc-id').value;
  const data = {
    nombre:   nombre.toUpperCase(),
    ciudad:   $('mc-ciudad').value.trim(),
    telefono: $('mc-tel').value.trim(),
  };
  loader(true);
  if (id) await SB.from('clientes').update(data).eq('id', id);
  else    await SB.from('clientes').insert(data);
  cerrarModal('modal-cliente');
  await cargarTodo();
  toast('✅ Cliente guardado', 'ok');
  loader(false);
}

async function eliminarCliente(id) {
  if (!confirm('¿Eliminar este cliente?')) return;
  loader(true);
  await SB.from('clientes').delete().eq('id', id);
  await cargarTodo();
  toast('🗑️ Cliente eliminado', 'ok');
  loader(false);
}

// ════════════════════════════════════════════
//  MODELOS
// ════════════════════════════════════════════
function renderModelos() {
  const tb = $('tb-modelos');
  if (!modelos.length) {
    tb.innerHTML = `<tr><td colspan="3">
      <div class="empty-state">
        <div class="icon">📦</div><p>No hay modelos registrados</p>
      </div></td></tr>`;
    return;
  }
  tb.innerHTML = modelos.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${m.nombre}</strong></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="editarModelo(${m.id})">✏️ Editar</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarModelo(${m.id})">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

function abrirModalModelo(id) {
  $('mm-id').value     = '';
  $('mm-nombre').value = '';
  $('modal-modelo-titulo').textContent = 'Nuevo Modelo';
  if (id) {
    const m = modelos.find(x => x.id === id);
    if (m) {
      $('mm-id').value     = m.id;
      $('mm-nombre').value = m.nombre;
      $('modal-modelo-titulo').textContent = 'Editar Modelo';
    }
  }
  abrirModal('modal-modelo');
}
const editarModelo = id => abrirModalModelo(id);

async function guardarModelo() {
  const nombre = $('mm-nombre').value.trim();
  if (!nombre) { alert('El nombre del modelo es requerido'); return; }
  const id = $('mm-id').value;
  loader(true);
  if (id) await SB.from('modelos').update({ nombre: nombre.toUpperCase() }).eq('id', id);
  else    await SB.from('modelos').insert({ nombre: nombre.toUpperCase() });
  cerrarModal('modal-modelo');
  await cargarTodo();
  toast('✅ Modelo guardado', 'ok');
  loader(false);
}

async function eliminarModelo(id) {
  if (!confirm('¿Eliminar este modelo?')) return;
  loader(true);
  await SB.from('modelos').delete().eq('id', id);
  await cargarTodo();
  toast('🗑️ Modelo eliminado', 'ok');
  loader(false);
}

// ════════════════════════════════════════════
//  MODALES
// ════════════════════════════════════════════
function abrirModal(id)  { $(id).classList.add('open');    }
function cerrarModal(id) { $(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) o.classList.remove('open');
  });
});

// ════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const sesion = getSesion();
  if (sesion) {
    usuarioActual = sesion;
    mostrarApp();
  } else {
    $('login-screen').classList.add('visible');
    setTimeout(() => $('login-usuario').focus(), 120);
  }
});
