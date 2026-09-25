const APP_VERSION='18.0';
const SUPABASE_URL = 'https://hvuseljtqdgekotrsiwd.supabase.co';
const SUPABASE_ANON_KEY = window.MIESPACIO_SUPABASE_ANON_KEY || '';
const ADMIN_EMAIL = 'miespacioparacelebrar@gmail.com';

const LA_NUBE_ID = '340c371d-e09b-4a59-bfaa-343d7509a35c';

// Fallback de emergencia únicamente para La Nube. El ID es el UUID real de Supabase.
// Nunca se debe usar un identificador de prueba como "la-nube" para crear reservas.
const FALLBACK_SPACES = [{
  id:LA_NUBE_ID, name:'La Nube', city:'Lucena', province:'Córdoba', address:'', latitude:37.417400, longitude:-4.485511,
  image:'assets/7c24953f-0f92-43e4-9c18-c534940cba2e.jpg',
  description:'Espacio privado para cumpleaños, reuniones familiares y celebraciones.',
  priceWeekday:120, priceFriday:150, priceSaturday:150, priceSunday:150,
  deposit:50, hours:'11:00–23:00 / 00:00',
  features:['80 sillas','14 mesas','Cocina equipada','Aseos adaptados','Climatización independiente','Monitor/a infantil 3 h','Pista de fútbol','Parque infantil','Cama elástica'],
  gallery:['assets/44728f3e-b83b-415f-918a-0e77a90f1819.jpg','assets/78462fe7-2189-4361-8f27-d57f847d9b02.jpg','assets/9801f99c-b3cc-4bf1-a330-c8ba9e7b0564.jpg','assets/1cc39359-35d7-44a7-937c-df9c444bcf6c.jpg','assets/74dd0b0f-06b9-4ed7-8be5-b277926c49a9.jpg'],
  cleaningAvailable:true, cleaningPrice:50, cancellationPolicy:'', active:true, activeFrom:'2026-09-25', activeUntil:'2027-12-31'
}];

const euro=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n||0));
const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const isActive=s=>{if(s.active===false)return false;const now=new Date();if(s.activeFrom&&new Date(`${s.activeFrom}T00:00:00`)>now)return false;if(s.activeUntil&&new Date(`${s.activeUntil}T23:59:59`)<now)return false;return true;};
const getSortedSpaces=spaces=>[...spaces].filter(isActive).sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));

async function getClient(){
  if(!SUPABASE_ANON_KEY||!window.supabase)return null;
  try{return window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);}catch(error){console.error('Error creando cliente Supabase:',error);return null;}
}

async function getPublicSpaces(){
  const client=await getClient();
  if(!client){
    window.__publicSpacesError='No se ha podido conectar con la base de datos pública.';
    return FALLBACK_SPACES.filter(isActive);
  }
  try{
    // Consulta principal separada de las relaciones para que un fallo de imágenes/features
    // no convierta el espacio en un falso ID de prueba.
    const {data,error}=await client.from('spaces').select('id,name,city,province,latitude,longitude,description,weekday_price,friday_price,saturday_price,sunday_price,deposit,opening_time,closing_time,cleaning_available,cleaning_price,cancellation_policy,active,active_from,active_until').eq('active',true).order('name');
    if(error)throw error;
    const active=(data||[]).filter(s=>isActive({active:s.active,activeFrom:s.active_from,activeUntil:s.active_until}));
    const normalized=[];
    for(const s of active){
      let features=[],images=[];
      const featureRes=await client.from('space_features').select('feature').eq('space_id',s.id).order('sort_order');
      if(!featureRes.error)features=(featureRes.data||[]).map(x=>x.feature).filter(Boolean);
      const imageRes=await client.from('space_images').select('image_url,sort_order').eq('space_id',s.id).order('sort_order');
      if(!imageRes.error)images=(imageRes.data||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(x=>x.image_url).filter(Boolean);
      let normalizedSpace=normalizeSpace({...s,space_features:features.map(feature=>({feature})),space_images:images.map((image_url,i)=>({image_url,sort_order:i}))});
      // Salvaguarda para La Nube: mientras se termina la configuración de servicios,
      // su ficha debe reflejar la configuración confirmada en Supabase.
      if(String(normalizedSpace.id)===LA_NUBE_ID){
        normalizedSpace={...normalizedSpace,cleaningAvailable:true,cleaningPrice:50,deposit:normalizedSpace.deposit==null?50:normalizedSpace.deposit};
      }
      normalized.push(normalizedSpace);
    }
    window.__publicSpacesError='';
    return normalized;
  }catch(error){
    console.warn('No se pudieron cargar los espacios públicos:',error);
    window.__publicSpacesError=error?.message||'No se pudieron cargar los espacios.';
    // Emergencia: La Nube conserva su UUID real, nunca un alias textual.
    return FALLBACK_SPACES.filter(isActive);
  }
}
function normalizeSpace(s){
  const images=(s.space_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(x=>x.image_url).filter(Boolean);
  return {id:s.id,name:s.name,city:s.city,province:s.province,address:s.address||'',latitude:s.latitude,longitude:s.longitude,image:images[0]||FALLBACK_SPACES[0].image,gallery:images.slice(1),description:s.description||'',priceWeekday:s.weekday_price,priceFriday:s.friday_price,priceSaturday:s.saturday_price,priceSunday:s.sunday_price,deposit:s.deposit,hours:formatHours(s.opening_time,s.closing_time),features:(s.space_features||[]).map(x=>x.feature),cleaningAvailable:!!s.cleaning_available,cleaningPrice:s.cleaning_price||0,cancellationPolicy:s.cancellation_policy||'',active:s.active,activeFrom:s.active_from,activeUntil:s.active_until};
}
function formatHours(open,close){return open&&close?`${String(open).slice(0,5)}–${String(close).slice(0,5)}`:'Consultar horario';}
function footer(){return `<footer><div class="container footer-inner"><div class="footer-brand-block"><div class="footer-brand"><img class="footer-logo" src="assets/logo-miespacio-principal.png" alt="MiEspacio Para Celebrar"><strong>MiEspacioParaCelebrar</strong></div><p>Admin: <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p></div></div></footer>`;}
async function geocodeSpace(s){
  if(Number.isFinite(Number(s.latitude))&&Number.isFinite(Number(s.longitude)))return s;
  const address=[s.address,s.city,s.province,'España'].filter(Boolean).join(', ');if(!s.address)return s;
  const key='miespacio_geocode_'+encodeURIComponent(address.toLowerCase());
  try{const cached=sessionStorage.getItem(key);if(cached){const c=JSON.parse(cached);return {...s,latitude:Number(c.lat),longitude:Number(c.lon)};}}catch(_){ }
  try{const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=es&q='+encodeURIComponent(address);const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)return s;const data=await r.json();if(!data.length)return s;const result={lat:data[0].lat,lon:data[0].lon};try{sessionStorage.setItem(key,JSON.stringify(result));}catch(_){ }return {...s,latitude:Number(result.lat),longitude:Number(result.lon)};}catch(error){console.warn('No se pudo geolocalizar',address,error);return s;}
}
async function initMap(id,spaces,single=false){
  const el=document.getElementById(id);if(!el||!window.L)return;el.innerHTML='<div class="map-loading">Cargando ubicación…</div>';
  const resolved=[];for(const s of spaces)resolved.push(await geocodeSpace(s));
  const points=resolved.filter(s=>Number.isFinite(Number(s.latitude))&&Number.isFinite(Number(s.longitude)));
  if(!points.length){el.innerHTML='<div class="map-empty">La ubicación exacta todavía no está configurada. El administrador puede introducir la dirección y localizar el espacio desde su área privada.</div>';return;}
  const map=L.map(el,{scrollWheelZoom:false});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);const bounds=[];
  points.forEach(s=>{const p=[Number(s.latitude),Number(s.longitude)];bounds.push(p);L.marker(p).addTo(map).bindPopup(`<strong>${esc(s.name)}</strong><br>${esc(s.city)}${single?'':' · '+esc(s.province)}${single?'':'<br><a href="espacio.html?id='+encodeURIComponent(s.id)+'">Ver espacio</a>'}`);});
  if(single)map.setView(bounds[0],17);else map.fitBounds(bounds,{padding:[35,35],maxZoom:16});setTimeout(()=>map.invalidateSize(),150);
}

function priceForDate(s,date){if(!date)return null;const d=new Date(`${date}T12:00:00`),day=d.getDay();if(day===5)return s.priceFriday;if(day===6)return s.priceSaturday;if(day===0)return s.priceSunday;return s.priceWeekday;}
function formatDateLong(date){if(!date)return '';return new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${date}T12:00:00`));}
function calculateBookingPrice(s,start,end){if(!start||!end||end<start)return null;let d=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`),total=0,days=0;while(d<=last){total+=Number(priceForDate(s,d.toISOString().slice(0,10))||0);days++;d.setDate(d.getDate()+1);}return {days,total};}
function localISODate(date=new Date()){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
function priceRange(s){const values=[s.priceWeekday,s.priceFriday,s.priceSaturday,s.priceSunday].map(Number).filter(Number.isFinite);if(!values.length)return 'Consultar';const min=Math.min(...values),max=Math.max(...values);return min===max?euro(min):`${euro(min)} – ${euro(max)}`;}

async function renderSpaces(){const grid=document.querySelector('#spacesGrid');if(!grid)return;const spaces=await getPublicSpaces();window.__publicSpaces=spaces;grid.innerHTML=spaces.length?spaces.map(s=>`<a class="space-tile" href="espacio.html?id=${encodeURIComponent(s.id)}"><div class="space-tile-photo"><img src="${esc(s.image)}" alt="${esc(s.name)}"></div><div class="space-tile-info"><h2>${esc(s.name)}</h2><p>${esc(s.city)} · ${esc(s.province)}</p><div class="space-tile-price">${esc(priceRange(s))}</div></div></a>`).join(''):'<p class="muted">No hay espacios disponibles en este momento.</p>';}
async function getSelectedSpace(){const id=new URLSearchParams(location.search).get('id');const spaces=await getPublicSpaces();return spaces.find(s=>String(s.id)===String(id));}

async function renderSpaceDetail(){
  const root=document.querySelector('#spaceDetail');if(!root)return;const s=await getSelectedSpace();
  if(!s){root.innerHTML='<section class="section"><div class="container"><h1>Espacio no disponible</h1><p class="muted">Este espacio ya no está disponible públicamente.</p><a class="btn btn-dark" href="espacios.html">Ver espacios</a></div></section>';return;}
  document.title=`${s.name} · MiEspacioParaCelebrar`;
  root.innerHTML=`<section class="space-detail-hero"><div class="space-detail-image"><img src="${esc(s.image)}" alt="${esc(s.name)}"></div><div class="container space-detail-heading"><p class="eyebrow">${esc(s.city)} · ${esc(s.province)}</p><h1>${esc(s.name)}</h1><p>${esc(s.description)}</p></div></section>
  <section class="section"><div class="container detail-main"><div><p class="eyebrow">EL ESPACIO</p><h2>Todo lo que necesitas para celebrar</h2><div class="feature-list feature-list-large">${s.features.map(f=>`<span>${esc(f)}</span>`).join('')}</div></div><div class="detail-summary"><div><span>Precio</span><strong>${esc(priceRange(s))}</strong></div>${s.deposit!=null?`<div><span>Fianza</span><strong>${euro(s.deposit)}</strong></div>`:''}<div><span>Horario</span><strong>${esc(s.hours)}</strong></div><a class="btn btn-dark full" href="#disponibilidad">Solicitar reserva</a></div></div></section>
  <section class="gallery-section"><div class="container gallery">${[s.image,...s.gallery].slice(0,6).map((img,i)=>`<img class="g${i+1}" src="${esc(img)}" alt="${esc(s.name)}">`).join('')}</div></section>
  <section class="section soft"><div class="container details-grid"><div><p class="eyebrow">PRECIOS Y CONDICIONES</p><h2>Lo que debes saber antes de solicitar</h2></div><div class="rule-card"><div><span>Precio</span><strong>${esc(priceRange(s))} según el día</strong></div>${s.deposit!=null?`<div><span>Fianza</span><strong>${euro(s.deposit)}</strong></div>`:''}${s.cleaningAvailable?`<div><span>Limpieza</span><strong>${euro(s.cleaningPrice)}</strong></div>`:''}<div><span>Reserva</span><strong>Solicitud previa, no confirmación automática</strong></div><div><span>Retención</span><strong>Las fechas se mantienen 72 horas</strong></div></div></div></section>
  <section class="section map-section"><div class="container"><div class="section-head"><div><p class="eyebrow">UBICACIÓN</p><h2>Cómo llegar</h2></div><p class="muted">Ubicación del espacio.</p></div><div id="spaceMap" class="map"></div></div></section>
  <section id="disponibilidad" class="section booking-section"><div class="container booking-grid"><div><p class="eyebrow">SOLICITAR RESERVA · ${esc(s.name.toUpperCase())}</p><h2>Consulta el precio de tus fechas</h2><p class="muted">Selecciona las fechas. El sistema calculará el precio según el día. Después podrás enviar una solicitud y el propietario contactará contigo para cerrar las condiciones de la reserva.</p></div><div class="booking-card"><label for="startDate">Fecha de inicio</label><div class="date-picker-wrap"><input id="startDate" class="booking-date-input" type="text" inputmode="numeric" autocomplete="off" placeholder="dd/mm/aaaa" aria-haspopup="dialog" aria-expanded="false"><button type="button" class="date-picker-toggle" data-date-target="startDate" aria-label="Abrir calendario">▾</button></div><label for="endDate">Fecha de fin</label><div class="date-picker-wrap"><input id="endDate" class="booking-date-input" type="text" inputmode="numeric" autocomplete="off" placeholder="dd/mm/aaaa" aria-haspopup="dialog" aria-expanded="false"><button type="button" class="date-picker-toggle" data-date-target="endDate" aria-label="Abrir calendario">▾</button></div><div id="bookingCalendar" class="booking-calendar" hidden></div><label class="check booking-cleaning" ${s.cleaningAvailable?'':'hidden'}><input id="cleaning" type="checkbox"> <span>Solicitar limpieza${s.cleaningAvailable?` (${euro(s.cleaningPrice)})`:''}</span></label><div id="priceBox" class="price-box" hidden></div><label for="customerName">Nombre</label><input id="customerName" type="text" autocomplete="name"><label for="customerEmail">Email</label><input id="customerEmail" type="email" autocomplete="email"><label for="customerPhone">Teléfono</label><input id="customerPhone" type="tel" autocomplete="tel"><button class="btn btn-dark full" id="reserveBtn" type="button">Enviar solicitud</button><p class="micro">Las fechas se mantienen retenidas durante 72 horas. La reserva queda confirmada únicamente cuando el propietario la acepta.</p><p id="message" class="message" aria-live="polite"></p></div></div></section>`;
  initMap('spaceMap',[s],true);initBooking(s);
}
function parseUserDate(value){
  const v=String(value||'').trim();
  let y,mo,d,m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(m){d=Number(m[1]);mo=Number(m[2]);y=Number(m[3]);}
  else{m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return '';y=Number(m[1]);mo=Number(m[2]);d=Number(m[3]);}
  const check=new Date(`${iso}T12:00:00`);
  if(Number.isNaN(check.getTime())||check.getFullYear()!==y||check.getMonth()+1!==mo||check.getDate()!==d)return '';
  return iso;
}
function displayDate(iso){if(!iso)return '';const [y,m,d]=iso.split('-');return `${d}/${m}/${y}`;}
function dateToParts(iso){const [y,m,d]=iso.split('-').map(Number);return {y,m,d};}
function isoFromParts(y,m,d){return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function addDaysISO(iso,days){const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+days);return localISODate(d);}
function dateInRange(iso,start,end){return !!iso&&!!start&&!!end&&iso>=start&&iso<=end;}
function rangeHasUnavailable(start,end,unavailable){if(!start||!end)return false;let d=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`);while(d<=last){const iso=localISODate(d);if(unavailable.has(iso))return true;d.setDate(d.getDate()+1);}return false;}

async function getUnavailableDates(spaceId){
  const map=new Map();
  const client=await getClient();
  if(!client||!spaceId)return map;
  try{
    const {data,error}=await client.rpc('get_space_unavailable_ranges',{p_space_id:spaceId});
    if(error)throw error;
    for(const row of (data||[])){
      let d=new Date(`${row.start_date}T12:00:00`),last=new Date(`${row.end_date}T12:00:00`);
      while(d<=last){
        const iso=localISODate(d);
        const reason=row.reason==='confirmed'||row.reason==='blocked'?'confirmed':'pending';
        if(!map.has(iso)||reason==='confirmed')map.set(iso,reason);
        d.setDate(d.getDate()+1);
      }
    }
  }catch(error){
    console.warn('No se pudieron cargar las fechas no disponibles:',error);
  }
  return map;
}

function updatePriceBox(s){
  const box=document.querySelector('#priceBox');if(!box)return;
  const start=parseUserDate(document.querySelector('#startDate')?.value),end=parseUserDate(document.querySelector('#endDate')?.value);
  const calc=calculateBookingPrice(s,start,end);if(!calc){box.hidden=true;return;}
  const cleaning=s.cleaningAvailable&&!!document.querySelector('#cleaning')?.checked?s.cleaningPrice:0;
  const deposit=Number(s.deposit||0);let d=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`),rows='';
  while(d<=last){const iso=localISODate(d),p=priceForDate(s,iso);rows+=`<div><span>${esc(formatDateLong(iso))}</span><strong>${euro(p)}</strong></div>`;d.setDate(d.getDate()+1);}
  const finalTotal=calc.total+Number(cleaning||0)+deposit;
  box.innerHTML=rows+`<div><span>Total alquiler</span><strong>${euro(calc.total)}</strong></div>${s.cleaningAvailable&&cleaning?`<div><span>Limpieza</span><strong>${euro(cleaning)}</strong></div>`:''}${s.deposit!=null?`<div><span>Fianza</span><strong>${euro(deposit)}</strong></div>`:''}<div class="total"><span>Total <small>(Fianza incluida)</small></span><strong>${euro(finalTotal)}</strong></div>`;box.hidden=false;
}

function renderBookingCalendar(state){
  const cal=document.querySelector('#bookingCalendar');if(!cal)return;
  const {year,month,activeTarget,start,end,unavailable}=state;
  const first=new Date(year,month-1,1),daysInMonth=new Date(year,month,0).getDate(),startWeek=(first.getDay()+6)%7;
  const monthLabel=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(first);
  let cells='';
  const prevMonthDays=new Date(year,month-1,0).getDate();
  for(let i=0;i<startWeek;i++){
    const d=prevMonthDays-startWeek+i+1, pm=month===1?12:month-1, py=month===1?year-1:year;
    cells+=`<button type="button" class="calendar-day outside" data-date="${isoFromParts(py,pm,d)}" disabled>${d}</button>`;
  }
  for(let d=1;d<=daysInMonth;d++){
    const iso=isoFromParts(year,month,d),reason=unavailable.get(iso)||'',disabled=!!reason||(state.minDate&&iso<state.minDate)||(state.maxDate&&iso>state.maxDate);
    const classes=['calendar-day'];
    if(reason==='confirmed')classes.push('unavailable-confirmed');
    if(reason==='pending')classes.push('unavailable-pending');
    if(dateInRange(iso,start,end))classes.push('selected');
    if(start&&iso===start)classes.push('selected-start');
    if(end&&iso===end)classes.push('selected-end');
    if(iso===localISODate())classes.push('today');
    cells+=`<button type="button" class="${classes.join(' ')}" data-date="${iso}" ${disabled?'disabled':''}>${d}</button>`;
  }
  const trailing=(7-((startWeek+daysInMonth)%7))%7;
  for(let i=1;i<=trailing;i++){const nm=month===12?1:month+1,ny=month===12?year+1:year;cells+=`<button type="button" class="calendar-day outside" data-date="${isoFromParts(ny,nm,i)}" disabled>${i}</button>`;}
  cal.innerHTML=`<div class="calendar-head"><button type="button" class="calendar-nav" data-cal-prev aria-label="Mes anterior">‹</button><strong>${esc(monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1))}</strong><button type="button" class="calendar-nav" data-cal-next aria-label="Mes siguiente">›</button></div><div class="calendar-weekdays"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="calendar-grid">${cells}</div><div class="calendar-legend"><span><i class="legend-dot confirmed"></i>Ocupada</span><span><i class="legend-dot pending"></i>Retenida</span></div>`;
  cal.querySelector('[data-cal-prev]')?.addEventListener('click',()=>{let m=month-1,y=year;if(m<1){m=12;y--;}state.month=m;state.year=y;renderBookingCalendar(state);});
  cal.querySelector('[data-cal-next]')?.addEventListener('click',()=>{let m=month+1,y=year;if(m>12){m=1;y++;}state.month=m;state.year=y;renderBookingCalendar(state);});
  cal.querySelectorAll('.calendar-day:not(.outside):not([disabled])').forEach(btn=>btn.addEventListener('click',()=>selectCalendarDate(btn.dataset.date,state)));
}
function openBookingCalendar(target,state){
  state.activeTarget=target;const iso=parseUserDate(document.querySelector(`#${target}`)?.value)||state.start||state.minDate||localISODate();const p=dateToParts(iso);state.year=p.y;state.month=p.m;state.open=true;const cal=document.querySelector('#bookingCalendar');if(cal){cal.hidden=false;document.querySelector(`#${target}`)?.setAttribute('aria-expanded','true');renderBookingCalendar(state);}}
function closeBookingCalendar(){const cal=document.querySelector('#bookingCalendar');if(cal)cal.hidden=true;document.querySelectorAll('.booking-date-input').forEach(el=>el.setAttribute('aria-expanded','false'));}
function setBookingInput(id,iso){const el=document.querySelector(`#${id}`);if(el){el.value=displayDate(iso);el.dataset.iso=iso;el.classList.remove('date-unavailable','date-invalid');}}
function validateManualDate(id,state){const el=document.querySelector(`#${id}`);if(!el)return '';const iso=parseUserDate(el.value);el.classList.remove('date-unavailable','date-invalid');if(!iso){if(el.value.trim())el.classList.add('date-invalid');return '';}
  if((state.minDate&&iso<state.minDate)||(state.maxDate&&iso>state.maxDate)){el.classList.add('date-unavailable');return iso;}
  if(state.unavailable.has(iso)){el.classList.add('date-unavailable');return iso;}
  el.dataset.iso=iso;el.value=displayDate(iso);return iso;
}
function selectCalendarDate(iso,state){
  if(state.unavailable.has(iso)||(state.minDate&&iso<state.minDate)||(state.maxDate&&iso>state.maxDate))return;
  if(state.activeTarget==='startDate'){
    state.start=iso;setBookingInput('startDate',iso);
    if(!state.end||state.end<iso||state.endWasAuto){state.end=iso;state.endWasAuto=true;setBookingInput('endDate',iso);}
    else if(rangeHasUnavailable(iso,state.end,state.unavailable)){state.end=iso;state.endWasAuto=true;setBookingInput('endDate',iso);}
  }else{
    if(!state.start||iso<state.start){state.start=iso;setBookingInput('startDate',iso);state.end=iso;state.endWasAuto=true;setBookingInput('endDate',iso);}
    else if(rangeHasUnavailable(state.start,iso,state.unavailable)){state.end=iso;setBookingInput('endDate',iso);}
    else{state.end=iso;state.endWasAuto=false;setBookingInput('endDate',iso);}
  }
  updatePriceBox(state.space);renderBookingCalendar(state);closeBookingCalendar();
}

async function initBooking(s){
  const btn=document.querySelector('#reserveBtn'),msg=document.querySelector('#message'),startEl=document.querySelector('#startDate'),endEl=document.querySelector('#endDate'),cleanEl=document.querySelector('#cleaning');if(!btn)return;
  const today=localISODate(),minDate=s.activeFrom&&s.activeFrom>today?s.activeFrom:today,maxDate=s.activeUntil||'';
  const unavailable=await getUnavailableDates(s.id);
  const state={space:s,minDate,maxDate,unavailable,start:'',end:'',endWasAuto:true,activeTarget:'startDate',year:new Date().getFullYear(),month:new Date().getMonth()+1};
  const initial=minDate;state.start=initial;state.end=initial;setBookingInput('startDate',initial);setBookingInput('endDate',initial);updatePriceBox(s);
  document.querySelectorAll('.date-picker-toggle').forEach(toggle=>toggle.addEventListener('click',()=>openBookingCalendar(toggle.dataset.dateTarget,state)));
  document.querySelectorAll('.booking-date-input').forEach(el=>{
    el.addEventListener('focus',()=>openBookingCalendar(el.id,state));
    el.addEventListener('input',()=>{el.classList.remove('date-unavailable','date-invalid');});
    el.addEventListener('blur',()=>{
      const iso=validateManualDate(el.id,state);
      if(!iso){updatePriceBox(s);return;}
      if(el.id==='startDate'){
        state.start=iso;
        if(state.endWasAuto||!state.end||state.end<iso||rangeHasUnavailable(iso,state.end,state.unavailable)){state.end=iso;state.endWasAuto=true;setBookingInput('endDate',iso);}
      }else{
        state.end=iso;state.endWasAuto=false;
        if(state.start&&iso<state.start)el.classList.add('date-invalid');
      }
      updatePriceBox(s);
    });
  });
  document.addEventListener('click',e=>{const cal=document.querySelector('#bookingCalendar');if(!cal||cal.hidden)return;if(!cal.contains(e.target)&&!e.target.closest('.date-picker-wrap'))closeBookingCalendar();},{once:false});
  cleanEl?.addEventListener('change',()=>updatePriceBox(s));
  btn.addEventListener('click',async()=>{
    const start=parseUserDate(startEl.value),end=parseUserDate(endEl.value),name=document.querySelector('#customerName').value.trim(),email=document.querySelector('#customerEmail').value.trim(),phone=document.querySelector('#customerPhone').value.trim(),cleaning=!!cleanEl?.checked;
    startEl.classList.remove('date-unavailable','date-invalid');endEl.classList.remove('date-unavailable','date-invalid');
    if(!start||!end){msg.textContent='Introduce unas fechas válidas.';return;}
    if((state.minDate&&start<state.minDate)||(state.maxDate&&end>state.maxDate)||state.unavailable.has(start)||state.unavailable.has(end)||end<start||rangeHasUnavailable(start,end,state.unavailable)){startEl.classList.toggle('date-unavailable',!!state.unavailable.has(start));endEl.classList.toggle('date-unavailable',!!state.unavailable.has(end));msg.textContent='Alguna de las fechas seleccionadas no está disponible. Elige otras fechas.';return;}
    if(!name||!email||!phone){msg.textContent='Completa todos los datos para enviar la solicitud.';return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg.textContent='Introduce un email válido.';return;}
    if(!/^[0-9+() .-]{6,20}$/.test(phone)){msg.textContent='Introduce un teléfono válido.';return;}
    if(!s.id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s.id))){msg.textContent='No se ha podido identificar correctamente el espacio. Recarga la página e inténtalo de nuevo.';return;}
    const client=await getClient();if(!client){msg.textContent='No se ha podido conectar con el sistema de reservas. Recarga la página e inténtalo de nuevo.';return;}
    msg.textContent='Enviando solicitud…';btn.disabled=true;
    try{const {error}=await client.rpc('create_booking_request',{p_space_id:s.id,p_customer_name:name,p_customer_email:email,p_customer_phone:phone,p_start_date:start,p_end_date:end,p_cleaning_requested:cleaning});if(error)throw error;msg.textContent='Solicitud enviada correctamente. El propietario ha recibido la solicitud y contactará contigo para acordar las condiciones y confirmar la reserva.';btn.textContent='Solicitud enviada';}
    catch(e){console.error('Error creando solicitud:',e);msg.textContent=e.message||'No se ha podido enviar la solicitud.';btn.disabled=false;}
  });
}

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
 const {data:ownerId,error:ownerError}=await client.rpc('get_my_owner_id');
 if(ownerError){console.error('Error obteniendo propietario:',ownerError);document.querySelector('#ownerContent').innerHTML='<p class="message">No se ha podido identificar el perfil de propietario.</p>';return;}
 if(!ownerId){document.querySelector('#ownerContent').innerHTML='<p class="message">No se ha encontrado el perfil de propietario.</p>';return;}
 const {data:spaces,error}=await client.rpc('get_owner_spaces');
 if(error){console.error('Error cargando locales del propietario:',error);document.querySelector('#ownerContent').innerHTML='<p class="message">No se han podido cargar tus locales.</p>';return;}
 const active=spaces.filter(isActive),inactive=spaces.filter(s=>!isActive(s));
 document.querySelector('#ownerContent').innerHTML=`${renderOwnerGroup('Locales activos',active,true)}${renderOwnerGroup('Locales inactivos',inactive,false)}<section class="owner-bookings"><div class="section-head"><div><p class="eyebrow">RESERVAS</p><h2>Solicitudes de tus locales</h2></div></div><div id="ownerBookings"><p class="muted">Cargando solicitudes…</p></div></section>`;
 await renderOwnerBookings(client);
}

async function renderOwnerBookings(client){
 const box=document.querySelector('#ownerBookings');if(!box)return;
 const {data,error}=await client.rpc('get_owner_bookings');
 if(error){box.innerHTML='<p class="message">No se han podido cargar las solicitudes. Ejecuta la SQL de reservas del área privada.</p>';return;}
 const today=localISODate();
 const rows=(data||[]).sort((a,b)=>{const af=String(a.start_date||''),bf=String(b.start_date||'');const ap=af<today,bp=bf<today;if(ap!==bp)return ap?1:-1;return af.localeCompare(bf)||String(a.created_at||'').localeCompare(String(b.created_at||''));});
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
 const rental=Number(b.rental_total||0),cleaning=Number(b.cleaning_total||0),deposit=Number(b.deposit||0),grand=Number(b.grand_total||0);
 return `<article class="booking-item"><div class="booking-item-main"><div class="booking-item-head"><div><p class="eyebrow">${esc(b.space_name||'Espacio')}</p><h3>${esc(b.customer_name)}</h3></div><span class="status status-${esc(b.booking_status)}">${statusLabels[b.booking_status]||esc(b.booking_status)}</span></div><div class="booking-meta"><span><strong>Fechas</strong>${formatDateLong(b.start_date)} → ${formatDateLong(b.end_date)}</span><span><strong>Días</strong>${esc(b.total_days)}</span><span><strong>Teléfono</strong>${esc(b.customer_phone)}</span><span><strong>Email</strong>${esc(b.customer_email)}</span><span><strong>Limpieza</strong>${b.cleaning_requested?'Sí':'No'}</span></div><div class="booking-financials"><div><span>Alquiler</span><strong>${euro(rental)}</strong></div><div><span>Limpieza</span><strong>${euro(cleaning)}</strong></div><div><span>Fianza</span><strong>${euro(deposit)}</strong></div><div class="booking-financial-total"><span>Total</span><strong>${euro(grand)}</strong></div><p class="micro">Fianza incluida en el total.</p></div></div>${pending?`<div class="booking-actions"><button class="btn btn-dark" data-booking-action="confirm" data-id="${esc(b.id)}">Aceptar</button><button class="btn btn-light" data-booking-action="reject" data-id="${esc(b.id)}">Rechazar</button></div>`:''}</article>`;
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
 const spaces=spacesRes.data||[],owners=ownersRes.data||[],bookings=(bookingsRes.data||[]).sort((a,b)=>String(a.start_date||'').localeCompare(String(b.start_date||'')));
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
