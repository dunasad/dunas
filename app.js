const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; // Tu anon key completa

const headers = {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
};

// ... al inicio del archivo ...

document.getElementById('sidebarCollapse').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('active');
});

function showSection(section) {
    // Ocultar todas las secciones
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
    document.querySelectorAll('#sidebar li').forEach(li => li.classList.remove('active'));
    
    // Mostrar la seleccionada
    document.getElementById('sec-' + section).classList.remove('d-none');
    
    // Cambiar título y estilo del menú
    const titulos = {
        'notas': 'Crear Nota',
        'historial': 'Historial de Ventas',
        'clientes': 'Administrar Clientes',
        'modelos': 'Administrar Modelos'
    };
    document.getElementById('sectionTitle').innerText = titulos[section];
    
    // Si estás en móvil, al hacer clic podrías querer cerrar el sidebar
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('active');
    }
}

// ... mantén tus funciones de fetchClientes, fetchModelos y guardarNota iguales ...

let appData = {
    clientes: [],
    modelos: []
};

// 1. Cargar datos iniciales
async function init() {
    try {
        await Promise.all([fetchClientes(), fetchModelos()]);
        renderSelectors();
        addItem(); // Inicia con una fila de producto vacía
    } catch (error) {
        console.error("Error al iniciar:", error);
    }
}

async function fetchClientes() {
    const res = await fetch(`${SB_URL}/clientes?select=*`, { headers });
    appData.clientes = await res.json();
}

async function fetchModelos() {
    const res = await fetch(`${SB_URL}/modelos?select=*`, { headers });
    appData.modelos = await res.json();
}

function renderSelectors() {
    const sel = document.getElementById('selCliente');
    sel.innerHTML = '<option value="">Selecciona un cliente...</option>' + 
        appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

// 2. Gestión de filas de productos
function addItem() {
    const container = document.getElementById('itemsContainer');
    const div = document.createElement('div');
    div.className = 'item-row card p-3 mb-2 border-light shadow-sm';
    
    const opcionesModelos = appData.modelos.map(m => 
        `<option value="${m.id}">${m.nombre}</option>`
    ).join('');

    div.innerHTML = `
        <div class="row g-2">
            <div class="col-12 mb-2">
                <select class="form-select sel-modelo fw-bold border-0 bg-light">
                    ${opcionesModelos}
                </select>
            </div>
            <div class="col-12 mb-2">
                <input type="text" class="form-control form-control-sm in-desc border-0" placeholder="Detalle (Color, material, etc.)">
            </div>
            <div class="col-4">
                <input type="number" class="form-control in-cant" placeholder="Cant." oninput="actualizarTotal()">
            </div>
            <div class="col-4">
                <input type="number" class="form-control in-precio" placeholder="Precio" oninput="actualizarTotal()">
            </div>
            <div class="col-4 d-flex align-items-center justify-content-end">
                <button class="btn btn-sm btn-outline-danger border-0" onclick="this.closest('.item-row').remove(); actualizarTotal();">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(div);
}

function calcularTotal() {
    let total = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const cant = parseFloat(row.querySelector('.in-cant').value) || 0;
        const prec = parseFloat(row.querySelector('.in-precio').value) || 0;
        total += (cant * prec);
    });
    return total;
}

function actualizarTotal() {
    const total = calcularTotal();
    document.getElementById('totalTxt').innerText = total.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

// 3. Guardado Relacional (Notas + Detalles)
async function guardarNota() {
    const clienteId = document.getElementById('selCliente').value;
    if (!clienteId) return alert("Selecciona un cliente");

    const filas = document.querySelectorAll('.item-row');
    if (filas.length === 0) return alert("Agrega al menos un producto");

    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = "Guardando...";

    try {
        // PASO A: Crear la Nota y obtener su ID UUID
        const notaData = {
            cliente_id: clienteId,
            total: calcularTotal(),
            fecha: new Date().toISOString()
        };

        const resNota = await fetch(`${SB_URL}/notas`, {
            method: 'POST',
            headers: {
                ...headers,
                "Prefer": "return=representation" // Importante para recibir el ID generado
            },
            body: JSON.stringify(notaData)
        });

        const datosNota = await resNota.json();
        if (!resNota.ok) throw new Error(datosNota.message || "Error al crear la nota");
        
        // Obtenemos el ID de la nota recién creada
        const nuevoIdNota = datosNota[0].id;

        // PASO B: Preparar los detalles vinculados
        const detalles = [];
        filas.forEach(row => {
            const mId = row.querySelector('.sel-modelo').value;
            const cant = parseInt(row.querySelector('.in-cant').value) || 0;
            const prec = parseFloat(row.querySelector('.in-precio').value) || 0;

            if (mId && cant > 0) {
                detalles.push({
                    nota_id: nuevoIdNota, // RELACIÓN: vinculamos al ID de la nota
                    modelo_id: mId,
                    descripcion: row.querySelector('.in-desc').value,
                    cantidad: cant,
                    precio: prec,
                    total: cant * prec
                });
            }
        });

        // PASO C: Guardar todos los detalles en un solo envío
        if (detalles.length > 0) {
            const resDetalle = await fetch(`${SB_URL}/detalle_notas`, {
                method: 'POST',
                headers: { ...headers },
                body: JSON.stringify(detalles)
            });

            if (!resDetalle.ok) {
                const errorDet = await resDetalle.json();
                throw new Error("Error en detalles: " + errorDet.message);
            }
        }

        alert("¡Venta guardada con éxito!");
        location.reload();

    } catch (error) {
        console.error("Error completo:", error);
        alert("Error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "GENERAR PDF Y GUARDAR";
    }
}

// Iniciar aplicación
window.onload = init;
