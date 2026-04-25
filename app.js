import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 👇 pega tus datos aquí
const supabase = createClient(
  'https://coywogyelfaspxlsctjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8'
)

async function guardarNota() {
  const cliente = document.getElementById("cliente").value
  const descripcion = document.getElementById("descripcion").value
  const cantidad = Number(document.getElementById("cantidad").value)
  const precio = Number(document.getElementById("precio").value)

  const total = cantidad * precio

  const { data, error } = await supabase
    .from('notas')
    .insert([
      {
        descripcion,
        cantidad,
        precio,
        total,
        fecha: new Date()
      }
    ])

  if (error) {
    alert("Error: " + error.message)
  } else {
    alert("Nota guardada ✅")
  }
}

window.guardarNota = guardarNota
