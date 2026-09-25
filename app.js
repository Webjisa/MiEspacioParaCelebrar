const SUPABASE_URL = 'https://hvuseljtqdgekotrsiwd.supabase.co';
const SUPABASE_ANON_KEY = window.MIESPACIO_SUPABASE_ANON_KEY || '';
const ADMIN_EMAIL = 'miespacioparacelebrar@gmail.com';

const FALLBACK_SPACES = [{
  id:'la-nube', name:'La Nube', city:'Lucena', province:'Córdoba', address:'', latitude:37.417400, longitude:-4.485511,
  image:'assets/7c24953f-0f92-43e4-9c18-c534940cba2e.jpg',
  description:'Espacio privado para cumpleaños, reuniones familiares y celebraciones.',
  priceWeekday:120, priceFriday:150, priceSaturday:150, priceSunday:150,
  deposit:null, hours:'11:00–23:00 / 00:00',
  features:['80 sillas','14 mesas','Cocina equipada','Aseos adaptados','Climatización independiente','Monitor/a infantil 3 h','Pista de fútbol','Parque infantil','Cama elástica'],
  gallery:['assets/44728f3e-b83b-415f-918a-0e77a90f1819.jpg','assets/78462fe7-2189-4361-8f27-d57f847d9b02.jpg','assets/9801f99c-b3cc-4bf1-a330-c8ba9e7b0564.jpg','assets/1cc39359-35d7-44a7-937c-df9c444bcf6c.jpg','assets/74dd0b0f-06b9-4ed7-8be5-b277926c49a9.jpg'],
  cleaningAvailable:false, cleaningPrice:0, cancellationPolicy:'', active:true, activeFrom:null, activeUntil:null
}];

const euro=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n||0));
const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const isActive=s=>{if(s.active===false)return false;const now=new Date();if(s.activeFrom&&new Date(`${s.activeFrom}T00:00:00`)>now)return false;if(s.activeUntil&&new Date(`${s.activeUntil}T23:59:59`)<now)return false;return true;};
const getSortedSpaces=spaces=>[...spaces].filter(isActive).sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));

async function getClient(){
  if(!SUPABASE_ANON_KEY)return null;
  if(!window.supabase)return null;
  try{return window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);}catch(error){console.error('Error creando cliente Supabase:',error);return null;}
}
async function getPublicSpaces(){
  const client=await getClient();
  if(!client)return FALLBACK_SPACES.filter(isActive);
  try{
    const {data,error}=await client.from('spaces').select(`id,name,city,province,address,latitude,longitude,description,weekday_price,friday_price,saturday_price,sunday_price,deposit,opening_time,closing_time,cleaning_available,cleaning_price,cancellation_policy,active,active_from,active_until,space_features(feature),space_images(image_url,sort_order)`).eq('active',true).order('name');
    if(error)throw error;
    return (data||[]).filter(isActive).map(normalizeSpace);
  }catch(error){console.warn('No se pudieron cargar los espacios públicos:',error);return FALLBACK_SPACES.filter(isActive);}
}
function normalizeSpace(s){
  const images=(s.space_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(x=>x.image_url).filter(Boolean);
  return {id:s.id,name:s.name,city:s.city,province:s.province,address:s.address||'',latitude:s.latitude,longitude:s.longitude,image:images[0]||FALLBACK_SPACES[0].image,gallery:images.slice(1),description:s.description||'',priceWeekday:s.weekday_price,priceFriday:s.friday_price,priceSaturday:s.saturday_price,priceSunday:s.sunday_price,deposit:s.deposit,hours:formatHours(s.opening_time,s.closing_time),features:(s.space_features||[]).map(x=>x.feature),cleaningAvailable:!!s.cleaning_available,cleaningPrice:s.cleaning_price||0,cancellationPolicy:s.cancellation_policy||'',active:s.active,activeFrom:s.active_from,activeUntil:s.active_until};
}
function formatHours(open,close){return open&&close?`${String(open).slice(0,5)}–${String(close).slice(0,5)}`:'Consultar horario';}
function footer(){return `<footer><div class="container footer-inner"><div><strong>MiEspacioParaCelebrar</strong><p>Tu espacio para celebrar.</p></div><div><p>Admin: <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p></div></div></footer>`;}
async function geocodeSpace(s){
  if(Number.isFinite(Number(s.latitude))&&Number.isFinite(Number(s.longitude))) return s;
  const address=[s.address,s.city,s.province,'España'].filter(Boolean).join(', ');
  if(!s.address)return s;
  const key='miespacio_geocode_'+encodeURIComponent(address.toLowerCase());
  try{const cached=sessionStorage.getItem(key);if(cached){const c=JSON.parse(cached);return {...s,latitude:Number(c.lat),longitude:Number(c.lon)};}}
  catch(_){ }
  try{
    const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=es&q='+encodeURIComponent(address);
    const r=await fetch(url,{headers:{Accept:'application/json'}});
    if(!r.ok)return s;
    const data=await r.json();
    if(!data.length)return s;
    const result={lat:data[0].lat,lon:data[0].lon};
    try{sessionStorage.setItem(key,JSON.stringify(result));}catch(_){ }
    return {...s,latitude:Number(result.lat),longitude:Number(result.lon)};
  }catch(error){console.warn('No se pudo geolocalizar',address,error);return s;}
}
async function initMap(id,spaces,single=false){
  const el=document.getElementById(id);if(!el||!window.L)return;
  el.innerHTML='<div class="map-loading">Cargando ubicación…</div>';
  const resolved=[];for(const s of spaces)resolved.push(await geocodeSpace(s));
  const points=resolved.filter(s=>Number.isFinite(Number(s.latitude))&&Number.isFinite(Number(s.longitude)));
  if(!points.length){el.innerHTML='<div class="map-empty">La ubicación exacta todavía no está configurada. El administrador puede introducir la dirección y localizar el espacio desde su área privada.</div>';return;}
  const map=L.map(el,{scrollWheelZoom:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const bounds=[];
  points.forEach(s=>{const p=[Number(s.latitude),Number(s.longitude)];bounds.push(p);L.marker(p).addTo(map).bindPopup(`<strong>${esc(s.name)}</strong><br>${esc(s.city)}${single?'':' · '+esc(s.province)}${single?'':'<br><a href="espacio.html?id='+encodeURIComponent(s.id)+'">Ver espacio</a>'}`);});
  if(single)map.setView(bounds[0],17);else map.fitBounds(bounds,{padding:[35,35],maxZoom:16});
  setTimeout(()=>map.invalidateSize(),150);
}

function priceForDate(s,date){
  if(!date)return null;const d=new Date(`${date}T12:00:00`);const day=d.getDay();
  if(day===5)return s.priceFriday; if(day===6)return s.priceSaturday; if(day===0)return s.priceSunday; return s.priceWeekday;
}
function formatDateLong(date){if(!date)return '';return new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${date}T12:00:00`));}
function calculateBookingPrice(s,start,end){if(!start||!end||end<start)return null;let d=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`),total=0,days=0;while(d<=last){total+=Number(priceForDate(s,d.toISOString().slice(0,10))||0);days++;d.setDate(d.getDate()+1);}return {days,total};}

async function renderSpaces(){const grid=document.querySelector('#spacesGrid');if(!grid)return;const spaces=await getPublicSpaces();window.__publicSpaces=spaces;grid.innerHTML=spaces.length?spaces.map(s=>`<a class="space-tile" href="espacio.html?id=${encodeURIComponent(s.id)}"><div class="space-tile-photo"><img src="${esc(s.image)}" alt="${esc(s.name)}"></div><div class="space-tile-info"><h2>${esc(s.name)}</h2><p>${esc(s.city)} · ${esc(s.province)}</p><div class="space-tile-price">Precio según el día</div></div></a>`).join(''):'<p class="muted">No hay espacios disponibles en este momento.</p>';}
async function getSelectedSpace(){const id=new URLSearchParams(location.search).get('id');const spaces=await getPublicSpaces();return spaces.find(s=>String(s.id)===String(id));}

async function renderSpaceDetail(){const root=document.querySelector('#spaceDetail');if(!root)return;const s=await getSelectedSpace();if(!s){root.innerHTML='<section class="section"><div class="container"><h1>Espacio no disponible</h1><p class="muted">Este espacio ya no está disponible públicamente.</p><a class="btn btn-dark" href="espacios.html">Ver espacios</a></div></section>';return;}document.title=`${s.name} · MiEspacioParaCelebrar`;
  
  root.innerHTML=`<section class="space-detail-hero"><div class="space-detail-image"><img src="${esc(s.image)}" alt="${esc(s.name)}"></div><div class="container space-detail-heading"><p class="eyebrow">${esc(s.city)} · ${esc(s.province)}</p><h1>${esc(s.name)}</h1><p>${esc(s.description)}</p></div></section>
  <section class="section"><div class="container detail-main"><div><p class="eyebrow">EL ESPACIO</p><h2>Todo lo que necesitas para celebrar</h2><div class="feature-list feature-list-large">${s.features.map(f=>`<span>${esc(f)}</span>`).join('')}</div></div><div class="detail-summary"><div><span>Precio</span><strong>Según el día</strong></div><div><span>Horario</span><strong>${esc(s.hours)}</strong></div><a class="btn btn-dark full" href="#disponibilidad">Solicitar reserva</a></div></div></section>
  <section class="gallery-section"><div class="container gallery">${[s.image,...s.gallery].slice(0,6).map((img,i)=>`<img class="g${i+1}" src="${esc(img)}" alt="${esc(s.name)}">`).join('')}</div></section>
  <section class="section soft"><div class="container details-grid"><div><p class="eyebrow">PRECIOS Y CONDICIONES</p><h2>Lo que debes saber antes de solicitar</h2></div><div class="rule-card"><div><span>Precio</span><strong>Se calcula según el día seleccionado</strong></div>${s.deposit!=null?`<div><span>Fianza</span><strong>${euro(s.deposit)}</strong></div>`:''}${s.cleaningAvailable?`<div><span>Limpieza</span><strong>${euro(s.cleaningPrice)}</strong></div>`:''}<div><span>Reserva</span><strong>Solicitud previa, no confirmación automática</strong></div><div><span>Retención</span><strong>Las fechas se mantienen 72 horas</strong></div></div></div></section>
  <section class="section map-section"><div class="container"><div class="section-head"><div><p class="eyebrow">UBICACIÓN</p><h2>Cómo llegar</h2></div><p class="muted">Ubicación del espacio.</p></div><div id="spaceMap" class="map"></div></div></section>
  <section id="disponibilidad" class="section booking-section"><div class="container booking-grid"><div><p class="eyebrow">SOLICITAR RESERVA · ${esc(s.name.toUpperCase())}</p><h2>Consulta el precio de tus fechas</h2><p class="muted">Selecciona las fechas. El sistema calculará el precio según el día. Después podrás enviar una solicitud y el propietario contactará contigo para cerrar la reserva.</p></div><div class="booking-card"><label for="startDate">Fecha de inicio</label><input id="startDate" type="date"><label for="endDate">Fecha de fin</label><input id="endDate" type="date"><div id="priceBox" class="price-box" hidden></div><label for="customerName">Nombre</label><input id="customerName" type="text" autocomplete="name"><label for="customerEmail">Email</label><input id="customerEmail" type="email" autocomplete="email"><label for="customerPhone">Teléfono</label><input id="customerPhone" type="tel" autocomplete="tel"><label class="check"><input id="cleaning" type="checkbox" ${s.cleaningAvailable?'':'disabled'}> Solicitar limpieza${s.cleaningAvailable?` (${euro(s.cleaningPrice)})`:''}</label><button class="btn btn-dark full" id="reserveBtn" type="button">Enviar solicitud</button><p class="micro">Las fechas se mantienen retenidas durante 72 horas. La reserva queda confirmada únicamente cuando el propietario la acepta.</p><p id="message" class="message" aria-live="polite"></p></div></div></section>`;
  initMap('spaceMap',[s],true);initBooking(s);
}
function updatePriceBox(s){const box=document.querySelector('#priceBox');if(!box)return;const start=document.querySelector('#startDate').value,end=document.querySelector('#endDate').value;const calc=calculateBookingPrice(s,start,end);if(!calc){box.hidden=true;return;}let d=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`),rows='';while(d<=last){const iso=d.toISOString().slice(0,10),p=priceForDate(s,iso);rows+=`<div><span>${esc(formatDateLong(iso))}</span><strong>${euro(p)}</strong></div>`;d.setDate(d.getDate()+1);}box.innerHTML=rows+`<div class="total"><span>Total alquiler</span><strong>${euro(calc.total)}</strong></div>`+(s.deposit!=null?`<div><span>Fianza</span><strong>${euro(s.deposit)}</strong></div>`:'');box.hidden=false;}
function initBooking(s){const btn=document.querySelector('#reserveBtn'),msg=document.querySelector('#message');if(!btn)return;document.querySelector('#startDate').addEventListener('change',()=>updatePriceBox(s));document.querySelector('#endDate').addEventListener('change',()=>updatePriceBox(s));btn.addEventListener('click',async()=>{const start=document.querySelector('#startDate').value,end=document.querySelector('#endDate').value,name=document.querySelector('#customerName').value.trim(),email=document.querySelector('#customerEmail').value.trim(),phone=document.querySelector('#customerPhone').value.trim(),cleaning=!!document.querySelector('#cleaning').checked;if(!start||!end||!name||!email||!phone){msg.textContent='Completa todos los datos para enviar la solicitud.';return;}if(end<start){msg.textContent='La fecha de fin no puede ser anterior a la de inicio.';return;}if(!window.supabase||!SUPABASE_ANON_KEY){msg.textContent='La solicitud online se activará al conectar la base de datos pública.';return;}msg.textContent='Enviando solicitud…';btn.disabled=true;try{const client=await getClient();const {error}=await client.rpc('create_booking_request',{p_space_id:s.id,p_customer_name:name,p_customer_email:email,p_customer_phone:phone,p_start_date:start,p_end_date:end,p_cleaning_requested:cleaning});if(error)throw error;msg.textContent='Solicitud enviada. El propietario contactará contigo para acordar las condiciones y confirmar la reserva.';}catch(e){msg.textContent=e.message||'No se ha podido enviar la solicitud.';btn.disabled=false;}});}

async function renderHome(){return;}
async function renderSpacesMap(){const map=document.querySelector('#spacesMap');if(!map)return;const spaces=window.__publicSpaces||await getPublicSpaces();initMap('spacesMap',spaces,false);}

async function initPrivateLogin(){const form=document.querySelector('#loginForm');if(!form)return;const msg=document.querySelector('#loginMessage');if(!SUPABASE_ANON_KEY){msg.textContent='Falta la clave pública de Supabase en la configuración.';return;}if(!window.supabase){msg.textContent='No se ha podido cargar la conexión con Supabase. Recarga la página.';return;}const client=await getClient();if(!client){msg.textContent='No se ha podido inicializar la conexión con Supabase.';return;}try{const {data:{session},error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;if(session){location.href='area-privada.html';return;}}catch(error){console.error('Error comprobando la sesión:',error);msg.textContent='No se ha podido comprobar la conexión con Supabase.';return;}form.addEventListener('submit',async e=>{e.preventDefault();msg.textContent='Accediendo…';const email=document.querySelector('#loginEmail').value.trim(),password=document.querySelector('#loginPassword').value;const {error}=await client.auth.signInWithPassword({email,password});if(error){console.error('Error de acceso:',error);msg.textContent='No se ha podido iniciar sesión. Comprueba el correo y la contraseña.';return;}location.href='area-privada.html';});}

async function renderPrivateArea(){
 const root=document.querySelector('#privateArea');if(!root)return;const client=await getClient();if(!client){root.innerHTML='<p class="message">No se ha configurado Supabase.</p>';return;}
 const {data:{user}}=await client.auth.getUser();if(!user){location.href='acceso.html';return;}
 const {data:profile}=await client.from('profiles').select('id,email,first_name,last_name,role,active').eq('id',user.id).maybeSingle();
 if(!profile||profile.active!==true||!['admin','owner'].includes(profile.role)){await client.auth.signOut();location.href='acceso.html';return;}
 document.querySelector('#privateName').textContent=`${profile.first_name||''} ${profile.last_name||''}`.trim()||profile.email;
 document.querySelector('#privateRole').textContent=profile.role==='admin'?'Administrador':'Propietario';
 document.querySelector('#logoutBtn').addEventListener('click',async()=>{await client.auth.signOut();location.href='acceso.html';});
 if(profile.role==='admin'){
   document.querySelector('#adminLink').hidden=false;
   document.querySelector('#ownerContent').innerHTML='<p class="muted">Área de administración disponible desde el panel.</p>';
   return;
 }
 const {data:owner}=await client.from('owners').select('id').eq('profile_id',user.id).maybeSingle();
 if(!owner){document.querySelector('#ownerContent').innerHTML='<p class="message">No se ha encontrado el perfil de propietario.</p>';return;}
 const {data:spaces,error}=await client.from('spaces').select('id,name,city,province,active,active_from,active_until').eq('owner_id',owner.id).order('name');
 if(error){document.querySelector('#ownerContent').innerHTML='<p class="message">No se han podido cargar tus locales.</p>';return;}
 const active=spaces.filter(isActive),inactive=spaces.filter(s=>!isActive(s));
 document.querySelector('#ownerContent').innerHTML=`${renderOwnerGroup('Locales activos',active,true)}${renderOwnerGroup('Locales inactivos',inactive,false)}<section class="owner-bookings"><div class="section-head"><div><p class="eyebrow">RESERVAS</p><h2>Solicitudes de tus locales</h2></div></div><div id="ownerBookings"><p class="muted">Cargando solicitudes…</p></div></section>`;
 await renderOwnerBookings(client);
}

async function renderOwnerBookings(client){
 const box=document.querySelector('#ownerBookings');if(!box)return;
 const {data,error}=await client.rpc('get_owner_bookings');
 if(error){box.innerHTML='<p class="message">No se han podido cargar las solicitudes. Ejecuta la SQL de reservas del área privada.</p>';return;}
 const rows=data||[];
 if(!rows.length){box.innerHTML='<p class="muted">No hay solicitudes de reserva.</p>';return;}
 box.innerHTML=`<div class="booking-list">${rows.map(renderOwnerBooking).join('')}</div>`;
 box.querySelectorAll('[data-booking-action]').forEach(btn=>btn.addEventListener('click',async()=>{
   const id=btn.dataset.id,action=btn.dataset.bookingAction,msg=document.querySelector('#ownerBookings .booking-action-message');
   btn.disabled=true;
   const rpc=action==='confirm'?'confirm_booking':'reject_booking';
   const {error}=await client.rpc(rpc,{p_booking_id:id});
   if(error){if(msg)msg.textContent=error.message;btn.disabled=false;return;}
   await renderOwnerBookings(client);
 }));
}
function renderOwnerBooking(b){
 const statusLabels={pending:'Pendiente',confirmed:'Confirmada',rejected:'Rechazada',expired:'Caducada',cancelled:'Cancelada'};
 const pending=b.booking_status==='pending';
 return `<article class="booking-item"><div class="booking-item-main"><div class="booking-item-head"><div><p class="eyebrow">${esc(b.space_name||'Espacio')}</p><h3>${esc(b.customer_name)}</h3></div><span class="status status-${esc(b.booking_status)}">${statusLabels[b.booking_status]||esc(b.booking_status)}</span></div><div class="booking-meta"><span><strong>Fechas</strong>${formatDateLong(b.start_date)} → ${formatDateLong(b.end_date)}</span><span><strong>Días</strong>${esc(b.total_days)}</span><span><strong>Teléfono</strong>${esc(b.customer_phone)}</span><span><strong>Email</strong>${esc(b.customer_email)}</span><span><strong>Limpieza</strong>${b.cleaning_requested?'Sí':'No'}</span></div></div>${pending?`<div class="booking-actions"><button class="btn btn-dark" data-booking-action="confirm" data-id="${esc(b.id)}">Aceptar</button><button class="btn btn-light" data-booking-action="reject" data-id="${esc(b.id)}">Rechazar</button></div>`:''}</article>`;
}

function renderOwnerGroup(title,spaces,active){return `<section class="owner-group"><div class="section-head"><div><p class="eyebrow">${active?'ACTIVOS':'HISTÓRICO'}</p><h2>${title}</h2></div></div>${spaces.length?`<div class="owner-grid">${spaces.map(s=>`<article class="owner-space ${active?'':'inactive'}"><div><h3>${esc(s.name)}</h3><p>${esc(s.city||'')} · ${esc(s.province||'')}</p></div><div class="owner-date">${active?`Activo hasta <strong>${formatDateLong(s.active_until)}</strong>`:`Caducado el <strong>${formatDateLong(s.active_until)}</strong>`}</div></article>`).join('')}</div>`:'<p class="muted">No hay locales en esta sección.</p>'}</section>`;}

async function initAdminArea(){
 const root=document.querySelector('#adminArea');if(!root)return;const client=await getClient();if(!client){root.innerHTML='<p class="message">No se ha configurado Supabase.</p>';return;}
 const {data:{user}}=await client.auth.getUser();if(!user){location.href='acceso.html';return;}
 const {data:profile}=await client.from('profiles').select('role,active').eq('id',user.id).maybeSingle();if(!profile||profile.role!=='admin'||!profile.active){location.href='area-privada.html';return;}
 const [spacesRes,ownersRes,bookingsRes]=await Promise.all([
   client.from('spaces').select('id,name,city,province,active,active_from,active_until,weekday_price,friday_price,saturday_price,sunday_price,deposit,address,latitude,longitude').order('name'),
   client.rpc('admin_list_owners'), client.rpc('admin_get_all_bookings')
 ]);
 if(spacesRes.error){root.innerHTML='<p class="message">No se han podido cargar los locales: '+esc(spacesRes.error.message)+'</p>';return;}
 const spaces=spacesRes.data||[],owners=ownersRes.data||[],bookings=bookingsRes.data||[];
 root.innerHTML=`<div class="admin-panel"><div class="section-head"><div><p class="eyebrow">ADMINISTRACIÓN</p><h1>Panel de administración</h1></div><button id="adminLogout" class="btn btn-light" type="button">Cerrar sesión</button></div>
 <p class="muted">Desde aquí gestionas propietarios, locales, periodos de actividad, precios, fianzas y reservas.</p>
 <div class="admin-actions"><button id="newOwner" class="btn btn-dark" type="button">+ Nuevo propietario</button><button id="newSpace" class="btn btn-light" type="button">+ Nuevo local</button></div>
 <section class="admin-section"><div class="section-head"><div><p class="eyebrow">PROPIETARIOS</p><h2>Propietarios registrados</h2></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Propietario</th><th>Email</th><th>Teléfono</th><th>Locales</th><th>Estado</th></tr></thead><tbody>${owners.length?owners.map(o=>{const count=spaces.filter(s=>s.owner_id===o.owner_id).length;return `<tr><td><strong>${esc((o.first_name||'')+' '+(o.last_name||''))}</strong><br><span class="muted">${esc(o.legal_name||'')}</span></td><td>${esc(o.email)}</td><td>${esc(o.phone||'—')}</td><td>${count}</td><td>${o.active?'🟢 Activo':'⚪ Inactivo'}</td></tr>`}).join(''):'<tr><td colspan="5" class="muted">No hay propietarios registrados.</td></tr>'}</tbody></table></div></section>
 <section class="admin-section"><div class="section-head"><div><p class="eyebrow">LOCALES</p><h2>Espacios registrados</h2></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Local</th><th>Estado</th><th>Periodo</th><th>Precios</th><th>Fianza</th><th></th></tr></thead><tbody>${spaces.map(renderAdminSpaceRow).join('')}</tbody></table></div></section>
 <section class="admin-section"><div class="section-head"><div><p class="eyebrow">RESERVAS</p><h2>Todas las solicitudes</h2></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Local</th><th>Propietario</th><th>Cliente</th><th>Fechas</th><th>Estado</th></tr></thead><tbody>${bookings.length?bookings.map(b=>`<tr><td><strong>${esc(b.space_name)}</strong></td><td>${esc(b.owner_name||'')}</td><td>${esc(b.customer_name)}<br><span class="muted">${esc(b.customer_email)}</span></td><td>${formatDateLong(b.start_date)} → ${formatDateLong(b.end_date)}</td><td><span class="status status-${esc(b.booking_status)}">${esc({pending:'Pendiente',confirmed:'Confirmada',rejected:'Rechazada',expired:'Caducada',cancelled:'Cancelada'}[b.booking_status]||b.booking_status)}</span></td></tr>`).join(''):'<tr><td colspan="5" class="muted">No hay solicitudes.</td></tr>'}</tbody></table></div></section>
 <p id="adminMessage" class="message" aria-live="polite"></p></div>`;
 document.querySelector('#adminLogout').addEventListener('click',async()=>{await client.auth.signOut();location.href='acceso.html';});
 document.querySelectorAll('.admin-edit').forEach(btn=>btn.addEventListener('click',()=>openAdminEditor(btn.dataset.id,spaces.find(x=>String(x.id)===btn.dataset.id),client)));
 document.querySelector('#newOwner').addEventListener('click',()=>openOwnerEditor(client));
 document.querySelector('#newSpace').addEventListener('click',()=>openSpaceEditor(client,owners));
}
function renderAdminSpaceRow(s){const active=isActive(s)&&s.active!==false;return `<tr><td><strong>${esc(s.name)}</strong><br><span class="muted">${esc(s.city||'')} · ${esc(s.province||'')}</span></td><td>${active?'🟢 Activo':'⚪ Inactivo'}</td><td>${s.active_until?formatDateLong(s.active_until):'Sin fecha de fin'}</td><td>${euro(s.weekday_price)} · ${euro(s.friday_price)} · ${euro(s.saturday_price)} · ${euro(s.sunday_price)}</td><td>${s.deposit==null?'—':euro(s.deposit)}</td><td><button class="btn btn-light admin-edit" data-id="${esc(s.id)}" type="button">Editar</button></td></tr>`;}
function modalShell(title,body){const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal-card"><div class="section-head"><div><p class="eyebrow">ADMINISTRACIÓN</p><h2>${esc(title)}</h2></div><button class="modal-close btn btn-light" type="button">Cerrar</button></div>${body}</div>`;document.body.appendChild(modal);modal.querySelector('.modal-close').onclick=()=>modal.remove();return modal;}
function openOwnerEditor(client){const modal=modalShell('Nuevo propietario',`<div class="admin-form-grid"><label>Nombre<input id="ownFirst" required></label><label>Apellidos<input id="ownLast" required></label><label>Email<input id="ownEmail" type="email" required></label><label>Contraseña inicial<input id="ownPass" type="password" minlength="6" required></label><label>Teléfono<input id="ownPhone"></label><label>Dirección<input id="ownAddress"></label><label>Localidad<input id="ownCity"></label><label>Código postal<input id="ownPostal"></label><label>Nombre fiscal<input id="ownLegal"></label><label>NIF/CIF<input id="ownTax"></label></div><button id="ownSave" class="btn btn-dark full" type="button">Crear propietario</button><p id="ownMsg" class="message"></p>`);modal.querySelector('#ownSave').onclick=async()=>{const msg=modal.querySelector('#ownMsg'),v=id=>modal.querySelector(id).value.trim();msg.textContent='Creando…';const {data:{session}}=await client.auth.getSession();if(!session){msg.textContent='Sesión no válida.';return;}try{const res=await fetch(`${SUPABASE_URL}/functions/v1/create-owner`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({email:v('#ownEmail'),password:modal.querySelector('#ownPass').value,first_name:v('#ownFirst'),last_name:v('#ownLast'),phone:v('#ownPhone')||null,address:v('#ownAddress')||null,city:v('#ownCity')||null,postal_code:v('#ownPostal')||null,legal_name:v('#ownLegal')||null,tax_id:v('#ownTax')||null})});const data=await res.json();if(!res.ok)throw new Error(data.error||'No se pudo crear el propietario');msg.textContent='Propietario creado correctamente.';setTimeout(()=>{modal.remove();initAdminArea();},600);}catch(e){msg.textContent=e.message;}};}
function openSpaceEditor(client,owners){if(!owners.length){alert('Primero debes crear un propietario.');return;}const options=owners.filter(o=>o.active).map(o=>`<option value="${esc(o.owner_id)}">${esc((o.first_name||'')+' '+(o.last_name||'')+' · '+o.email)}</option>`).join('');const modal=modalShell('Nuevo local',`<div class="admin-form-grid"><label>Propietario<select id="spOwner">${options}</select></label><label>Nombre del local<input id="spName" required></label><label>Localidad<input id="spCity" value="Lucena"></label><label>Provincia<input id="spProvince" value="Córdoba"></label><label>Precio lunes–jueves (€)<input id="spWeek" type="number" min="0" step="0.01"></label><label>Precio viernes (€)<input id="spFri" type="number" min="0" step="0.01"></label><label>Precio sábado (€)<input id="spSat" type="number" min="0" step="0.01"></label><label>Precio domingo (€)<input id="spSun" type="number" min="0" step="0.01"></label><label>Fianza (€)<input id="spDep" type="number" min="0" step="0.01"><span class="micro">Vacío = sin fianza.</span></label><label>Inicio actividad<input id="spFrom" type="date"></label><label>Fin actividad<input id="spUntil" type="date"></label><label>Dirección<input id="spAddress"></label><label>Latitud<input id="spLat" type="number" step="0.000001"></label><label>Longitud<input id="spLng" type="number" step="0.000001"></label><label>Descripción<textarea id="spDesc"></textarea></label></div><button id="spLocate" class="btn btn-light" type="button">Ubicar dirección en el mapa</button><button id="spSave" class="btn btn-dark full" type="button">Crear local</button><p id="spMsg" class="message"></p>`);modal.querySelector('#spLocate').onclick=async()=>{const msg=modal.querySelector('#spMsg');const address=modal.querySelector('#spAddress').value.trim();if(!address){msg.textContent='Introduce primero una dirección.';return;}msg.textContent='Buscando ubicación…';const found=await geocodeSpace({address,city:modal.querySelector('#spCity').value.trim(),province:modal.querySelector('#spProvince').value.trim()});if(!Number.isFinite(Number(found.latitude))||!Number.isFinite(Number(found.longitude))){msg.textContent='No se ha encontrado esa dirección. Revisa la dirección e inténtalo de nuevo.';return;}modal.querySelector('#spLat').value=Number(found.latitude).toFixed(6);modal.querySelector('#spLng').value=Number(found.longitude).toFixed(6);msg.textContent='Ubicación encontrada. Guarda el local.';};modal.querySelector('#spSave').onclick=async()=>{const msg=modal.querySelector('#spMsg'),v=id=>modal.querySelector(id).value.trim(),num=id=>v(id)===''?null:Number(v(id));msg.textContent='Creando…';const {data,error}=await client.rpc('admin_create_space',{p_owner_id:v('#spOwner'),p_name:v('#spName'),p_city:v('#spCity')||null,p_province:v('#spProvince')||null,p_description:v('#spDesc')||null,p_weekday_price:num('#spWeek'),p_friday_price:num('#spFri'),p_saturday_price:num('#spSat'),p_sunday_price:num('#spSun'),p_deposit:num('#spDep'),p_address:v('#spAddress')||null,p_latitude:num('#spLat'),p_longitude:num('#spLng'),p_active:true,p_active_from:v('#spFrom')||null,p_active_until:v('#spUntil')||null});if(error){msg.textContent=error.message;return;}msg.textContent='Local creado correctamente.';setTimeout(()=>{modal.remove();initAdminArea();},600);};}
function openAdminEditor(id,s,client){const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML=`<div class="modal-card"><div class="section-head"><div><p class="eyebrow">EDITAR LOCAL</p><h2>${esc(s.name)}</h2></div><button class="modal-close btn btn-light" type="button">Cerrar</button></div><div class="admin-form-grid"><label>Publicado como activo<input id="admActive" type="checkbox" ${s.active?'checked':''}></label><label>Inicio de actividad<input id="admFrom" type="date" value="${esc(s.active_from||'')}"></label><label>Fin de actividad<input id="admUntil" type="date" value="${esc(s.active_until||'')}"></label><label>Lunes–jueves (€)<input id="admWeekday" type="number" min="0" step="0.01" value="${s.weekday_price??''}"></label><label>Viernes (€)<input id="admFriday" type="number" min="0" step="0.01" value="${s.friday_price??''}"></label><label>Sábado (€)<input id="admSaturday" type="number" min="0" step="0.01" value="${s.saturday_price??''}"></label><label>Domingo (€)<input id="admSunday" type="number" min="0" step="0.01" value="${s.sunday_price??''}"></label><label>Fianza (€)<input id="admDeposit" type="number" min="0" step="0.01" value="${s.deposit==null?'':s.deposit}"><span class="micro">Vacío = sin fianza.</span></label><label>Dirección<input id="admAddress" type="text" value="${esc(s.address||'')}"></label><label>Latitud<input id="admLat" type="number" step="0.000001" value="${s.latitude??''}"></label><label>Longitud<input id="admLng" type="number" step="0.000001" value="${s.longitude??''}"></label></div><button id="admLocate" class="btn btn-light" type="button">Ubicar dirección en el mapa</button><button id="admSave" class="btn btn-dark full" type="button">Guardar cambios</button><p id="admEditorMsg" class="message"></p></div>`;document.body.appendChild(modal);modal.querySelector('.modal-close').onclick=()=>modal.remove();modal.querySelector('#admLocate').onclick=async()=>{const msg=modal.querySelector('#admEditorMsg');const address=modal.querySelector('#admAddress').value.trim();if(!address){msg.textContent='Introduce primero una dirección.';return;}msg.textContent='Buscando ubicación…';const found=await geocodeSpace({address,city:s.city,province:s.province});if(!Number.isFinite(Number(found.latitude))||!Number.isFinite(Number(found.longitude))){msg.textContent='No se ha encontrado esa dirección. Revisa la dirección e inténtalo de nuevo.';return;}modal.querySelector('#admLat').value=Number(found.latitude).toFixed(6);modal.querySelector('#admLng').value=Number(found.longitude).toFixed(6);msg.textContent='Ubicación encontrada. Guarda los cambios.';};modal.querySelector('#admSave').onclick=async()=>{const msg=modal.querySelector('#admEditorMsg');const val=id=>modal.querySelector(id).value;const num=id=>val(id)===''?null:Number(val(id));msg.textContent='Guardando…';const {error}=await client.rpc('admin_update_space',{p_space_id:id,p_active:modal.querySelector('#admActive').checked,p_active_from:val('#admFrom')||null,p_active_until:val('#admUntil')||null,p_weekday_price:num('#admWeekday'),p_friday_price:num('#admFriday'),p_saturday_price:num('#admSaturday'),p_sunday_price:num('#admSunday'),p_deposit:num('#admDeposit'),p_address:val('#admAddress')||null,p_latitude:num('#admLat'),p_longitude:num('#admLng')});if(error){msg.textContent=error.message;return;}modal.remove();initAdminArea();};}
