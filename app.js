const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; 
const headers = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

let appData = { clientes: [], modelos: [], notas: [] };

// --- ACCESO ---
async function checkAccess() {
    const user = document.getElementById('userInput').value;
    const pass = document.getElementById('passInput').value;
    try {
        const response = await fetch(`${SB_URL}/usuarios?usuario=eq.${user}&password=eq.${pass}&select=*`, { headers });
        const data = await response.json();
        if (data.length > 0) {
            document.getElementById('login-screen').classList.add('d-none');
            document.getElementById('main-app').classList.remove('d-none');
            await init();
        } else { alert("Credenciales incorrectas"); }
    } catch (e) { console.error(e); }
}

// --- INICIALIZACIÓN ---
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
    const sec = document.getElementById('sec-' + section);
    const menu = document.getElementById('menu-' + section);
    if(sec) sec.classList.remove('d-none');
    if(menu) menu.classList.add('active');
    if(section === 'historial') fetchHistorial();
};

// --- GESTIÓN DE CLIENTES (CREAR / EDITAR) ---
window.abrirModalCliente = (id = null) => {
    const modal = new bootstrap.Modal('#modalCliente');
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

window.guardarCliente = async () => {
    const id = document.getElementById('editCliId').value;
    const nombre = document.getElementById('nomCli').value;
    const telefono = document.getElementById('telCli').value;
    const body = JSON.stringify({ nombre, telefono });
    
    const url = id ? `${SB_URL}/clientes?id=eq.${id}` : `${SB_URL}/clientes`;
    const method = id ? 'PATCH' : 'POST';

    await fetch(url, { method, headers, body });
    bootstrap.Modal.getInstance('#modalCliente').hide();
    await fetchClientes();
    renderTablas();
    renderSelectors();
};

// --- GESTIÓN DE MODELOS (CREAR / EDITAR) ---
window.abrirModalModelo = (id = null) => {
    const modal = new bootstrap.Modal('#modalModelo');
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

window.guardarModelo = async () => {
    const id = document.getElementById('editModId').value;
    const nombre = document.getElementById('nomMod').value;
    const body = JSON.stringify({ nombre });
    
    const url = id ? `${SB_URL}/modelos?id=eq.${id}` : `${SB_URL}/modelos`;
    const method = id ? 'PATCH' : 'POST';

    await fetch(url, { method, headers, body });
    bootstrap.Modal.getInstance('#modalModelo').hide();
    await fetchModelos();
    renderTablas();
};

// --- RENDERIZADO DE TABLAS ---
function renderTablas() {
    const tbodyCli = document.getElementById('tablaClientesBody');
    const tbodyMod = document.getElementById('tablaModelosBody');
    
    tbodyCli.innerHTML = appData.clientes.map(c => `
        <tr>
            <td class="px-4">${c.nombre}</td>
            <td>${c.telefono || ''}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalCliente('${c.id}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('clientes','${c.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');

    tbodyMod.innerHTML = appData.modelos.map(m => `
        <tr>
            <td class="px-4">${m.nombre}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalModelo('${m.id}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('modelos','${m.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
}

window.eliminarRegistro = async (tabla, id) => {
    if(!confirm("¿Seguro que quieres eliminar este registro?")) return;
    await fetch(`${SB_URL}/${tabla}?id=eq.${id}`, { method: 'DELETE', headers });
    tabla === 'clientes' ? await fetchClientes() : await fetchModelos();
    renderTablas();
    renderSelectors();
};

// --- HISTORIAL ---
async function fetchHistorial() {
    const tbody = document.getElementById('tablaHistorialBody');
    const res = await fetch(`${SB_URL}/notas?select=*,clientes(nombre)&order=created_at.desc`, { headers });
    const notas = await res.json();
    tbody.innerHTML = notas.map(n => `
        <tr>
            <td class="px-4 small">${new Date(n.created_at).toLocaleDateString()}</td>
            <td class="fw-bold">${n.clientes ? n.clientes.nombre : 'S/N'}</td>
            <td class="text-primary fw-bold">$${n.total.toFixed(2)}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-light border me-1"><i class="bi bi-printer"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarNota('${n.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
}

window.eliminarNota = async (id) => {
    if(!confirm("¿Seguro que quieres eliminar esta nota de venta?")) return;
    await fetch(`${SB_URL}/notas?id=eq.${id}`, { method: 'DELETE', headers });
    fetchHistorial();
};

// --- VENTAS ---
window.guardarNota = async () => {
    const clienteId = document.getElementById('selCliente').value;
    const total = parseFloat(document.getElementById('totalTxt').innerText);
    if(!clienteId || total <= 0) return alert("Selecciona un cliente y agrega productos");

    const resNota = await fetch(`${SB_URL}/notas`, { 
        method: 'POST', 
        headers: { ...headers, "Prefer": "return=representation" }, 
        body: JSON.stringify({ cliente_id: clienteId, total: total }) 
    });
    const dataNota = await resNota.json();
    const notaId = dataNota[0].id;

    const detalles = Array.from(document.querySelectorAll('.item-row')).map(row => ({
        nota_id: notaId,
        modelo: row.querySelector('.select-modelo').value,
        cantidad: parseInt(row.querySelector('.input-cant').value),
        precio: parseFloat(row.querySelector('.input-precio').value)
    }));

    await fetch(`${SB_URL}/detalle_notas`, { method: 'POST', headers, body: JSON.stringify(detalles) });
    alert("¡Nota guardada con éxito!");
    location.reload();
};

window.addItem = () => {
    const id = Date.now();
    const html = `<div class="row g-2 mb-3 item-row" id="item-${id}"><div class="col-5"><select class="form-select border-0 bg-light select-modelo">${appData.modelos.map(m => `<option>${m.nombre}</option>`).join('')}</select></div><div class="col-2"><input type="number" class="form-control border-0 bg-light input-cant" value="1" oninput="calcularTotal()"></div><div class="col-4"><input type="number" class="form-control border-0 bg-light input-precio" placeholder="Precio" oninput="calcularTotal()"></div><div class="col-1 text-end"><button class="btn text-danger p-0" onclick="document.getElementById('item-${id}').remove(); calcularTotal();"><i class="bi bi-trash"></i></button></div></div>`;
    document.getElementById('itemsContainer').insertAdjacentHTML('beforeend', html);
};

window.calcularTotal = () => {
    let t = 0;
    document.querySelectorAll('.item-row').forEach(r => { t += (r.querySelector('.input-cant').value * r.querySelector('.input-precio').value); });
    document.getElementById('totalTxt').innerText = t.toFixed(2);
};

async function fetchClientes() { const res = await fetch(`${SB_URL}/clientes?select=*&order=nombre.asc`, { headers }); appData.clientes = await res.json(); }
async function fetchModelos() { const res = await fetch(`${SB_URL}/modelos?select=*&order=nombre.asc`, { headers }); appData.modelos = await res.json(); }
function renderSelectors() { document.getElementById('selCliente').innerHTML = '<option value="">-- Seleccionar Cliente --</option>' + appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); }
