import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://coywogyelfaspxlsctjv.supabase.co',
  'TU_KEY_AQUI'
)

// SIDEBAR
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("activo")
}

function mostrarSeccion(id) {
  document.querySelectorAll(".seccion").forEach(sec => {
    sec.style.display = "none"
  })
  document.getElementById(id).style.display = "block"
}

window.toggleSidebar = toggleSidebar
window.mostrarSeccion = mostrarSeccion


// TOTAL
function calcularTotal() {
  const cantidad = Number(document.getElementById("cantidad").value) || 0
  const precio = Number(document.getElementById("precio").value) || 0
  const total = cantidad * precio
  document.getElementById("total").textContent = total.toFixed(2)
}

document.getElementById("cantidad").addEventListener("input", calcularTotal)
document.getElementById("precio").addEventListener("input", calcularTotal)


// GUARDAR NOTA
async function guardarNota() {
  const descripcion = document.getElementById("descripcion").value
  const cantidad = Number(document.getElementById("cantidad").value)
  const precio = Number(document.getElementById("precio").value)
  const total = cantidad * precio

  const { error } = await supabase
    .from('notas')
    .insert([{ descripcion, cantidad, precio, total, fecha: new Date() }])

  if (error) {
    alert(error.message)
  } else {
    alert("Nota guardada")
  }
}

window.guardarNota = guardarNota


// CLIENTES
async function guardarCliente() {
  const nombre = document.getElementById("nombreCliente").value
  const ciudad = document.getElementById("ciudadCliente").value
  const telefono = document.getElementById("telCliente").value

  const { error } = await supabase
    .from('clientes')
    .insert([{ nombre, ciudad, telefono }])

  if (error) {
    alert(error.message)
  } else {
    alert("Cliente guardado")
    cargarClientes()
  }
}

window.guardarCliente = guardarCliente

async function cargarClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')

  if (error) return alert(error.message)

  const select = document.getElementById("clienteSelect")
  select.innerHTML = '<option value="">Seleccionar cliente</option>'

  const lista = document.getElementById("listaClientes")
  lista.innerHTML = ""

  data.forEach(cliente => {

    const option = document.createElement("option")
    option.value = cliente.id
    option.textContent = cliente.nombre
    select.appendChild(option)

    const div = document.createElement("div")
    div.innerHTML = `${cliente.nombre} - ${cliente.ciudad} - ${cliente.telefono}`
    lista.appendChild(div)
  })
}


// MODELOS
async function guardarModelo() {
  const nombre = document.getElementById("nombreModelo").value

  const { error } = await supabase
    .from('modelos')
    .insert([{ nombre }])

  if (error) {
    alert(error.message)
  } else {
    alert("Modelo guardado")
    cargarModelos()
  }
}

window.guardarModelo = guardarModelo

async function cargarModelos() {
  const { data, error } = await supabase
    .from('modelos')
    .select('*')

  console.log("MODELOS:", data, error)

  if (error) {
    alert(error.message)
    return
  }

  const select = document.getElementById("modeloSelect")
  select.innerHTML = '<option value="">Seleccionar modelo</option>'

  const lista = document.getElementById("listaModelos")
  lista.innerHTML = ""

  data.forEach(modelo => {
    const option = document.createElement("option")
    option.value = modelo.id
    option.textContent = modelo.nombre
    select.appendChild(option)

    const div = document.createElement("div")
    div.textContent = modelo.nombre
    lista.appendChild(div)
  })
}


// HISTORIAL
async function cargarNotas() {
  const { data, error } = await supabase
    .from('notas')
    .select('*')

  if (error) return alert(error.message)

  const lista = document.getElementById("listaNotas")
  lista.innerHTML = ""

  data.forEach(nota => {
    const div = document.createElement("div")
    div.innerHTML = `
      <p>${nota.descripcion}</p>
      <p>Total: $${nota.total}</p>
    `
    lista.appendChild(div)
  })
}

window.cargarNotas = cargarNotas


// INICIO
cargarClientes()
cargarModelos()
