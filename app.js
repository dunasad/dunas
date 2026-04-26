// CONFIGURACIÓN SUPABASE
const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; 
const headers = {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal" // Evita errores 401 al no pedir lectura tras escritura
};

let appData = { clientes: [], modelos: [] };
let objetoEliminar = { tabla: '', id: '', nombre: '' };
let modalConf, modalCli, modalMod;

// 1. INICIALIZACIÓN (Esperamos a que el DOM esté listo)
window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function checkAccess() {
    const user = document.getElementById('userInput').value;
    const pass = document.getElementById('passInput').value;
    const btn = document.getElementById('btnLogin');

    if (!user || !pass) return alert("Completa los campos");

    btn.disabled = true;
    btn.innerText = "Verificando...";

    try {
        // Consultamos si existe un usuario con esas credenciales
        const res = await fetch(`${SB_URL}/usuarios?usuario=eq.${user}&password=eq.${pass}&select=*`, { headers });
        const data = await res.json();

        if (data.length > 0) {
            // Guardamos el nombre en una variable o localStorage si quieres que la sesión persista
            const nombreUsuario = data[0].nombre;
            
            document.getElementById('login-screen').remove();
            document.getElementById('main-app').classList.remove('d-none');
            
            notify(`Bienvenido, ${nombreUsuario}`, "bg-success");
            init(); // Arrancamos la carga de la app
        } else {
            alert("Usuario o contraseña incorrectos");
            btn.disabled = false;
            btn.innerText = "ENTRAR";
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión");
        btn.disabled = false;
        btn.innerText = "ENTRAR";
    }
}

async function init() {
    try {
        // Inicializar instancias de modales
        modalConf = new bootstrap.Modal(document.getElementById('modalConfirmar'));
        modalCli = new bootstrap.Modal(document.getElementById('modalCliente'));
        modalMod = new bootstrap.Modal(document.getElementById('modalModelo'));

        await Promise.all([fetchClientes(), fetchModelos()]);
        renderSelectors();
        renderTablas();
        addItem();

        document.getElementById('sidebarCollapse').onclick = () => {
            document.getElementById('sidebar').classList.toggle('active');
        };
        
        document.getElementById('btnConfirmarEliminar').onclick = ejecutarEliminacion;

    } catch (e) { console.error(e); }
}

// 2. FETCH DATOS
async function fetchClientes() {
    const res = await fetch(`${SB_URL}/clientes?select=*&order=nombre.asc`, { headers });
    appData.clientes = await res.json();
}

async function fetchModelos() {
    const res = await fetch(`${SB_URL}/modelos?select=*&order=nombre.asc`, { headers });
    appData.modelos = await res.json();
}

// 3. NAVEGACIÓN Y UI
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
    new bootstrap.Toast(toastEl).show();
}

// 4. GESTIÓN CLIENTES
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
        notify("Cliente guardado", "bg-success");
        await fetchClientes();
        renderTablas();
        renderSelectors();
    }
};

// 5. GESTIÓN MODELOS
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
        notify("Modelo guardado", "bg-success");
        await fetchModelos();
        renderTablas();
    }
};

// 6. ELIMINACIÓN
window.eliminarRegistro = (tabla, id, nombre) => {
    objetoEliminar = { tabla, id, nombre };
    document.getElementById('confirmMsgText').innerText = `¿Eliminar a "${nombre}"?`;
    modalConf.show();
};

async function ejecutarEliminacion() {
    modalConf.hide();
    const { tabla, id } = objetoEliminar;
    const res = await fetch(`${SB_URL}/${tabla}?id=eq.${id}`, { method: 'DELETE', headers });
    if(res.ok) {
        notify("Eliminado", "bg-danger");
        tabla === 'clientes' ? await fetchClientes() : await fetchModelos();
        if(tabla === 'clientes') renderSelectors();
        renderTablas();
    }
}

// 7. RENDERIZADO
function renderSelectors() {
    const sel = document.getElementById('selCliente');
    sel.innerHTML = '<option value="">-- Seleccionar --</option>' + 
        appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

function renderTablas() {
    document.getElementById('tablaClientesBody').innerHTML = appData.clientes.map(c => `
        <tr>
            <td class="px-4 fw-bold">${c.nombre}</td>
            <td class="text-muted small">${c.destino || '-'}</td>
            <td class="text-muted small">${c.tel || '-'}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-light rounded-pill me-1" onclick="abrirModalCliente('${c.id}')"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="eliminarRegistro('clientes', '${c.id}', '${c.nombre}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');

    document.getElementById('tablaModelosBody').innerHTML = appData.modelos.map(m => `
        <tr>
            <td class="px-4 fw-bold">${m.nombre}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-light rounded-pill me-1" onclick="abrirModalModelo('${m.id}')"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="eliminarRegistro('modelos', '${m.id}', '${m.nombre}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');
}

// 8. FUNCIONES DE NOTAS (Simplificadas para el ejemplo)
window.addItem = () => { /* lógica de agregar fila que ya tienes */ };
window.guardarNota = async () => { /* lógica de guardar nota que ya tienes */ };
