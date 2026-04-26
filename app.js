const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; 
const headers = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

let appData = { clientes: [], modelos: [] };

// --- PERSISTENCIA Y LOGIN ---
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('dunas_session');
    if (session) {
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('main-app').classList.remove('d-none');
        init();
    }
});

async function checkAccess() {
    const user = document.getElementById('userInput').value;
    const pass = document.getElementById('passInput').value;
    const res = await fetch(`${SB_URL}/usuarios?usuario=eq.${user}&password=eq.${pass}&select=*`, { headers });
    const data = await res.json();
    if (data.length > 0) {
        localStorage.setItem('dunas_session', 'true');
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('main-app').classList.remove('d-none');
        init();
    } else { Swal.fire('Error', 'Datos incorrectos', 'error'); }
}

window.logout = () => {
    localStorage.removeItem('dunas_session');
    location.reload();
};

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

// --- GESTIÓN DE NOTAS (VENTAS) ---
window.addItem = () => {
    const id = Date.now();
    const html = `
        <div class="row g-2 mb-3 item-row" id="item-${id}">
            <div class="col-4">
                <select class="form-select border-0 bg-light select-modelo">${appData.modelos.map(m => `<option>${m.nombre}</option>`).join('')}</select>
            </div>
            <div class="col-3">
                <input type="text" class="form-control border-0 bg-light input-desc" placeholder="Talla/Color/Obs">
            </div>
            <div class="col-2">
                <input type="number" class="form-control border-0 bg-light input-cant" value="1" oninput="calcularTotal()">
            </div>
            <div class="col-2">
                <input type="number" class="form-control border-0 bg-light input-precio" placeholder="Precio" oninput="calcularTotal()">
            </div>
            <div class="col-1 text-end">
                <button class="btn text-danger" onclick="document.getElementById('item-${id}').remove(); calcularTotal();"><i class="bi bi-trash"></i></button>
            </div>
        </div>`;
    document.getElementById('itemsContainer').insertAdjacentHTML('beforeend', html);
};

window.calcularTotal = () => {
    let t = 0;
    document.querySelectorAll('.item-row').forEach(r => {
        const c = r.querySelector('.input-cant').value || 0;
        const p = r.querySelector('.input-precio').value || 0;
        t += (c * p);
    });
    document.getElementById('totalTxt').innerText = t.toFixed(2);
};

window.guardarNota = async () => {
    const cliId = document.getElementById('selCliente').value;
    const total = parseFloat(document.getElementById('totalTxt').innerText);
    if(!cliId || total <= 0) return Swal.fire('Atención', 'Selecciona cliente y productos', 'info');

    const res = await fetch(`${SB_URL}/notas`, { method: 'POST', headers: {...headers, "Prefer": "return=representation"}, body: JSON.stringify({ cliente_id: cliId, total }) });
    const nota = await res.json();
    
    const items = Array.from(document.querySelectorAll('.item-row')).map(r => ({
        nota_id: nota[0].id,
        modelo: r.querySelector('.select-modelo').value,
        descripcion: r.querySelector('.input-desc').value, // Campo recuperado
        cantidad: r.querySelector('.input-cant').value,
        precio: r.querySelector('.input-precio').value
    }));

    await fetch(`${SB_URL}/detalle_notas`, { method: 'POST', headers, body: JSON.stringify(items) });
    Swal.fire('Guardado', 'Venta registrada con éxito', 'success');
    document.getElementById('itemsContainer').innerHTML = "";
    document.getElementById('totalTxt').innerText = "0.00";
    addItem();
};

// --- HISTORIAL Y EDICIÓN ---
async function fetchHistorial() {
    const res = await fetch(`${SB_URL}/notas?select=*,clientes(nombre)&order=created_at.desc`, { headers });
    const notas = await res.json();
    document.getElementById('tablaHistorialBody').innerHTML = notas.map(n => `
        <tr>
            <td class="px-4 small">${new Date(n.created_at).toLocaleDateString()}</td>
            <td class="fw-bold">${n.clientes ? n.clientes.nombre : 'N/A'}</td>
            <td class="text-primary fw-bold">$${n.total.toFixed(2)}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirEditarNota('${n.id}')"><i class="bi bi-pencil"></i></button>
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
            <div class="col-4"><input type="text" class="form-control bg-light" value="${d.modelo}" readonly></div>
            <div class="col-3"><input type="text" class="form-control edit-desc" value="${d.descripcion || ''}" placeholder="Desc"></div>
            <div class="col-2"><input type="number" class="form-control edit-cant" value="${d.cantidad}" oninput="calcEdit()"></div>
            <div class="col-3"><input type="number" class="form-control edit-precio" value="${d.precio}" oninput="calcEdit()"></div>
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
    
    // 1. Actualizar total
    await fetch(`${SB_URL}/notas?id=eq.${id}`, { method: 'PATCH', headers, body: JSON.stringify({ total }) });
    
    // 2. Aquí podrías añadir lógica para actualizar detalles si fuera necesario, 
    // por ahora actualizamos el total y cerramos.
    bootstrap.Modal.getInstance(document.getElementById('modalEditarNota')).hide();
    Swal.fire('Actualizado', 'Nota modificada', 'success');
    fetchHistorial();
};

// --- CLIENTES Y MODELOS ---
window.abrirModalCliente = (id = null) => {
    const m = new bootstrap.Modal('#modalCliente');
    if(id) {
        const c = appData.clientes.find(x => x.id == id);
        document.getElementById('editCliId').value = c.id;
        document.getElementById('nomCli').value = c.nombre;
        document.getElementById('telCli').value = c.telefono;
    } else {
        document.getElementById('editCliId').value = "";
        document.getElementById('nomCli').value = "";
        document.getElementById('telCli').value = "";
    }
    m.show();
};

window.guardarCliente = async () => {
    const id = document.getElementById('editCliId').value;
    const body = { nombre: document.getElementById('nomCli').value, telefono: document.getElementById('telCli').value };
    const url = id ? `${SB_URL}/clientes?id=eq.${id}` : `${SB_URL}/clientes`;
    await fetch(url, { method: id ? 'PATCH' : 'POST', headers, body: JSON.stringify(body) });
    bootstrap.Modal.getInstance('#modalCliente').hide();
    await fetchClientes();
    renderTablas();
};

// --- ELIMINAR ---
window.eliminarNota = async (id) => {
    const r = await Swal.fire({ title: '¿Eliminar Nota?', text: 'Se borrará del historial', icon: 'warning', showCancelButton: true });
    if(r.isConfirmed) {
        await fetch(`${SB_URL}/notas?id=eq.${id}`, { method: 'DELETE', headers });
        fetchHistorial();
    }
};

window.eliminarRegistro = async (tabla, id) => {
    const r = await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true });
    if(r.isConfirmed) {
        await fetch(`${SB_URL}/${tabla}?id=eq.${id}`, { method: 'DELETE', headers });
        tabla === 'clientes' ? await fetchClientes() : await fetchModelos();
        renderTablas();
    }
};

// --- FETCH & RENDER ---
async function fetchClientes() { const r = await fetch(`${SB_URL}/clientes?select=*&order=nombre.asc`, { headers }); appData.clientes = await r.json(); }
async function fetchModelos() { const r = await fetch(`${SB_URL}/modelos?select=*&order=nombre.asc`, { headers }); appData.modelos = await r.json(); }
function renderSelectors() { document.getElementById('selCliente').innerHTML = '<option value="">-- Cliente --</option>' + appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); }

function renderTablas() {
    document.getElementById('tablaClientesBody').innerHTML = appData.clientes.map(c => `<tr><td class="px-4">${c.nombre}</td><td>${c.telefono || ''}</td><td class="text-end px-4"><button class="btn btn-sm btn-outline-primary me-1" onclick="window.abrirModalCliente('${c.id}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('clientes','${c.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
    document.getElementById('tablaModelosBody').innerHTML = appData.modelos.map(m => `<tr><td class="px-4">${m.nombre}</td><td class="text-end px-4"><button class="btn btn-sm btn-outline-primary me-1" onclick="window.abrirModalModelo('${m.id}')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('modelos','${m.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
}
