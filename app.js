const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; // Tu anon key completa

const headers = {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
};

let appData = {
    clientes: [],
    modelos: [],
    notas: []
};

// Instancias de Modales de Bootstrap
let modalCli, modalMod;

// 1. INICIALIZACIÓN
async function init() {
    try {
        await Promise.all([fetchClientes(), fetchModelos()]);
        renderSelectors();
        renderTablas();
        addItem(); 
        
        // Configurar el botón del sidebar
        document.getElementById('sidebarCollapse').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    } catch (error) {
        console.error("Error al iniciar:", error);
        notify("Error al conectar con la base de datos", "bg-danger");
    }
}

// 2. OBTENCIÓN DE DATOS (FETCH)
async function fetchClientes() {
    const res = await fetch(`${SB_URL}/clientes?select=*&order=nombre.asc`, { headers });
    appData.clientes = await res.json();
}

async function fetchModelos() {
    const res = await fetch(`${SB_URL}/modelos?select=*&order=nombre.asc`, { headers });
    appData.modelos = await res.json();
}

// 3. NAVEGACIÓN Y NOTIFICACIONES
function showSection(section) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
    document.querySelectorAll('#sidebar li').forEach(li => li.classList.remove('active'));
    
    document.getElementById('sec-' + section).classList.remove('d-none');
    document.getElementById('menu-' + section).classList.add('active');
    
    const titulos = {
        'notas': 'Crear Nota',
        'historial': 'Historial de Ventas',
        'clientes': 'Administrar Clientes',
        'modelos': 'Administrar Modelos'
    };
    document.getElementById('sectionTitle').innerText = titulos[section];
    
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('active');
    }
}

function notify(msg, color = 'bg-dark') {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastMsg');
    toastEl.className = `toast align-items-center text-white ${color} border-0 rounded-3 shadow`;
    toastBody.innerText = msg;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// 4. GESTIÓN DE NOTAS (VENTAS)
function addItem() {
    const container = document.getElementById('itemsContainer');
    const div = document.createElement('div');
    div.className = 'item-row card p-3 mb-2 border-0 bg-light rounded-3';
    
    const opcionesModelos = appData.modelos.map(m => 
        `<option value="${m.id}">${m.nombre}</option>`
    ).join('');

    div.innerHTML = `
        <div class="row g-2">
            <div class="col-12 mb-1">
                <select class="form-select sel-modelo fw-bold border-0 bg-white">${opcionesModelos}</select>
            </div>
            <div class="col-12 mb-2">
                <input type="text" class="form-control form-control-sm in-desc border-0 bg-white" placeholder="Descripción">
            </div>
            <div class="col-4">
                <input type="number" class="form-control in-cant border-0" placeholder="Cant." oninput="actualizarTotal()">
            </div>
            <div class="col-4">
                <input type="number" class="form-control in-precio border-0" placeholder="Precio" oninput="actualizarTotal()">
            </div>
            <div class="col-4 d-flex align-items-center justify-content-end">
                <button class="btn btn-sm btn-link text-danger p-0" onclick="this.closest('.item-row').remove(); actualizarTotal();">
                    <i class="bi bi-trash fs-5"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(div);
}

function actualizarTotal() {
    let total = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const cant = parseFloat(row.querySelector('.in-cant').value) || 0;
        const prec = parseFloat(row.querySelector('.in-precio').value) || 0;
        total += (cant * prec);
    });
    document.getElementById('totalTxt').innerText = total.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

async function guardarNota() {
    const clienteId = document.getElementById('selCliente').value;
    const filas = document.querySelectorAll('.item-row');
    if (!clienteId || filas.length === 0) return notify("Faltan datos", "bg-warning");

    try {
        // Guardar Nota Principal
        const resNota = await fetch(`${SB_URL}/notas`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                cliente_id: clienteId,
                total: parseFloat(document.getElementById('totalTxt').innerText.replace(/,/g, '')),
                fecha: new Date().toISOString().split('T')[0]
            })
        });

        const datosNota = await resNota.json();
        const nuevoIdNota = datosNota[0].id;

        // Guardar Detalles
        const detalles = [];
        filas.forEach(row => {
            const mId = row.querySelector('.sel-modelo').value;
            const cant = parseInt(row.querySelector('.in-cant').value) || 0;
            const prec = parseFloat(row.querySelector('.in-precio').value) || 0;
            if (mId && cant > 0) {
                detalles.push({
                    nota_id: nuevoIdNota,
                    modelo_id: mId,
                    descripcion: row.querySelector('.in-desc').value,
                    cantidad: cant,
                    precio: prec,
                    total: cant * prec
                });
            }
        });

        await fetch(`${SB_URL}/detalle_notas`, {
            method: 'POST',
            headers,
            body: JSON.stringify(detalles)
        });

        notify("Nota guardada con éxito", "bg-success");
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        notify("Error al guardar", "bg-danger");
    }
}

// 5. GESTIÓN DE CLIENTES
function abrirModalCliente(id = null) {
    modalCli = new bootstrap.Modal(document.getElementById('modalCliente'));
    document.getElementById('editClienteId').value = id || '';
    
    if(id) {
        const c = appData.clientes.find(cli => cli.id === id);
        document.getElementById('cliNombre').value = c.nombre;
        document.getElementById('cliCiudad').value = c.destino || ''; // Mapea destino al input
        document.getElementById('cliTel').value = c.tel || '';        // Mapea tel al input
        document.getElementById('modalClienteTitulo').innerText = 'Editar Cliente';
    } else {
        document.getElementById('cliNombre').value = '';
        document.getElementById('cliCiudad').value = '';
        document.getElementById('cliTel').value = '';
        document.getElementById('modalClienteTitulo').innerText = 'Nuevo Cliente';
    }
    modalCli.show();
}

async function guardarCliente() {
    const id = document.getElementById('editClienteId').value;
    const data = {
        nombre: document.getElementById('cliNombre').value,
        destino: document.getElementById('cliCiudad').value, // Se guarda como 'destino'
        tel: document.getElementById('cliTel').value        // Se guarda como 'tel'
    };

    const url = id ? `${SB_URL}/clientes?id=eq.${id}` : `${SB_URL}/clientes`;
    const method = id ? 'PATCH' : 'POST';

    const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
    if(res.ok) {
        notify(id ? "Cliente actualizado" : "Cliente registrado", "bg-success");
        modalCli.hide();
        await fetchClientes();
        renderTablas();
        renderSelectors();
    }
}

// 6. GESTIÓN DE MODELOS
function abrirModalModelo(id = null) {
    modalMod = new bootstrap.Modal(document.getElementById('modalModelo'));
    document.getElementById('editModeloId').value = id || '';
    
    if(id) {
        const m = appData.modelos.find(mod => mod.id === id);
        document.getElementById('modNombre').value = m.nombre;
        document.getElementById('modalModeloTitulo').innerText = 'Editar Modelo';
    } else {
        document.getElementById('modNombre').value = '';
        document.getElementById('modalModeloTitulo').innerText = 'Nuevo Modelo';
    }
    modalMod.show();
}

async function guardarModelo() {
    const id = document.getElementById('editModeloId').value;
    const data = { nombre: document.getElementById('modNombre').value };

    const url = id ? `${SB_URL}/modelos?id=eq.${id}` : `${SB_URL}/modelos`;
    const method = id ? 'PATCH' : 'POST';

    const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
    if(res.ok) {
        notify("Modelo actualizado", "bg-success");
        modalMod.hide();
        await fetchModelos();
        renderTablas();
    }
}

// 7. RENDERIZADO DE INTERFAZ
function renderSelectors() {
    const sel = document.getElementById('selCliente');
    sel.innerHTML = '<option value="">-- Seleccionar --</option>' + 
        appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

function renderTablas() {
    // Tabla Clientes
    const tbodyCli = document.getElementById('tablaClientesBody');
    tbodyCli.innerHTML = appData.clientes.map(c => `
        <tr>
            <td class="px-4 fw-bold">${c.nombre}</td>
            <td class="text-muted small">${c.ciudad || c.destino || '-'}</td>
            <td class="text-muted small">${c.telefono || c.tel || '-'}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-light rounded-pill me-1" onclick="abrirModalCliente('${c.id}')">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="eliminarRegistro('clientes', '${c.id}', '${c.nombre}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Tabla Modelos
    const tbodyMod = document.getElementById('tablaModelosBody');
    tbodyMod.innerHTML = appData.modelos.map(m => `
        <tr>
            <td class="px-4 fw-bold">${m.nombre}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-light rounded-pill me-1" onclick="abrirModalModelo('${m.id}')">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="eliminarRegistro('modelos', '${m.id}', '${m.nombre}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// --- FUNCIÓN PARA ELIMINAR ---
let objetoEliminar = { tabla: '', id: '', nombre: '' };
const modalConf = new bootstrap.Modal(document.getElementById('modalConfirmar'));

function eliminarRegistro(tabla, id, nombre) {
    // Guardamos los datos temporalmente
    objetoEliminar = { tabla, id, nombre };
    document.getElementById('confirmMsgText').innerText = `Vas a eliminar a "${nombre}".`;
    modalConf.show();
}

// Escuchador para el botón del modal de confirmación
document.getElementById('btnConfirmarEliminar').onclick = async () => {
    const { tabla, id } = objetoEliminar;
    modalConf.hide();

    try {
        const res = await fetch(`${SB_URL}/${tabla}?id=eq.${id}`, {
            method: 'DELETE',
            headers
        });

        if (res.ok) {
            notify("Registro eliminado con éxito", "bg-success");
            if (tabla === 'clientes') {
                await fetchClientes();
                renderSelectors();
            } else {
                await fetchModelos();
            }
            renderTablas();
        } else {
            notify("Error: El registro está en uso", "bg-warning");
        }
    } catch (error) {
        notify("No se pudo eliminar", "bg-danger");
    }
};

window.onload = init;
