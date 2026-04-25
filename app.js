import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://coywogyelfaspxlsctjv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveXdvZ3llbGZhc3B4bHNjdGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTkzMDksImV4cCI6MjA5MjYzNTMwOX0.BXT3hpn9CZevtc39KEVzkwyhjfCQ_087eyNp5UuFTS8' // tu key completa
)

async function guardarNota() {
  const { data, error } = await supabase
    .from('notas')
    .insert([{ descripcion: "prueba" }])

  console.log(data, error)
}

window.guardarNota = guardarNota
