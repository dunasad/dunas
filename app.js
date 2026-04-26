const SB_URL = "https://coywogyelfaspxlsctjv.supabase.co/rest/v1";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8"; 
const headers = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

let appData = { clientes: [], modelos: [], notas: [] };

// LOGIN
async function checkAccess() {
    const user = document.getElementById('userInput').value;
    const pass = document.getElementById('passInput').value;
    const btn = document.getElementById('btnLogin');

    if (!user || !pass) return alert("Completa los campos");
    btn.disabled = true;

    try {
        const response = await fetch(`${SB_URL}/usuarios?usuario=eq.${user}&password=eq.${pass}&select=*`, { headers });
        const data = await response.json();

        if (data.length > 0) {
            document.getElementById('login-screen').classList.add('d-none');
            document.getElementById('main-app').classList.remove('d-none');
            await init();
        } else {
            alert("Credenciales incorrectas");
            btn.disabled = false;
        }
    } catch (e) { console.error(e); btn.disabled = false; }
}

// INICIALIZACIÓN
async function init() {
    await Promise.all([fetchClientes(), fetchModelos()]);
    renderSelectors();
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

    document.getElementById('sectionTitle').innerText = section.charAt(0).toUpperCase() + section.slice(1);
    if(section === 'historial') fetchHistorial();
};

// HISTORIAL
async function fetchHistorial() {
    const tbody = document.getElementById('tablaHistorialBody');
    tbody.innerHTML = "<tr><td colspan='4' class='text-center'>Cargando...</td></tr>";

    try {
        const res = await fetch(`${SB_URL}/notas?select=*,clientes(nombre)&order=created_at.desc`, { headers });
        const notas = await res.json();
        
        tbody.innerHTML = notas.map(n => `
            <tr>
                <td class="px-4 small">${new Date(n.created_at).toLocaleDateString()}</td>
                <td class="fw-bold">${n.clientes ? n.clientes.nombre : 'S/N'}</td>
                <td class="text-danger fw-bold">$${parseFloat(n.total || 0).toFixed(2)}</td>
                <td class="text-end px-4">
                    <button class="btn btn-sm btn-light" onclick="alert('Próximamente Formato')"><i class="bi bi-printer"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarNota('${n.id}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`).join('');
    } catch (e) { tbody.innerHTML = "<tr><td colspan='4'>Error de conexión</td></tr>"; }
}

// GUARDAR NOTA
window.guardarNota = async () => {
    const clienteId = document.getElementById('selCliente').value;
    const total = parseFloat(document.getElementById('totalTxt').innerText) || 0;
    if(!clienteId) return alert("Elige un cliente");

    try {
        const resNota = await fetch(`${SB_URL}/notas`, {
            method: 'POST',
            headers: { ...headers, "Prefer": "return=representation" },
            body: JSON.stringify({ cliente_id: clienteId, total: total })
        });
        const dataNota = await resNota.json();
        const notaId = dataNota[0].id;

        const detalles = [];
        document.querySelectorAll('.item-row').forEach(row => {
            detalles.push({
                nota_id: notaId,
                modelo: row.querySelector('.select-modelo').value,
                cantidad: parseInt(row.querySelector('.input-cant').value),
                precio: parseFloat(row.querySelector('.input-precio').value)
            });
        });

        await fetch(`${SB_URL}/detalle_notas`, { method: 'POST', headers, body: JSON.stringify(detalles) });
        notify("Guardado con éxito");
        document.getElementById('itemsContainer').innerHTML = "";
        addItem();
    } catch (e) { alert("Error al guardar"); }
};

// FUNCIONES AUXILIARES
window.addItem = () => {
    const id = Date.now();
    const html = `
        <div class="row g-2 mb-3 item-row" id="item-${id}">
            <div class="col-6"><select class="form-select border-0 bg-light select-modelo">${appData.modelos.map(m => `<option>${m.nombre}</option>`).join('')}</select></div>
            <div class="col-2"><input type="number" class="form-control border-0 bg-light input-cant" value="1" oninput="calcularTotal()"></div>
            <div class="col-3"><input type="number" class="form-control border-0 bg-light input-precio" placeholder="Precio" oninput="calcularTotal()"></div>
            <div class="col-1"><button class="btn text-danger" onclick="document.getElementById('item-${id}').remove(); calcularTotal();"><i class="bi bi-trash"></i></button></div>
        </div>`;
    document.getElementById('itemsContainer').insertAdjacentHTML('beforeend', html);
};

window.calcularTotal = () => {
    let t = 0;
    document.querySelectorAll('.item-row').forEach(r => {
        t += (r.querySelector('.input-cant').value * r.querySelector('.input-precio').value);
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
    document.getElementById('selCliente').innerHTML = '<option value="">Seleccionar Cliente</option>' + 
        appData.clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

function notify(m) {
    document.getElementById('toastMsg').innerText = m;
    const t = new bootstrap.Toast(document.getElementById('liveToast'));
    t.show();
}
