const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; // Tu anon key completa

const headers = {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
};

let appData = { clientes: [], modelos: [] };

async function init() {
    await Promise.all([fetchClientes(), fetchModelos()]);
    renderSelectors();
}

async function fetchClientes() {
    const res = await fetch(`${SB_URL}/clientes?select=*&order=nombre`, { headers });
    appData.clientes = await res.json();
}

async function fetchModelos() {
    const res = await fetch(`${SB_URL}/modelos?select=*&order=nombre`, { headers });
    appData.modelos = await res.json();
}

function renderSelectors() {
    const sel = document.getElementById('selCliente');
    sel.innerHTML = '<option value="">Selecciona Cliente...</option>' + 
        appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

// Función para generar la nota y guardar en Supabase
async function guardarNota() {
    const clienteId = document.getElementById('selCliente').value;
    if (!clienteId) return alert("Por favor, selecciona un cliente");

    // Validar que haya al menos un producto
    const filas = document.querySelectorAll('.item-row');
    if (filas.length === 0) return alert("Agrega al menos un producto");

    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = "Guardando...";

    try {
        // 1. Crear la Nota (Cabecera)
        const notaData = {
            cliente_id: clienteId,
            total: calcularTotal(),
            // No enviamos fecha si en Supabase tiene default: now()
        };

        const resNota = await fetch(`${SB_URL}/notas`, {
            method: 'POST',
            headers: {
                ...headers,
                "Prefer": "return=representation" // OBLIGATORIO para recibir el ID de vuelta
            },
            body: JSON.stringify(notaData)
        });

        if (!resNota.ok) {
            const errorText = await resNota.text();
            throw new Error(`Error en Nota: ${errorText}`);
        }

        const datosNota = await resNota.json();
        const nuevaNota = datosNota[0]; // Supabase devuelve un array con el objeto creado

        // 2. Preparar los detalles
        const detalles = [];
        filas.forEach(row => {
            const mId = row.querySelector('.sel-modelo').value;
            const cant = parseInt(row.querySelector('.in-cant').value) || 0;
            const prec = parseFloat(row.querySelector('.in-precio').value) || 0;

            if (mId && cant > 0) {
                detalles.push({
                    nota_id: nuevaNota.id, // El ID que acabamos de obtener
                    modelo_id: mId,
                    descripcion: row.querySelector('.in-desc').value,
                    cantidad: cant,
                    precio: prec,
                    total: cant * prec
                });
            }
        });

        // 3. Guardar los detalles
        if (detalles.length > 0) {
            const resDetalle = await fetch(`${SB_URL}/detalle_notas`, {
                method: 'POST',
                headers: {
                    ...headers,
                    "Prefer": "return=representation"
                },
                body: JSON.stringify(detalles)
            });

            if (!resDetalle.ok) {
                const errorDet = await resDetalle.text();
                throw new Error(`Error en Detalles: ${errorDet}`);
            }
        }

        alert("Nota y detalles guardados correctamente");
        location.reload();

    } catch (error) {
        console.error("Error completo:", error);
        alert("No se pudo guardar: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "GENERAR Y GUARDAR";
    }
}

function calcularTotal() {
    let total = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const q = parseFloat(row.querySelector('.in-cant').value) || 0;
        const p = parseFloat(row.querySelector('.in-precio').value) || 0;
        total += q * p;
    });
    return total;
}
function addItem() {
    const container = document.getElementById('itemsContainer');
    const div = document.createElement('div');
    div.className = 'item-row card p-3 mb-2 border-light shadow-sm';
    
    // Generamos las opciones del selector usando los modelos cargados de Supabase
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
                <input type="text" class="form-control form-control-sm in-desc border-0" placeholder="Detalle (ej: Color negro / Suela blanca)">
            </div>
            <div class="col-4">
                <input type="number" class="form-control in-cant" placeholder="Cant." oninput="actualizarTotalInterfaz()">
            </div>
            <div class="col-4">
                <input type="number" class="form-control in-precio" placeholder="Precio" oninput="actualizarTotalInterfaz()">
            </div>
            <div class="col-4 d-flex align-items-center justify-content-end">
                <button class="btn btn-sm btn-outline-danger border-0" onclick="this.closest('.item-row').remove(); actualizarTotalInterfaz();">
                    <i class="bi bi-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;
    container.appendChild(div);
}

// Función auxiliar para mostrar el total en tiempo real mientras escribes
function actualizarTotalInterfaz() {
    const total = calcularTotal();
    document.getElementById('totalTxt').innerText = total.toLocaleString('en-US', { minimumFractionDigits: 2 });
}
window.onload = init;
