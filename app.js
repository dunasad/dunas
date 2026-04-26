// CONFIGURACIÓN SUPABASE
const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; 
const headers = {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
};

let appData = { clientes: [], modelos: [] };
let objetoEliminar = { tabla: '', id: '', nombre: '' };
let modalConf, modalCli, modalMod;

// 1. LOGIN
async function checkAccess() {
    const user = document.getElementById('userInput').value;
    const pass = document.getElementById('passInput').value;
    const btn = document.getElementById('btnLogin');

    if (!user || !pass) return alert("Completa los campos");

    btn.disabled = true;
    btn.innerText = "Verificando...";

    try {
        const response = await fetch(`${SB_URL}/usuarios?usuario=eq.${user}&password=eq.${pass}&select=*`, { 
            headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } 
        });
        const data = await response.json();

        if (data && data.length > 0) {
            const nombreUsuario = data[0].nombre;
            // Ocultar login y mostrar app
            document.getElementById('login-screen').classList.add('d-none');
            document.getElementById('main-app').classList.remove('d-none');
            
            // Forzar renderizado inicial
            await init();
            notify(`Bienvenido, ${nombreUsuario}`, "bg-success");
        } else {
            alert("Usuario o contraseña incorrectos.");
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

// 2. INICIALIZACIÓN
async function init() {
    try {
        modalConf = new bootstrap.Modal(document.getElementById('modalConfirmar'));
        modalCli = new bootstrap.Modal(document.getElementById('modalCliente'));
        modalMod = new bootstrap.Modal(document.getElementById('modalModelo'));

        await Promise.all([fetchClientes(), fetchModelos()]);
        renderSelectors();
        renderTablas();

        if (typeof addItem === 'function' && document.getElementById('itemsContainer').innerHTML === "") {
            addItem();
        }

        const sideBtn = document.getElementById('sidebarCollapse');
        if(sideBtn) {
            sideBtn.onclick = () => document.getElementById('sidebar').classList.toggle('active');
        }
        
        document.getElementById('btnConfirmarEliminar').onclick = ejecutarEliminacion;

    } catch (e) { 
        console.error("Error en init:", e);
    }
}

// 3. FETCH
async function fetchClientes() {
    const res = await fetch(`${SB_URL}/clientes?select=*&order=nombre.asc`, { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } });
    appData.clientes = await res.json();
}

async function fetchModelos() {
    const res = await fetch(`${SB_URL}/modelos?select=*&order=nombre.asc`, { headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` } });
    appData.modelos = await res.json();
}

// 4. FUNCIONES DE UI
function showSection(section) {
    // 1. Ocultar todas las secciones
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
    
    // 2. Limpiar estados activos del menú
    document.querySelectorAll('#sidebar li').forEach(li => li.classList.remove('active'));

    // 3. Mostrar la sección destino
    const sec = document.getElementById('sec-' + section);
    const menu = document.getElementById('menu-' + section);

    if (sec) sec.classList.remove('d-none');
    if (menu) menu.classList.add('active'); // Aquí es donde fallaba si el ID no existía

    const titulos = { 'notas': 'Crear Nota', 'historial': 'Historial', 'clientes': 'Clientes', 'modelos': 'Modelos' };
    const titleEl = document.getElementById('sectionTitle');
    if (titleEl) titleEl.innerText = titulos[section] || 'Panel';
}

function notify(msg, color = 'bg-dark') {
    const toastEl = document.getElementById('liveToast');
    document.getElementById('toastMsg').innerText = msg;
    toastEl.className = `toast align-items-center text-white ${color} border-0 rounded-3`;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// 5. RENDER
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

// 6. LOGICA CLIENTES/MODELOS/ELIMINAR
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
        notify("Eliminado", "bg-danger");
        tabla === 'clientes' ? await fetchClientes() : await fetchModelos();
        if(tabla === 'clientes') renderSelectors();
        renderTablas();
    }
}

// 7. NOTAS (Items Dinámicos)
window.addItem = () => {
    const container = document.getElementById('itemsContainer');
    if (!container) return; // Seguridad por si el contenedor no existe

    const id = Date.now();
    const html = `
        <div class="item-row mb-3 p-3 bg-light rounded-3 position-relative" id="item-${id}">
            <div class="row g-2">
                <div class="col-12 col-md-4">
                    <label class="small text-muted fw-bold">MODELO</label>
                    <select class="form-select border-0 select-modelo">
                        ${appData.modelos.map(m => `<option>${m.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="col-6 col-md-3">
                    <label class="small text-muted fw-bold">CANTIDAD</label>
                    <input type="number" class="form-control border-0 input-cant" value="1" oninput="calcularTotal()">
                </div>
                <div class="col-6 col-md-3">
                    <label class="small text-muted fw-bold">PRECIO</label>
                    <input type="number" class="form-control border-0 input-precio" value="0" oninput="calcularTotal()">
                </div>
                <div class="col-12 col-md-2 d-flex align-items-end">
                    <button class="btn btn-outline-danger border-0 w-100" onclick="removeItem(${id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
    calcularTotal();
};

window.removeItem = (id) => {
    document.getElementById(`item-${id}`).remove();
    calcularTotal();
};

window.calcularTotal = () => {
    let total = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const cant = parseFloat(row.querySelector('.input-cant').value) || 0;
        const precio = parseFloat(row.querySelector('.input-precio').value) || 0;
        total += (cant * precio);
    });
    document.getElementById('totalTxt').innerText = total.toLocaleString('en-US', { minimumFractionDigits: 2 });
};

window.guardarNota = async () => {
    const clienteId = document.getElementById('selCliente').value;
    const total = parseFloat(document.getElementById('totalTxt').innerText.replace(/,/g, '')) || 0;
    
    // Recolectar los conceptos (items)
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        items.push({
            modelo: row.querySelector('.select-modelo').value,
            cantidad: row.querySelector('.input-cant').value,
            precio: row.querySelector('.input-precio').value
        });
    });

    if (!clienteId || items.length === 0) {
        return alert("Por favor, selecciona un cliente y agrega al menos un concepto.");
    }

    try {
        const cuerpoNota = {
            cliente_id: clienteId,
            items: JSON.stringify(items), // Guardamos como texto JSON
            total: total,
            fecha: new Date().toISOString()
        };

        const res = await fetch(`${SB_URL}/notas`, {
            method: 'POST',
            headers: headers, // Usa los headers que ya tenemos definidos arriba
            body: JSON.stringify(cuerpoNota)
        });

        if (res.ok) {
            notify("¡Nota guardada en Supabase!", "bg-success");
            // Limpiar el formulario
            document.getElementById('itemsContainer').innerHTML = "";
            document.getElementById('selCliente').value = "";
            addItem(); // Agregar una fila vacía nueva
        } else {
            const errorData = await res.json();
            console.error("Error de Supabase:", errorData);
            alert("Error al guardar: " + (errorData.message || "Revisa la consola"));
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("No se pudo conectar con Supabase");
    }
};
