import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://coywogyelfaspxlsctjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8'
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
let productos = []

function agregarProducto() {
  const contenedor = document.getElementById("productos")

  const index = productos.length

  const div = document.createElement("div")
  div.classList.add("producto")

  div.innerHTML = `
    <select id="modelo_${index}"></select>
    <input id="desc_${index}" placeholder="Descripción">
    <input id="cant_${index}" type="number" placeholder="Cantidad">
    <input id="precio_${index}" type="number" placeholder="Precio">
  `

  contenedor.appendChild(div)

  productos.push({})

  cargarModelosEnSelect(`modelo_${index}`)

  document.getElementById(`cant_${index}`).addEventListener("input", calcularTotalGeneral)
  document.getElementById(`precio_${index}`).addEventListener("input", calcularTotalGeneral)
}


// Cargar modelos en cada select nuevo
async function cargarModelosEnSelect(id) {
  const { data } = await supabase.from('modelos').select('*')

  const select = document.getElementById(id)
  select.innerHTML = '<option value="">Modelo</option>'

  data.forEach(m => {
    const option = document.createElement("option")
    option.value = m.id
    option.textContent = m.nombre
    select.appendChild(option)
  })
}


// Calcular total de TODOS los productos
function calcularTotalGeneral() {
  let total = 0

  productos.forEach((_, i) => {
    const cant = Number(document.getElementById(`cant_${i}`)?.value) || 0
    const precio = Number(document.getElementById(`precio_${i}`)?.value) || 0

    total += cant * precio
  })

  document.getElementById("total").textContent = total.toFixed(2)
}


// Guardar nota con múltiples productos
async function guardarNota() {
  const cliente_id = document.getElementById("clienteSelect").value
  const fecha = document.getElementById("fecha").value

  let totalNota = 0

  for (let i = 0; i < productos.length; i++) {
    const modelo_id = document.getElementById(`modelo_${i}`).value
    const descripcion = document.getElementById(`desc_${i}`).value
    const cantidad = Number(document.getElementById(`cant_${i}`).value)
    const precio = Number(document.getElementById(`precio_${i}`).value)

    const total = cantidad * precio
    totalNota += total

    await supabase.from('notas').insert([{
      cliente_id,
      modelo_id,
      descripcion,
      cantidad,
      precio,
      total,
      fecha
    }])
  }

  alert("Nota guardada completa ✅")
}
