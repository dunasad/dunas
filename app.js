const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; 
const headers = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

let appData = { clientes: [], modelos: [], notas: [] };

// LOGIN
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
        } else { alert("Error de acceso"); }
    } catch (e) { console.error(e); }
}

// INICIALIZACIÓN
async function init() {
    await Promise.all([fetchClientes(), fetchModelos()]);
    renderSelectors();
    renderTablas(); // Renderizar clientes y modelos en sus secciones
    addItem();
}

// NAVEGACIÓN
window.showSection = (section) => {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
    document.querySelectorAll('#sidebar li').forEach(li => li.classList.remove('active'));
    const sec = document.getElementById('sec-' + section);
    const menu = document.getElementById('menu-' + section);
    if(sec) sec.classList.remove('d-none');
    if(menu) menu.classList.add('active');
    if(section === 'historial') fetchHistorial();
};

// --- GESTIÓN DE CLIENTES ---
window.abrirModalCliente = () => { new bootstrap.Modal('#modalCliente').show(); };
window.guardarCliente = async () => {
    const nombre = document.getElementById('nomCli').value;
    const telefono = document.getElementById('telCli').value;
    await fetch(`${SB_URL}/clientes`, { method: 'POST', headers, body: JSON.stringify({ nombre, telefono }) });
    bootstrap.Modal.getInstance('#modalCliente').hide();
    await fetchClientes();
    renderTablas();
    renderSelectors();
};

// --- GESTIÓN DE MODELOS ---
window.abrirModalModelo = () => { new bootstrap.Modal('#modalModelo').show(); };
window.guardarModelo = async () => {
    const nombre = document.getElementById('nomMod').value;
    await fetch(`${SB_URL}/modelos`, { method: 'POST', headers, body: JSON.stringify({ nombre }) });
    bootstrap.Modal.getInstance('#modalModelo').hide();
    await fetchModelos();
    renderTablas();
};

// --- RENDERIZADO DE TABLAS ---
function renderTablas() {
    const tbodyCli = document.getElementById('tablaClientesBody');
    const tbodyMod = document.getElementById('tablaModelosBody');
    
    tbodyCli.innerHTML = appData.clientes.map(c => `<tr><td class="px-4">${c.nombre}</td><td>${c.telefono || ''}</td><td class="text-end px-4"><button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('clientes','${c.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
    tbodyMod.innerHTML = appData.modelos.map(m => `<tr><td class="px-4">${m.nombre}</td><td class="text-end px-4"><button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro('modelos','${m.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
}

window.eliminarRegistro = async (tabla, id) => {
    if(!confirm("¿Eliminar registro?")) return;
    await fetch(`${SB_URL}/${tabla}?id=eq.${id}`, { method: 'DELETE', headers });
    tabla === 'clientes' ? await fetchClientes() : await fetchModelos();
    renderTablas();
    renderSelectors();
};

// --- EL RESTO DE FUNCIONES (HISTORIAL, NOTAS, ETC.) ---
async function fetchHistorial() {
    const tbody = document.getElementById('tablaHistorialBody');
    const res = await fetch(`${SB_URL}/notas?select=*,clientes(nombre)&order=created_at.desc`, { headers });
    const notas = await res.json();
    tbody.innerHTML = notas.map(n => `<tr><td class="px-4 small">${new Date(n.created_at).toLocaleDateString()}</td><td class="fw-bold">${n.clientes ? n.clientes.nombre : 'S/N'}</td><td class="text-primary fw-bold">$${n.total.toFixed(2)}</td><td class="text-end px-4"><button class="btn btn-sm btn-light border me-1"><i class="bi bi-printer"></i></button><button class="btn btn-sm btn-outline-danger" onclick="eliminarNota('${n.id}')"><i class="bi bi-trash"></i></button></td></tr>`).join('');
}

window.guardarNota = async () => {
    const clienteId = document.getElementById('selCliente').value;
    const total = parseFloat(document.getElementById('totalTxt').innerText);
    const resNota = await fetch(`${SB_URL}/notas`, { method: 'POST', headers: { ...headers, "Prefer": "return=representation" }, body: JSON.stringify({ cliente_id: clienteId, total: total }) });
    const dataNota = await resNota.json();
    const notaId = dataNota[0].id;
    const detalles = Array.from(document.querySelectorAll('.item-row')).map(row => ({
        nota_id: notaId,
        modelo: row.querySelector('.select-modelo').value,
        cantidad: parseInt(row.querySelector('.input-cant').value),
        precio: parseFloat(row.querySelector('.input-precio').value)
    }));
    await fetch(`${SB_URL}/detalle_notas`, { method: 'POST', headers, body: JSON.stringify(detalles) });
    alert("¡Nota guardada!");
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
function renderSelectors() { document.getElementById('selCliente').innerHTML = '<option value="">-- Cliente --</option>' + appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join(''); }
window.eliminarNota = async (id) => { if(confirm("¿Eliminar?")) { await fetch(`${SB_URL}/notas?id=eq.${id}`, { method: 'DELETE', headers }); fetchHistorial(); } };
