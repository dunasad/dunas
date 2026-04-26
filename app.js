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
    if (!clienteId) return alert("Selecciona un cliente");

    const btn = document.querySelector('.btn-primary');
    btn.disabled = true;
    btn.innerText = "Guardando...";

    try {
        // 1. Crear la Nota (Cabecera)
        const notaData = {
            cliente_id: clienteId,
            fecha: new Date().toISOString(),
            total: calcularTotal()
        };

        const resNota = await fetch(`${SB_URL}/notas`, {
            method: 'POST',
            headers,
            body: JSON.stringify(notaData)
        });
        const [nuevaNota] = await resNota.json();

        // 2. Crear los detalles
        const detalles = [];
        document.querySelectorAll('.item-row').forEach(row => {
            detalles.push({
                nota_id: nuevaNota.id,
                modelo_id: row.querySelector('.sel-modelo').value,
                descripcion: row.querySelector('.in-desc').value,
                cantidad: parseInt(row.querySelector('.in-cant').value),
                precio: parseFloat(row.querySelector('.in-precio').value),
                total: parseInt(row.querySelector('.in-cant').value) * parseFloat(row.querySelector('.in-precio').value)
            });
        });

        await fetch(`${SB_URL}/detalle_notas`, {
            method: 'POST',
            headers,
            body: JSON.stringify(detalles)
        });

        alert("Nota guardada en Supabase con éxito");
        location.reload();

    } catch (error) {
        console.error(error);
        alert("Error al guardar");
    } finally {
        btn.disabled = false;
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

window.onload = init;
