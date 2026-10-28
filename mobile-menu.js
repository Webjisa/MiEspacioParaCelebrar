document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.querySelector('.site-header .nav');
  if(!nav)return;
  const mainNav=nav.querySelector('nav');
  if(!mainNav)return;

  let btn=nav.querySelector('.mobile-menu-toggle');
  if(!btn){
    btn=document.createElement('button');
    btn.className='mobile-menu-toggle';
    btn.type='button';
    btn.setAttribute('aria-label','Abrir menú');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<span></span><span></span><span></span>';
    nav.appendChild(btn);
  }
  if(btn.dataset.bound==='1')return;

  const close=()=>{
    mainNav.classList.remove('mobile-open');
    btn.setAttribute('aria-expanded','false');
    btn.setAttribute('aria-label','Abrir menú');
  };
  btn.addEventListener('click',()=>{
    const open=!mainNav.classList.contains('mobile-open');
    mainNav.classList.toggle('mobile-open',open);
    btn.setAttribute('aria-expanded',String(open));
    btn.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
  });

  /* Captura el toque antes de otros manejadores de navegación. */
  mainNav.addEventListener('click',event=>{
    const link=event.target.closest('a');
    if(link)close();
  },true);
  document.addEventListener('click',event=>{
    if(!nav.contains(event.target))close();
  });
  window.addEventListener('pageshow',close);
  btn.dataset.bound='1';
});
