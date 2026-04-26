const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; 
const headers = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

let appData = { clientes: [], modelos: [], notas: [] };

// Iniciar app
async function init() {
    await fetchClientes();
    await fetchModelos();
    renderSelectors();
    addItem();
}

async function checkAccess() {
    const user = document.getElementById('userInput').value;
    const pass = document.getElementById('passInput').value;
    if (user === "admin" && pass === "1234") { // Cambiar por validación Supabase si prefieres
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('main-app').classList.remove('d-none');
        await init();
    } else { alert("Error"); }
}

// Navegación Blindada
window.showSection = (section) => {
    const sections = ['notas', 'historial', 'clientes', 'modelos'];
    sections.forEach(s => {
        const el = document.getElementById('sec-' + s);
        const menu = document.getElementById('menu-' + s);
        if(el) el.classList.add('d-none');
        if(menu) menu.classList.remove('active');
    });

    document.getElementById('sec-' + section).classList.remove('d-none');
    document.getElementById('menu-' + section).classList.add('active');
    
    const titulos = { notas: 'Crear Nota', historial: 'Historial de Notas', clientes: 'Clientes', modelos: 'Modelos' };
    document.getElementById('sectionTitle').innerText = titulos[section];

    if (section === 'historial') fetchHistorial();
};

// Carga de Historial
async function fetchHistorial() {
    const tbody = document.getElementById('tablaHistorialBody');
    const noData = document.getElementById('noDataMsg');
    tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Cargando...</td></tr>";

    try {
        const res = await fetch(`${SB_URL}/notas?select=*,clientes(nombre)&order=created_at.desc`, { headers });
        const notas = await res.json();
        
        if (notas.length === 0) {
            tbody.innerHTML = "";
            noData.classList.remove('d-none');
            return;
        }

        noData.classList.add('d-none');
        tbody.innerHTML = notas.map(n => `
            <tr>
                <td>${new Date(n.created_at).toLocaleDateString()}</td>
                <td class="fw-bold">${n.clientes?.nombre || 'General'}</td>
                <td class="text-primary fw-bold">$${parseFloat(n.total).toFixed(2)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-light me-2" onclick="imprimirNota('${n.id}')"><i class="bi bi-printer"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarNota('${n.id}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = "<tr><td colspan='4' class='text-center text-danger'>Error al cargar historial</td></tr>";
    }
}

// Eliminar Nota
window.eliminarNota = async (id) => {
    if (!confirm("¿Seguro que quieres eliminar esta nota?")) return;
    try {
        await fetch(`${SB_URL}/notas?id=eq.${id}`, { method: 'DELETE', headers });
        fetchHistorial();
    } catch (e) { alert("Error al eliminar"); }
};

// Funciones de Venta
window.addItem = () => {
    const id = Date.now();
    const html = `
        <div class="row g-2 mb-3 item-row" id="item-${id}">
            <div class="col-6">
                <select class="form-select border-0 bg-light select-modelo">
                    ${appData.modelos.map(m => `<option>${m.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="col-2"><input type="number" class="form-control border-0 bg-light input-cant" value="1" oninput="calcularTotal()"></div>
            <div class="col-3"><input type="number" class="form-control border-0 bg-light input-precio" placeholder="Precio" oninput="calcularTotal()"></div>
            <div class="col-1 text-end"><button class="btn text-danger" onclick="document.getElementById('item-${id}').remove(); calcularTotal();"><i class="bi bi-trash"></i></button></div>
        </div>`;
    document.getElementById('itemsContainer').insertAdjacentHTML('beforeend', html);
};

window.calcularTotal = () => {
    let t = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const c = row.querySelector('.input-cant').value || 0;
        const p = row.querySelector('.input-precio').value || 0;
        t += (c * p);
    });
    document.getElementById('totalTxt').innerText = t.toFixed(2);
};

async function fetchClientes() {
    const res = await fetch(`${SB_URL}/clientes?select=*&order=nombre.asc`, { headers });
    appData.clientes = await res.json();
}

async function fetchModelos() {
    const res = await fetch(`${SB_URL}/modelos?select=*&order=nombre.asc`, { headers });
    appData.modelos = await res.json();
}

function renderSelectors() {
    document.getElementById('selCliente').innerHTML = '<option value="">-- Seleccionar --</option>' + 
        appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}
