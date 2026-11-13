'use strict';
const $=id=>document.getElementById(id);
const state={token:null,user:null,clientes:[],modelos:[],notas:[],noteId:null,itemSeq:0,editing:null};
const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.style.display='none',4500)}
async function request(path,{method='GET',body,auth=true}={}){
  const headers={'Accept':'application/json'};
  if(body!==undefined) headers['Content-Type']='application/json';
  if(auth&&state.token)headers.Authorization=`Bearer ${state.token}`;
  let res;
  try{res=await fetch(DUNAS_CONFIG.API_URL+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});}catch{throw Error('No hay conexión con la API. Revisa internet y CORS.');}
  const data=await res.json().catch(()=>({}));
  if(res.status===401&&auth){await logout(false);throw Error('La sesión venció. Entra de nuevo.');}
  if(!res.ok)throw Error(data.error||`Error HTTP ${res.status}`);
  return data;
}
function authenticated(on){$('login-screen').hidden=on;$('login-screen').style.display=on?'none':'grid';$('app').hidden=!on;if(on)$('who').textContent=state.user?.nombre||state.user?.usuario||'';}
async function login(e){e.preventDefault();const btn=$('btn-login');btn.disabled=true;$('login-error').textContent='';try{const data=await request('/login',{method:'POST',body:{usuario:$('login-usuario').value.trim(),password:$('login-pass').value},auth:false});if(!data.token)throw Error('No se recibió token.');state.token=data.token;state.user=data.usuario;sessionStorage.setItem('dunas_token',data.token);sessionStorage.setItem('dunas_user',JSON.stringify(data.usuario));$('login-pass').value='';authenticated(true);await refresh();view('notas');}catch(err){$('login-error').textContent=err.message;}finally{btn.disabled=false;}}
async function logout(remote=true){const t=state.token;state.token=null;state.user=null;sessionStorage.removeItem('dunas_token');sessionStorage.removeItem('dunas_user');authenticated(false);if(remote&&t){fetch(DUNAS_CONFIG.API_URL+'/logout',{method:'POST',headers:{Authorization:'Bearer '+t}}).catch(()=>{});}}
function view(name){document.querySelectorAll('.view').forEach(e=>e.hidden=e.id!==`view-${name}`);document.querySelectorAll('[data-view]').forEach(e=>e.classList.toggle('active',e.dataset.view===name));}
async function refresh(){const [c,m,n]=await Promise.all(['/api/clientes','/api/modelos','/api/notas'].map(path=>request(path)));state.clientes=c.data||[];state.modelos=m.data||[];state.notas=n.data||[];render();}
function actionButton(text,act,id,danger=false){return `<button class="small ${danger?'danger':'muted'}" data-act="${safe(act)}" data-id="${Number(id)}">${safe(text)}</button>`}
function render(){
 $('clients-body').innerHTML=state.clientes.map(c=>`<tr><td>${safe(c.nombre)}</td><td>${safe(c.ciudad)}</td><td>${safe(c.telefono)}</td><td>${actionButton('Editar','edit-client',c.id)} ${actionButton('Eliminar','del-client',c.id,true)}</td></tr>`).join('')||'<tr><td colspan="4">No hay clientes</td></tr>';
 $('models-body').innerHTML=state.modelos.map(m=>`<tr><td>${safe(m.nombre)}</td><td>${actionButton('Editar','edit-model',m.id)} ${actionButton('Eliminar','del-model',m.id,true)}</td></tr>`).join('')||'<tr><td colspan="2">No hay modelos</td></tr>';
 $('notes-body').innerHTML=state.notas.map(n=>`<tr><td>${safe(n.folio)}</td><td>${safe(n.pedido)}</td><td>${safe(n.fecha)}</td><td>${safe(n.clientes?.nombre)}</td><td>${money(n.total)}</td><td>${actionButton('Ver / editar','edit-note',n.id)} ${actionButton('Eliminar','del-note',n.id,true)}</td></tr>`).join('')||'<tr><td colspan="6">No hay notas</td></tr>';
 $('cliente').innerHTML='<option value="">Selecciona cliente</option>'+state.clientes.map(c=>`<option value="${Number(c.id)}">${safe(c.nombre)}</option>`).join('');
}
function newItem(item={}){const wrap=$('items'), el=document.createElement('div');el.className='item';el.dataset.seq=String(++state.itemSeq);el.innerHTML=`<div class="item-head"><strong>Producto ${state.itemSeq}</strong><button class="danger small" type="button" data-remove>Quitar</button></div><div class="cols2"><label>Modelo<select class="itm-modelo"><option value="">Sin modelo</option>${state.modelos.map(m=>`<option value="${Number(m.id)}">${safe(m.nombre)}</option>`).join('')}</select></label><label>Descripción<input class="itm-desc" maxlength="500"></label></div><div class="cols3"><label>Cantidad<input class="itm-cantidad" type="number" min="0.01" step="any" required></label><label>Precio<input class="itm-precio" type="number" min="0" step="0.01" required></label><label>Subtotal<input class="itm-total" readonly></label></div>`;wrap.appendChild(el);el.querySelector('.itm-modelo').value=item.modelo_id??'';el.querySelector('.itm-desc').value=item.descripcion??'';el.querySelector('.itm-cantidad').value=item.cantidad??1;el.querySelector('.itm-precio').value=item.precio??0;el.querySelector('[data-remove]').onclick=()=>{if(wrap.children.length<=1){toast('Deja por lo menos un producto');return;}el.remove();totals();};el.querySelectorAll('input').forEach(x=>x.addEventListener('input',totals));totals();}
function itemsData(){return [...$('items').children].map(el=>({modelo_id:el.querySelector('.itm-modelo').value||null,descripcion:el.querySelector('.itm-desc').value.trim(),cantidad:Number(el.querySelector('.itm-cantidad').value),precio:Number(el.querySelector('.itm-precio').value)}));}
function totals(){let t=0;for(const el of $('items').children){const q=Number(el.querySelector('.itm-cantidad').value)||0,p=Number(el.querySelector('.itm-precio').value)||0;const s=q*p;t+=s;el.querySelector('.itm-total').value=money(s)}$('total').textContent=money(t);}
async function newNote(){state.noteId=null;$('editor-title').textContent='Nueva nota';$('note-form').reset();$('items').replaceChildren();state.itemSeq=0;$('fecha').value=localDate();$('trabajo').value='Fabricacion de palas tejidas';$('print-note').hidden=true;try{const x=await request('/api/numeros');$('folio').value=x.folio;$('pedido').value=x.pedido;}catch(e){toast(e.message);return;}newItem();view('editor');}
async function openNote(id){try{const x=await request('/api/notas/'+id);state.noteId=Number(id);$('editor-title').textContent='Nota '+x.nota.folio;$('folio').value=x.nota.folio;$('pedido').value=x.nota.pedido;$('fecha').value=x.nota.fecha;$('cliente').value=x.nota.cliente_id??'';$('trabajo').value=x.nota.trabajo||'';$('items').replaceChildren();state.itemSeq=0;for(const d of x.detalles)newItem(d);if(!x.detalles.length)newItem();$('print-note').hidden=false;view('editor');}catch(e){toast(e.message)}}
async function saveNote(e){e.preventDefault();const items=itemsData();if(!items.length||items.some(i=>!(i.cantidad>0)||!(i.precio>=0))){toast('Revisa cantidades y precios');return;}const body={folio:$('folio').value,pedido:$('pedido').value,fecha:$('fecha').value,cliente_id:Number($('cliente').value),trabajo:$('trabajo').value,items};const btn=$('save-note');btn.disabled=true;try{const path=state.noteId?'/api/notas/'+state.noteId:'/api/notas';const x=await request(path,{method:state.noteId?'PUT':'POST',body});state.noteId=Number(x.id);await refresh();$('print-note').hidden=false;toast('Nota guardada correctamente');await openNote(state.noteId);}catch(err){toast('No se guardó: '+err.message)}finally{btn.disabled=false}}
async function printNote(){
  if(!state.noteId){toast('Guarda primero la nota');return;}
  // Abrir la ventana antes de la solicitud asincrónica para evitar bloqueos de popups.
  const w=window.open('','_blank');
  if(!w){toast('Permite ventanas emergentes para imprimir');return;}
  try{
    w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Preparando nota...</title></head><body><p>Preparando nota para imprimir...</p></body></html>');
    const {nota,detalles}=await request('/api/notas/'+state.noteId);
    const fecha=String(nota.fecha||'').slice(0,10);
    const fechaMX=/^\d{4}-\d{2}-\d{2}$/.test(fecha)?fecha.split('-').reverse().join('/'):fecha;
    const numero=n=>Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
    const nombreCliente=nota.clientes?.nombre||'';
    const titulo=String(nota.folio||'NOTA').replace(/[^a-zA-Z0-9_-]/g,'')+'-'+String(nombreCliente).replace(/[\\/:*?"<>|]/g,'').slice(0,60);
    const logoURL=new URL('https://dunasad.github.io/dunas/logo.png',window.location.href).href;
    const empresaDireccion=DUNAS_CONFIG.EMPRESA_DIRECCION||'';
    const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safe(titulo)}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000}body{font:11pt Arial,sans-serif}
.pv-wrap{max-width:680px;margin:0 auto;padding:18px 0 30px}
.pv-top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:14px;margin-bottom:16px;gap:20px}
.pv-logo{height:72px;max-width:220px;object-fit:contain;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pv-logo-fallback{font-size:27pt;font-weight:700;color:#2c4a7c}
.pv-title-block{text-align:right}.pv-title{font-size:22pt;font-weight:700}.pv-meta{font-size:9.5pt;margin-top:4px;line-height:1.8}.pv-meta strong{font-weight:700}
.pv-client-table{width:100%;margin-bottom:14px;border-collapse:collapse}.pv-client-table td{padding:3px 0;font-size:10pt}.pv-client-table .lbl{font-weight:700;width:75px}
.pv-work-header{background:#2c4a7c!important;color:#fff!important;text-align:left;padding:6px 12px;font-size:9.5pt;font-weight:700}
.pv-work-sub{background:#d8edda!important;text-align:left;padding:5px 12px;font-size:9pt;margin-bottom:14px}
.pv-table{width:100%;border-collapse:collapse;margin-bottom:6px;table-layout:fixed}.pv-table thead{display:table-header-group}.pv-table th{background:#2c4a7c!important;color:#fff!important;padding:8px 10px;text-align:left;font-size:9pt}.pv-table td{padding:10px;border:1px solid #ccc;font-size:9.5pt;vertical-align:top;overflow-wrap:anywhere}.pv-table tr{break-inside:avoid;page-break-inside:avoid}
.pv-table .tc{text-align:center}.pv-table .tr{text-align:right}.pv-table .w-qty{width:72px}.pv-table .w-price{width:130px}.pv-table .w-total{width:110px}
.pv-total-row td{font-weight:700;border:none;border-top:2px solid #333;text-align:right;padding:10px 10px 4px}
.pv-print-footer{margin-top:32px;text-align:center}.pv-thanks-line{font-weight:700;font-size:10pt;margin-bottom:12px}.pv-address-line{font-size:8.5pt;color:#555;border-top:1px solid #ccc;padding-top:8px}
.print-actions{max-width:680px;margin:15px auto;text-align:center}.print-actions button{background:#2c4a7c;color:#fff;border:0;border-radius:6px;padding:12px 18px;font:bold 14px Arial;cursor:pointer}
@page{size:letter;margin:14mm 16mm}
@media print{
  html,body{margin:0!important;padding:0!important;background:#fff!important}
  .pv-wrap{max-width:680px;margin:0 auto;padding:0}
  .print-actions{display:none!important}
  .pv-print-footer{position:fixed;bottom:0;left:0;right:0;margin:0;padding:0 16mm;background:#fff}
  .pv-table-wrap{margin-bottom:80px}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}
</style></head><body>
<div class="print-actions"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
<div class="pv-wrap">
  <div class="pv-top">
    <div><img src="${safe(logoURL)}" class="pv-logo" alt="DUNAS" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="pv-logo-fallback" style="display:none">DUNAS</div></div>
    <div class="pv-title-block"><div class="pv-title">Nota de Venta</div><div class="pv-meta"><strong>Fecha:&nbsp;</strong>${safe(fechaMX)}<br><strong>No. Pedido&nbsp;</strong>${safe(nota.pedido)}<br><strong>N.º de Venta:&nbsp;</strong>${safe(nota.folio)}</div></div>
  </div>
  <table class="pv-client-table"><tr><td class="lbl">Cliente:</td><td>${safe(nombreCliente)}</td></tr><tr><td class="lbl">Ciudad:</td><td>${safe(nota.clientes?.ciudad)}</td></tr><tr><td class="lbl">Tel:</td><td>${safe(nota.clientes?.telefono)}</td></tr></table>
  <div class="pv-work-header">Trabajo</div><div class="pv-work-sub">${safe(nota.trabajo)}</div>
  <div class="pv-table-wrap"><table class="pv-table"><thead><tr><th class="w-qty tc">Cantidad</th><th>Descripcion</th><th class="w-price tr">Precio por unidad</th><th class="w-total tr">Total</th></tr></thead>
  <tbody>${detalles.map(d=>`<tr><td class="tc w-qty">${safe(d.cantidad)}</td><td><strong>${safe(d.modelos?.nombre)}</strong>${d.descripcion?'<br>'+safe(d.descripcion):''}</td><td class="tr w-price">$ ${numero(d.precio)}</td><td class="tr w-total">$ ${numero(d.total)}</td></tr>`).join('')}</tbody>
  <tfoot><tr class="pv-total-row"><td colspan="3">Total:</td><td>$&nbsp;${numero(nota.total)}</td></tr></tfoot></table></div>
  <div class="pv-print-footer"><div class="pv-thanks-line">Gracias por su confianza.</div><div class="pv-address-line">${safe(empresaDireccion)}</div></div>
</div></body></html>`;
    w.document.open();w.document.write(html);w.document.close();w.focus();
  }catch(e){w.close();toast('Error al preparar impresión: '+e.message)}
}

function editDialog(table,item=null){state.editing={table,id:item?.id||null};$('edit-title').textContent=`${item?'Editar':'Nuevo'} ${table==='clientes'?'cliente':'modelo'}`;$('edit-fields').innerHTML=`<label>Nombre<input name="nombre" maxlength="120" required></label>`+(table==='clientes'?`<label>Ciudad<input name="ciudad" maxlength="120"></label><label>Teléfono<input name="telefono" maxlength="40"></label>`:'');for(const [key,value] of Object.entries(item||{})){const input=$('edit-fields').querySelector(`[name="${key}"]`);if(input)input.value=value??'';}$('edit-dialog').showModal();}
async function saveDialog(e){e.preventDefault();const {table,id}=state.editing;const data=Object.fromEntries(new FormData($('edit-form')));try{await request(`/api/${table}${id?'/'+id:''}`,{method:id?'PUT':'POST',body:data});$('edit-dialog').close();await refresh();toast('Registro guardado');}catch(err){toast(err.message)}}
async function remove(table,id){if(!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.'))return;try{await request(`/api/${table}/${id}`,{method:'DELETE'});await refresh();toast('Registro eliminado');}catch(err){toast(err.message)}}
async function clickActions(e){const btn=e.target.closest('[data-act]');if(!btn)return;const id=Number(btn.dataset.id),a=btn.dataset.act;if(a==='edit-note')return openNote(id);if(a==='del-note')return remove('notas',id);if(a==='edit-client')return editDialog('clientes',state.clientes.find(x=>Number(x.id)===id));if(a==='del-client')return remove('clientes',id);if(a==='edit-model')return editDialog('modelos',state.modelos.find(x=>Number(x.id)===id));if(a==='del-model')return remove('modelos',id);}
document.addEventListener('DOMContentLoaded',async()=>{
 $('login-form').addEventListener('submit',login);$('logout').addEventListener('click',()=>logout());$('new-from-list').onclick=newNote;$('back-to-list').onclick=()=>view('notas');$('add-item').onclick=()=>newItem();$('note-form').addEventListener('submit',saveNote);$('print-note').onclick=printNote;$('add-client').onclick=()=>editDialog('clientes');$('add-model').onclick=()=>editDialog('modelos');$('edit-form').addEventListener('submit',saveDialog);$('cancel-edit').onclick=()=>$('edit-dialog').close();document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>b.dataset.view==='editor'?newNote():view(b.dataset.view));document.querySelectorAll('tbody').forEach(b=>b.addEventListener('click',clickActions));
 state.token=sessionStorage.getItem('dunas_token');try{state.user=JSON.parse(sessionStorage.getItem('dunas_user')||'null')}catch{}
 if(state.token){try{const me=await request('/me');state.user=me.usuario;authenticated(true);await refresh();view('notas');return;}catch{await logout(false)}}authenticated(false);
});
