import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://coywogyelfaspxlsctjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8'
)

// ESPERAR QUE CARGUE EL HTML
document.addEventListener("DOMContentLoaded", () => {
  cargarClientes()
})


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
  const { data, error } = await supabase.from('clientes').select('*')

  console.log("CLIENTES:", data, error)

  if (error) return alert(error.message)

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


// MODELOS (para productos)
async function cargarModelosEnSelect(id) {
  const { data, error } = await supabase.from('modelos').select('*')

  console.log("MODELOS:", data, error)

  if (error) return alert(error.message)

  const select = document.getElementById(id)
  if (!select) return

  select.innerHTML = '<option value="">Modelo</option>'

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

  // 🔥 aquí cargamos modelos correctamente
  cargarModelosEnSelect(`modelo_${index}`)

  document.getElementById(`cant_${index}`).addEventListener("input", calcularTotalGeneral)
  document.getElementById(`precio_${index}`).addEventListener("input", calcularTotalGeneral)
}

window.agregarProducto = agregarProducto


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
  try {
    const cliente_id = document.getElementById("clienteSelect").value
    const fecha = document.getElementById("fecha").value

    if (!cliente_id) {
      alert("Selecciona un cliente")
      return
    }

    if (productos.length === 0) {
      alert("Agrega al menos un producto")
      return
    }

    // 🔥 1. CREAR NOTA (CABECERA)
    const { data: notaData, error: notaError } = await supabase
      .from('notas')
      .insert([{
        cliente_id,
        fecha
      }])
      .select()

    if (notaError) {
      console.error("ERROR NOTA:", notaError)
      alert("Error al crear la nota")
      return
    }

    const nota_id = notaData[0].id

    // 🔥 2. PREPARAR PRODUCTOS
    let detalles = []

    for (let i = 0; i < productos.length; i++) {
      const modelo_id = document.getElementById(`modelo_${i}`).value
      const descripcion = document.getElementById(`desc_${i}`).value
      const cantidad = Number(document.getElementById(`cant_${i}`).value)
      const precio = Number(document.getElementById(`precio_${i}`).value)

      if (!modelo_id || !cantidad || !precio) continue

      detalles.push({
        nota_id,
        modelo_id,
        descripcion,
        cantidad,
        precio,
        total: cantidad * precio
      })
    }

    // 🔥 3. INSERTAR TODOS LOS PRODUCTOS
    const { error: detalleError } = await supabase
      .from('detalle_notas')
      .insert(detalles)

    if (detalleError) {
      console.error("ERROR DETALLES:", detalleError)
      alert("Error al guardar productos")
      return
    }

    alert("Nota guardada correctamente ✅")

  } catch (err) {
    console.error("ERROR GENERAL:", err)
    alert("Error inesperado")
  }
}
