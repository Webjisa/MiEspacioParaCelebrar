document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.querySelector('.site-header .nav');
  if(!nav)return;
  const mainNav=nav.querySelector('nav');
  if(!mainNav)return;
  if(nav.querySelector('.mobile-menu-toggle'))return;
  const btn=document.createElement('button');
  btn.className='mobile-menu-toggle';
  btn.type='button';
  btn.setAttribute('aria-label','Abrir menú');
  btn.setAttribute('aria-expanded','false');
  btn.innerHTML='<span></span><span></span><span></span>';
  nav.appendChild(btn);
  const close=()=>{mainNav.classList.remove('mobile-open');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','Abrir menú');};
  btn.addEventListener('click',()=>{
    const open=mainNav.classList.toggle('mobile-open');
    btn.setAttribute('aria-expanded',String(open));
    btn.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
  });
  mainNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('click',e=>{if(!nav.contains(e.target))close();});
});
