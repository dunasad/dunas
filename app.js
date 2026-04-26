// CONFIGURACIÓN SUPABASE
const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; 
const headers = {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
};

// --- VARIABLES GLOBALES ---
let appData = { clientes: [], modelos: [] };
let objetoEliminar = { tabla: '', id: '', nombre: '' };
let modalConf, modalCli, modalMod;

// 1. FUNCIÓN DE LOGIN (CONSULTA A SUPABASE)
async function checkAccess() {
    const user = document.getElementById('userInput').value;
    const pass = document.getElementById('passInput').value;
    const btn = document.getElementById('btnLogin');

    if (!user || !pass) return alert("Por favor, completa los campos.");

    btn.disabled = true;
    btn.innerText = "Verificando...";

    try {
        // Consultamos la tabla 'usuarios' que creamos en Supabase
        const response = await fetch(`${SB_URL}/usuarios?usuario=eq.${user}&password=eq.${pass}&select=*`, { 
            method: 'GET', 
            headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } 
        });
        const data = await response.json();

        if (data && data.length > 0) {
            const nombreUsuario = data[0].nombre;
            // Ocultamos login y mostramos app
            document.getElementById('login-screen').classList.add('d-none');
            document.getElementById('main-app').classList.remove('d-none');
            
            notify(`Bienvenido, ${nombreUsuario}`, "bg-success");
            
            // Inicializamos la app después del login
            init();
        } else {
            alert("Usuario o contraseña incorrectos.");
            btn.disabled = false;
            btn.innerText = "ENTRAR AL PANEL";
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión con el servidor.");
        btn.disabled = false;
        btn.innerText = "ENTRAR AL PANEL";
    }
}

// 2. INICIALIZACIÓN DE LA APP
async function init() {
    try {
        // Inicializamos instancias de modales de Bootstrap
        modalConf = new bootstrap.Modal(document.getElementById('modalConfirmar'));
        modalCli = new bootstrap.Modal(document.getElementById('modalCliente'));
        modalMod = new bootstrap.Modal(document.getElementById('modalModelo'));

        // Cargamos datos iniciales
        await Promise.all([fetchClientes(), fetchModelos()]);
        renderSelectors();
        renderTablas();
        
        // Si tienes la función addItem() definida para las notas:
        if (typeof addItem === 'function') addItem();

        // Control del Sidebar
        const sideBtn = document.getElementById('sidebarCollapse');
        if(sideBtn) {
            sideBtn.onclick = () => document.getElementById('sidebar').classList.toggle('active');
        }
        
        // Botón de confirmación de eliminación
        document.getElementById('btnConfirmarEliminar').onclick = ejecutarEliminacion;

    } catch (e) { console.error("Error al iniciar app:", e); }
}

// 3. FETCH DE DATOS
async function fetchClientes() {
    const res = await fetch(`${SB_URL}/clientes?select=*&order=nombre.asc`, { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } });
    appData.clientes = await res.json();
}

async function fetchModelos() {
    const res = await fetch(`${SB_URL}/modelos?select=*&order=nombre.asc`, { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } });
    appData.modelos = await res.json();
}

// 4. NAVEGACIÓN
function showSection(section) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
    document.querySelectorAll('#sidebar li').forEach(li => li.classList.remove('active'));
    document.getElementById('sec-' + section).classList.remove('d-none');
    document.getElementById('menu-' + section).classList.add('active');
    
    const titulos = { 'notas': 'Crear Nota', 'historial': 'Historial', 'clientes': 'Clientes', 'modelos': 'Modelos' };
    document.getElementById('sectionTitle').innerText = titulos[section];
}

function notify(msg, color = 'bg-dark') {
    const toastEl = document.getElementById('liveToast');
    document.getElementById('toastMsg').innerText = msg;
    toastEl.className = `toast align-items-center text-white ${color} border-0 rounded-3`;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// 5. GESTIÓN DE CLIENTES
window.abrirModalCliente = (id = null) => {
    document.getElementById('editClienteId').value = id || '';
    if(id) {
        const c = appData.clientes.find(cli => cli.id == id);
        document.getElementById('cliNombre').value = c.nombre;
        document.getElementById('cliCiudad').value = c.destino || '';
        document.getElementById('cliTel').value = c.tel || '';
        document.getElementById('modalClienteTitulo').innerText = 'Editar Cliente';
    } else {
        document.getElementById('cliNombre').value = '';
        document.getElementById('cliCiudad').value = '';
        document.getElementById('cliTel').value = '';
        document.getElementById('modalClienteTitulo').innerText = 'Nuevo Cliente';
    }
    modalCli.show();
};

window.guardarCliente = async () => {
    const id = document.getElementById('editClienteId').value;
    const data = {
        nombre: document.getElementById('cliNombre').value,
        destino: document.getElementById('cliCiudad').value,
        tel: document.getElementById('cliTel').value
    };
    const url = id ? `${SB_URL}/clientes?id=eq.${id}` : `${SB_URL}/clientes`;
    const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers, body: JSON.stringify(data) });
    if(res.ok) {
        modalCli.hide();
        notify("Cliente guardado con éxito", "bg-success");
        await fetchClientes();
        renderTablas();
        renderSelectors();
    }
};

// 6. GESTIÓN DE MODELOS
window.abrirModalModelo = (id = null) => {
    document.getElementById('editModeloId').value = id || '';
    if(id) {
        const m = appData.modelos.find(mod => mod.id == id);
        document.getElementById('modNombre').value = m.nombre;
        document.getElementById('modalModeloTitulo').innerText = 'Editar Modelo';
    } else {
        document.getElementById('modNombre').value = '';
        document.getElementById('modalModeloTitulo').innerText = 'Nuevo Modelo';
    }
    modalMod.show();
};

window.guardarModelo = async () => {
    const id = document.getElementById('editModeloId').value;
    const data = { nombre: document.getElementById('modNombre').value };
    const url = id ? `${SB_URL}/modelos?id=eq.${id}` : `${SB_URL}/modelos`;
    const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers, body: JSON.stringify(data) });
    if(res.ok) {
        modalMod.hide();
        notify("Modelo guardado con éxito", "bg-success");
        await fetchModelos();
        renderTablas();
    }
};

// 7. ELIMINACIÓN
window.eliminarRegistro = (tabla, id, nombre) => {
    objetoEliminar = { tabla, id, nombre };
    document.getElementById('confirmMsgText').innerText = `¿Estás seguro de eliminar a "${nombre}"?`;
    modalConf.show();
};

async function ejecutarEliminacion() {
    modalConf.hide();
    const { tabla, id } = objetoEliminar;
    const res = await fetch(`${SB_URL}/${tabla}?id=eq.${id}`, { method: 'DELETE', headers });
    if(res.ok) {
        notify("Registro eliminado", "bg-danger");
        tabla === 'clientes' ? await fetchClientes() : await fetchModelos();
        if(tabla === 'clientes') renderSelectors();
        renderTablas();
    }
}

// 8. RENDERIZADO
function renderSelectors() {
    const sel = document.getElementById('selCliente');
    if(sel) {
        sel.innerHTML = '<option value="">-- Seleccionar Cliente --</option>' + 
            appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    }
}

function renderTablas() {
    const tbCli = document.getElementById('tablaClientesBody');
    if(tbCli) {
        tbCli.innerHTML = appData.clientes.map(c => `
        <tr>
            <td class="px-4 fw-bold">${c.nombre}</td>
            <td class="text-muted small">${c.destino || '-'}</td>
            <td class="text-muted small">${c.tel || '-'}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-light rounded-pill me-1" onclick="abrirModalCliente('${c.id}')"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="eliminarRegistro('clientes', '${c.id}', '${c.nombre}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
    }

    const tbMod = document.getElementById('tablaModelosBody');
    if(tbMod) {
        tbMod.innerHTML = appData.modelos.map(m => `
        <tr>
            <td class="px-4 fw-bold">${m.nombre}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-light rounded-pill me-1" onclick="abrirModalModelo('${m.id}')"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="eliminarRegistro('modelos', '${m.id}', '${m.nombre}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
    }
}

// RECUERDA DEFINIR TUS FUNCIONES addItem() y guardarNota() AQUÍ SI NO LAS TIENES
