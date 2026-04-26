const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; 
const headers = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

let appData = { clientes: [], modelos: [], notas: [] };

// --- ACCESO ---
async function checkAccess() {
    const user = document.getElementById('userInput').value;
    const pass = document.getElementById('passInput').value;
    const response = await fetch(`${SB_URL}/usuarios?usuario=eq.${user}&password=eq.${pass}&select=*`, { headers });
    const data = await response.json();
    if (data.length > 0) {
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('main-app').classList.remove('d-none');
        init();
    } else { 
        Swal.fire('Error', 'Usuario o contraseña incorrectos', 'error');
    }
}

async function init() {
    await Promise.all([fetchClientes(), fetchModelos()]);
    renderSelectors();
    renderTablas();
    addItem();
}

// --- NAVEGACIÓN ---
window.showSection = (section) => {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
    document.querySelectorAll('#sidebar li').forEach(li => li.classList.remove('active'));
    document.getElementById('sec-' + section).classList.remove('d-none');
    document.getElementById('menu-' + section).classList.add('active');
    if(section === 'historial') fetchHistorial();
};

// --- MODALES CLIENTES/MODELOS (Funciones Globales) ---
window.abrirModalCliente = (id = null) => {
    const modal = new bootstrap.Modal(document.getElementById('modalCliente'));
    if (id) {
        const c = appData.clientes.find(cli => cli.id == id);
        document.getElementById('modalClienteTitulo').innerText = "Editar Cliente";
        document.getElementById('editCliId').value = c.id;
        document.getElementById('nomCli').value = c.nombre;
        document.getElementById('telCli').value = c.telefono;
    } else {
        document.getElementById('modalClienteTitulo').innerText = "Nuevo Cliente";
        document.getElementById('editCliId').value = "";
        document.getElementById('nomCli').value = "";
        document.getElementById('telCli').value = "";
    }
    modal.show();
};

window.abrirModalModelo = (id = null) => {
    const modal = new bootstrap.Modal(document.getElementById('modalModelo'));
    if (id) {
        const m = appData.modelos.find(mod => mod.id == id);
        document.getElementById('modalModeloTitulo').innerText = "Editar Modelo";
        document.getElementById('editModId').value = m.id;
        document.getElementById('nomMod').value = m.nombre;
    } else {
        document.getElementById('modalModeloTitulo').innerText = "Nuevo Modelo";
        document.getElementById('editModId').value = "";
        document.getElementById('nomMod').value = "";
    }
    modal.show();
};

// --- GUARDAR DATOS ---
window.guardarCliente = async () => {
    const id = document.getElementById('editCliId').value;
    const body = { nombre: document.getElementById('nomCli').value, telefono: document.getElementById('telCli').value };
    const method = id ? 'PATCH' : 'POST';
    const url = id ? `${SB_URL}/clientes?id=eq.${id}` : `${SB_URL}/clientes`;
    
    await fetch(url, { method, headers, body: JSON.stringify(body) });
    bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
    await fetchClientes();
    renderTablas();
};

window.guardarModelo = async () => {
    const id = document.getElementById('editModId').value;
    const body = { nombre: document.getElementById('nomMod').value };
    const method = id ? 'PATCH' : 'POST';
    const url = id ? `${SB_URL}/modelos?id=eq.${id}` : `${SB_URL}/modelos`;
    
    await fetch(url, { method, headers, body: JSON.stringify(body) });
    bootstrap.Modal.getInstance(document.getElementById('modalModelo')).hide();
    await fetchModelos();
    renderTablas();
};

// --- HISTORIAL Y EDICIÓN NOTAS ---
async function fetchHistorial() {
    const res = await fetch(`${SB_URL}/notas?select=*,clientes(nombre)&order=created_at.desc`, { headers });
    const notas = await res.json();
    document.getElementById('tablaHistorialBody').innerHTML = notas.map(n => `
        <tr>
            <td class="px-4 small">${new Date(n.created_at).toLocaleDateString()}</td>
            <td class="fw-bold">${n.clientes ? n.clientes.nombre : 'S/N'}</td>
            <td class="text-primary fw-bold">$${n.total.toFixed(2)}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-outline-primary" onclick="abrirEditarNota('${n.id}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarNota('${n.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
}

window.abrirEditarNota = async (id) => {
    const res = await fetch(`${SB_URL}/detalle_notas?nota_id=eq.${id}`, { headers });
    const detalles = await res.json();
    document.getElementById('editNotaId').value = id;
    
    const container = document.getElementById('editItemsContainer');
    container.innerHTML = detalles.map(d => `
        <div class="row g-2 mb-2 edit-row">
            <div class="col-6"><input type="text" class="form-control bg-light" value="${d.modelo}" readonly></div>
            <div class="col-2"><input type="number" class="form-control edit-cant" value="${d.cantidad}" oninput="calcEdit()"></div>
            <div class="col-4"><input type="number" class="form-control edit-precio" value="${d.precio}" oninput="calcEdit()"></div>
        </div>`).join('');
    
    calcEdit();
    new bootstrap.Modal('#modalEditarNota').show();
};

window.calcEdit = () => {
    let t = 0;
    document.querySelectorAll('.edit-row').forEach(r => {
        t += (r.querySelector('.edit-cant').value * r.querySelector('.edit-precio').value);
    });
    document.getElementById('editTotalTxt').innerText = t.toFixed(2);
};

window.actualizarNota = async () => {
    const id = document.getElementById('editNotaId').value;
    const total = parseFloat(document.getElementById('editTotalTxt').innerText);
    await fetch(`${SB_URL}/notas?id=eq.${id}`, { method: 'PATCH', headers, body: JSON.stringify({ total }) });
    bootstrap.Modal.getInstance('#modalEditarNota').hide();
    Swal.fire('Éxito', 'Nota actualizada', 'success');
    fetchHistorial();
};

// --- ELIMINAR ---
window.eliminarRegistro = async (tabla, id) => {
    const res = await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true });
    if(res.isConfirmed) {
        await fetch(`${SB_URL}/${tabla}?id=eq.${id}`, { method: 'DELETE', headers });
        tabla === 'clientes' ? await fetchClientes() : await fetchModelos();
        renderTablas();
    }
};

window.eliminarNota = async (id) => {
    const res = await Swal.fire({ title: '¿Eliminar nota?', icon: 'warning', showCancelButton: true });
    if(res.isConfirmed) {
        await fetch(`${SB_URL}/notas?id=eq.${id}`, { method: 'DELETE', headers });
        fetchHistorial();
    }
};

// --- VENTAS ---
window.guardarNota = async () => {
    const cliId = document.getElementById('selCliente').value;
    const total = parseFloat(document.getElementById('totalTxt').innerText);
    if(!cliId || total <= 0) return Swal.fire('Error', 'Datos incompletos', 'info');

    const res = await fetch(`${SB_URL}/notas`, { method: 'POST', headers: {...headers, "Prefer": "return=representation"}, body: JSON.stringify({ cliente_id: cliId, total }) });
    const nota = await res.json();
    
    const items = Array.from(document.querySelectorAll('.item-row')).map(r => ({
        nota_id: nota[0].id,
        modelo: r.querySelector('.select-modelo').value,
        cantidad: r.querySelector('.input-cant').value,
        precio: r.querySelector('.input-precio').value
    }));

    await fetch(`${SB_URL}/detalle_notas`, { method: 'POST', headers, body: JSON.stringify(items) });
    Swal.fire('¡Éxito!', 'Venta guardada', 'success');
    document.getElementById('itemsContainer').innerHTML = "";
    document.getElementById('totalTxt').innerText = "0.00";
    addItem();
};

window.addItem = () => {
    const id = Date.now();
    const html = `<div class="row g-2 mb-3 item-row" id="item-${id}"><div class="col-5"><select class="form-select border-0 bg-light select-modelo">${appData.modelos.map(m => `<option>${m.nombre}</option>`).join('')}</select></div><div class="col-2"><input type="number" class="form-control border-0 bg-light input-cant" value="1" oninput="calcularTotal()"></div><div class="col-4"><input type="number" class="form-control border-0 bg-light input-precio" placeholder="Precio" oninput="calcularTotal()"></div><div class="col-1 text-end"><button class="btn text-danger" onclick="document.getElementById('item-${id}').remove(); calcularTotal();"><i class="bi bi-trash"></i></button></div></div>`;
    document.getElementById('itemsContainer').insertAdjacentHTML('beforeend', html);
};

window.calcularTotal = () => {
    let t = 0;
    document.querySelectorAll('.item-row').forEach(r => { t += (r.querySelector('.input-cant').value * r.querySelector('.input-precio').value); });
    document.getElementById('totalTxt').innerText = t.toFixed(2);
};

async function fetchClientes() { const r = await fetch(`${SB_URL}/clientes?select=*&order=nombre.asc`, { headers }); appData.clientes = await r.json(); }
async function fetchModelos() { const r = await fetch(`${SB_URL}/modelos?select=*&order=nombre.asc`, { headers }); appData.modelos = await r.json(); }
function renderSelectors() { document.getElementById('selCliente').innerHTML = '<option value="">-- Cliente --</option>' + appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); }

function renderTablas() {
    document.getElementById('tablaClientesBody').innerHTML = appData.clientes.map(c => `<tr><td class="px-4">${c.nombre}</td><td>${c.telefono || ''}</td><td class="text-end px-4"><button class="btn btn-sm btn-outline-primary" onclick="window.abrirModalCliente('${c.id}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('clientes','${c.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
    document.getElementById('tablaModelosBody').innerHTML = appData.modelos.map(m => `<tr><td class="px-4">${m.nombre}</td><td class="text-end px-4"><button class="btn btn-sm btn-outline-primary" onclick="window.abrirModalModelo('${m.id}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('modelos','${m.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
}
