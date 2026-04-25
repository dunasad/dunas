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


// CLIENTES
async function cargarClientes() {
  const { data } = await supabase.from('clientes').select('*')

  const select = document.getElementById("clienteSelect")
  if (!select) return

  select.innerHTML = '<option value="">Seleccionar cliente</option>'

  data.forEach(c => {
    const option = document.createElement("option")
    option.value = c.id
    option.textContent = c.nombre
    select.appendChild(option)
  })
}


// MODELOS
async function cargarModelos() {
  const { data } = await supabase.from('modelos').select('*')

  const select = document.getElementById("modeloSelect")
  if (!select) return

  select.innerHTML = '<option value="">Seleccionar modelo</option>'

  data.forEach(m => {
    const option = document.createElement("option")
    option.value = m.id
    option.textContent = m.nombre
    select.appendChild(option)
  })
}


// MULTIPLES PRODUCTOS
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

window.agregarProducto = agregarProducto


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


// TOTAL GENERAL
function calcularTotalGeneral() {
  let total = 0

  productos.forEach((_, i) => {
    const cant = Number(document.getElementById(`cant_${i}`)?.value) || 0
    const precio = Number(document.getElementById(`precio_${i}`)?.value) || 0

    total += cant * precio
  })

  document.getElementById("total").textContent = total.toFixed(2)
}


// GUARDAR NOTA
async function guardarNota() {
  const cliente_id = document.getElementById("clienteSelect").value
  const fecha = document.getElementById("fecha").value

  for (let i = 0; i < productos.length; i++) {
    const modelo_id = document.getElementById(`modelo_${i}`).value
    const descripcion = document.getElementById(`desc_${i}`).value
    const cantidad = Number(document.getElementById(`cant_${i}`).value)
    const precio = Number(document.getElementById(`precio_${i}`).value)

    const total = cantidad * precio

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

  alert("Nota guardada completa")
}

window.guardarNota = guardarNota


// INICIO
cargarClientes()
cargarModelos()
