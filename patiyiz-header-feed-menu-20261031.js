/* Mobile-first Patiyiz feed selector. The mobile trigger and menu live in index.html. */
(() => {
  'use strict';
  const STORAGE_KEY='patiyiz-home-feed-mode';
  const choices=[
    {mode:'media',title:'Gönderiler ve Reels',subtitle:'Fotoğraf, video ve Reels',short:'Gönderiler',icon:'i-image'},
    {mode:'text',title:'Tweet ve Sorular',subtitle:'Yazılı paylaşımlar ve soru-cevaplar',short:'Tweet ve Sorular',icon:'i-message'}
  ];
  let activeMode='media';
  try { if(localStorage.getItem(STORAGE_KEY)==='text') activeMode='text'; } catch (_) {}
  const installed=[];

  function makeMenu(brand,kind){
    if(!brand)return;
    const isMobile=kind==='mobile';
    const triggerId=isMobile?'pati-feed-menu-trigger':'pati-feed-desktop-trigger';
    const menuId=isMobile?'pati-feed-menu':'pati-feed-desktop-menu';
    let trigger=document.getElementById(triggerId);
    if(!trigger){
      // Defensive fallback for old HTML builds; new mobile HTML has this button already.
      trigger=document.createElement('button');
      trigger.type='button';
      trigger.id=triggerId;
      trigger.className=brand.className+' pati-feed-brand-selector';
      while(brand.firstChild)trigger.appendChild(brand.firstChild);
      brand.replaceWith(trigger);
    }
    trigger.setAttribute('aria-haspopup','menu');
    trigger.setAttribute('aria-controls',menuId);
    trigger.setAttribute('aria-expanded','false');
    trigger.title='Akış türünü seç';
    let menu=document.getElementById(menuId);
    if(!menu){
      menu=document.createElement('div');
      menu.id=menuId;
      menu.className='pati-feed-menu pati-feed-category-menu';
      menu.setAttribute('role','menu');
      menu.setAttribute('aria-label','Akış türü');
      menu.hidden=true;
      if(isMobile)trigger.closest('.mobile-header')?.appendChild(menu);
      else document.body.appendChild(menu);
    }
    if(!menu.querySelector('[data-pati-feed-choice]')){
      menu.innerHTML=choices.map(choice=>'<button type="button" role="menuitemradio" data-pati-feed-choice="'+choice.mode+
        '" aria-checked="false"><svg class="icon" aria-hidden="true"><use href="#'+choice.icon+
        '"></use></svg><span class="pati-feed-menu-label"><strong>'+choice.title+
        '</strong><small>'+choice.subtitle+'</small></span><span class="pati-feed-selected" aria-hidden="true">✓</span></button>').join('');
    }

    function close(){menu.hidden=true;trigger.setAttribute('aria-expanded','false');}
    function sync(){
      for(const button of menu.querySelectorAll('[data-pati-feed-choice]')){
        button.setAttribute('aria-checked',String(button.dataset.patiFeedChoice===activeMode));
      }
      const current=choices.find(choice=>choice.mode===activeMode)||choices[0];
      const status=trigger.querySelector('.pati-feed-current');
      if(status)status.textContent=current.short;
      trigger.setAttribute('aria-label','Akışı değiştir. Geçerli: '+current.title);
    }
    function open(){
      for(const installedMenu of installed)installedMenu.close();
      if(!isMobile){
        const bounds=trigger.getBoundingClientRect();
        menu.style.left=Math.max(8,Math.min(bounds.right+12,innerWidth-300))+'px';
        menu.style.top=Math.max(8,Math.min(bounds.top,innerHeight-170))+'px';
      }
      sync();menu.hidden=false;trigger.setAttribute('aria-expanded','true');
    }
    trigger.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      if(menu.hidden)open();else close();
    });
    menu.addEventListener('click',event=>{
      const choice=event.target.closest('[data-pati-feed-choice]');
      if(!choice||!menu.contains(choice))return;
      event.preventDefault();event.stopPropagation();
      const mode=choice.dataset.patiFeedChoice;
      if(mode!=='text'&&mode!=='media')return;
      activeMode=mode;
      try{localStorage.setItem(STORAGE_KEY,mode);}catch(_){}
      for(const item of installed){item.sync();item.close();}
      window.dispatchEvent(new CustomEvent('patiyiz:feed-mode',{detail:{mode}}));
      trigger.focus();
    });
    menu.addEventListener('keydown',event=>{
      if(!['ArrowDown','ArrowUp'].includes(event.key))return;
      event.preventDefault();
      const items=[...menu.querySelectorAll('[data-pati-feed-choice]')];
      const at=items.indexOf(document.activeElement);
      items[(at+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
    });
    installed.push({trigger,menu,close,sync});
    sync();
  }

  function mount(){
    if(installed.length)return;
    makeMenu(document.querySelector('#app-root > .mobile-header > .brand'),'mobile');
    makeMenu(document.querySelector('#app-root .sidebar > .brand'),'desktop');
    document.addEventListener('click',event=>{
      for(const item of installed){
        if(!item.menu.hidden&&!item.trigger.contains(event.target)&&!item.menu.contains(event.target))item.close();
      }
    });
    document.addEventListener('keydown',event=>{
      if(event.key!=='Escape')return;
      for(const item of installed){
        if(!item.menu.hidden){item.close();item.trigger.focus();event.preventDefault();}
      }
    });
    window.addEventListener('resize',()=>{for(const item of installed)item.close();});
    window.addEventListener('patiyiz:feed-mode-changed',event=>{
      activeMode=event.detail?.mode==='text'?'text':'media';
      for(const item of installed)item.sync();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
