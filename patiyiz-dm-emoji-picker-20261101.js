/* Patiyiz: mobile-first full emoji picker and customizable six quick reactions. */
(() => {
 'use strict';
 const QUICK_KEY='patiyiz-dm-quick-reactions-v1';
 const RECENT_KEY='patiyiz-dm-emoji-recent-v1';
 const defaults=['❤️','😂','😮','😢','😡','👍'];
 const emojiRx=/\p{Emoji_Presentation}/u;
 const modifierRx=/\p{Emoji_Modifier_Base}/u;
 const words=(str)=>str.trim().split(/\s+/u).filter(Boolean);
 const emojiRange=(start,end)=>{const list=[];for(let cp=start;cp<=end;cp++){const s=String.fromCodePoint(cp);if(emojiRx.test(s))list.push(s);}return list;};
 const unique=(list)=>[...new Set(list.filter(Boolean))];
 const countryCodes=words('TR US GB DE FR IT ES PT GR NL BE AT CH SE NO DK FI IS IE PL CZ SK HU RO BG HR SI RS BA ME MK AL XK UA RU BY LT LV EE MD GE AM AZ CY MT LU LI MC SM VA AD GI IM JE GG CA MX BR AR CL PE CO EC VE UY PY BO CR CU DO GT HN NI PA SV JM HT BS BB TT BZ GY SR GF FK AU NZ FJ PG SB VU NC WS TO KI TV NR FM MH PW JP KR CN TW HK MO MN KP VN TH MY SG ID PH BN KH LA MM BD IN PK LK NP BT MV AF IR IQ IL PS JO LB SY TR SA AE QA KW BH OM YE EG MA DZ TN LY SD SS ET KE UG TZ RW BI SO DJ ER NG GH CI SN GM GN GW SL LR CM GA CG CD CF TD NE ML BF BJ TG CV MU SC MG MZ ZM ZW BW NA ZA LS SZ AO MW KM ST GQ ZA RE YT TD TL TM TJ KG KZ UZ PK NP MN ID SG KR KP JP TW HK LA BN MO BZ CU US CA DO PR VI VG KY BM AI AW CW SX BQ GD LC VC DM KN AG TT JM BB BS HT MQ GP BL MF PM GL FO AX SJ GI GG JE IM');
 const flags=unique(countryCodes.map(code=>code.length===2&&/^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(c=>0x1f1e6+c.charCodeAt(0)-65)):'')); 
 const sections=[
  {id:'faces',label:'Gülen Yüzler ve İnsanlar',icon:'😀',items:unique([...words('❤️ 😂 😮 😢 😡 👍 🥰 🥹 🙂 😊 ☺️ 🤩 🥳 🤗 🤔 😭 😎 💀'),...emojiRange(0x1f600,0x1f64f),...emojiRange(0x1f910,0x1f92f),...emojiRange(0x1f970,0x1f97f),...emojiRange(0x1fae0,0x1faef),...words('☹️ ☺️ ☠️ ☺ ❤️ ♥️')])},
  {id:'people',label:'İnsanlar ve Hareketler',icon:'🧑',items:unique([...emojiRange(0x1f440,0x1f487),...emojiRange(0x1f9b0,0x1f9df),...emojiRange(0x1faf0,0x1faff),...words('👨‍👩‍👧‍👦 👨‍👩‍👧 👩‍👩‍👦 👨‍👨‍👧 🧑‍💻 👨‍💻 👩‍💻 👩‍⚕️ 👨‍⚕️ 🧑‍⚕️ 👩‍🍳 👨‍🍳 👨‍🏫 👩‍🏫 👨‍🚒 👩‍🚒 👩‍🚀 👨‍🚀 👩‍🎨 👨‍🎨 👩‍🔧 👨‍🔧 👩‍❤️‍👩 👨‍❤️‍👨 🧑‍🤝‍🧑')])},
  {id:'animals',label:'Hayvanlar ve Doğa',icon:'🐱',items:unique([...emojiRange(0x1f400,0x1f43f),...emojiRange(0x1f980,0x1f9af),...emojiRange(0x1fab0,0x1fabf),...emojiRange(0x1f330,0x1f343),...words('🌷 🌹 🌺 🌸 🌼 🌻 🌱 🌲 🌳 🌴 🍀 ☘️ 🍁 🍂 🍃 🪷 🪻 🌈 ☀️ ☁️ ⛅ 🌧️ ❄️ ⛄ ⚡ 🔥 🌊 🌙 ⭐ ✨ 💫')])},
  {id:'food',label:'Yiyecekler ve İçecekler',icon:'🍔',items:unique([...emojiRange(0x1f345,0x1f37f),...emojiRange(0x1f950,0x1f96f),...emojiRange(0x1f9c0,0x1f9cf),...emojiRange(0x1fad0,0x1fadf),...words('☕ 🍵 🍽️ 🧂 🥤 🧋')])},
  {id:'activity',label:'Aktiviteler ve Spor',icon:'⚽',items:unique([...emojiRange(0x1f380,0x1f3ff),...words('⚽ ⚾ 🏀 🏈 🏐 🏉 🎾 🥎 🏓 🥊 🥋 🛹 🛼 ⛸️ 🏋️‍♀️ 🏋️‍♂️ 🧘‍♀️ 🧘‍♂️ 🎭 🎨 🎬 🎤 🎧 🎮 🎲 🧩 ♟️ 🎯 🎰')])},
  {id:'travel',label:'Seyahat ve Yerler',icon:'🚗',items:unique([...emojiRange(0x1f680,0x1f6ff),...words('🚗 🚕 🚙 🚌 🚎 🚑 🚒 🚓 🚐 🛻 🚚 🚛 🚜 🚲 🛵 🏍️ 🚂 🚆 🚇 🚄 ✈️ 🛩️ 🚀 🛸 🚁 ⛵ 🛥️ 🛳️ 🚢 ⚓ 🗺️ 🏝️ 🗽 🗼 🏰 🏯 ⛺ 🌋 🏔️ 🏖️ 🏙️ 🌆 🌇')])},
  {id:'objects',label:'Nesneler',icon:'💡',items:unique([...emojiRange(0x1f4a0,0x1f5ff),...emojiRange(0x1f6e0,0x1f6ff),...emojiRange(0x1fa70,0x1faaa),...words('⌚ ⏰ ⌛ ☎️ ⌨️ 🖥️ 🖨️ 🖱️ 📱 💻 🧭 💡 🔦 🕯️ 📷 📸 📹 📺 📻 🔋 🪫 🧲 🪛 🔧 🔨 ⚒️ 🛠️ 💊 🩹 🩺 🔑 🗝️ 🔒 🔓 🧸 🪄')])},
  {id:'symbols',label:'Semboller',icon:'❤️',items:unique([...words('❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⚛️ ☢️ ☣️ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⛎ ♻️ ✅ ✔️ ☑️ ❌ ❎ ⚠️ ⛔ 🚫 ‼️ ⁉️ ❓ ❔ ❗ ❕ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▶️ ⏸️ ⏯️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ ➕ ➖ ➗ ✖️ ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↔️ ↕️ ™️ ©️ ®️ #️⃣ *️⃣ 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟')])},
  {id:'flags',label:'Bayraklar',icon:'🇹🇷',items:unique([...words('🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇹🇷 🇪🇺 🇺🇳'),...flags])}
 ];
 const basePeople=sections.find(s=>s.id==='people');
 basePeople.items=unique([...basePeople.items,...basePeople.items.filter(e=>modifierRx.test(e)).flatMap(e=>[0x1f3fb,0x1f3fc,0x1f3fd,0x1f3fe,0x1f3ff].map(t=>e+String.fromCodePoint(t)))]);
 const all=new Set(sections.flatMap(s=>s.items));
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}catch(_){return fallback;}};
 let quick=read(QUICK_KEY,defaults);
 if(!Array.isArray(quick)||quick.length!==6||quick.some(e=>!all.has(e)))quick=defaults.slice();
 let recent=read(RECENT_KEY,[]);
 if(!Array.isArray(recent))recent=[];
 recent=recent.filter(e=>all.has(e)).slice(0,28);
 let active=null;
 const alias={kalp:'❤️',ask:'😍',aşk:'😍',sevgi:'🥰',gül:'😂',gulen:'😄',gülen:'😄',mutlu:'😊',agla:'😭',ağla:'😭',üzgün:'😢',kızgın:'😡',sasirma:'😮',şaşırma:'😮',alkis:'👏',alkış:'👏',begeni:'👍',beğeni:'👍',kedi:'🐱',köpek:'🐶',pati:'🐾',turkiye:'🇹🇷',türkiye:'🇹🇷',bayrak:'🇹🇷',gunes:'☀️',güneş:'☀️',yildiz:'⭐',yıldız:'⭐',ates:'🔥',ateş:'🔥',çiçek:'🌸',cicek:'🌸',kahve:'☕',pizza:'🍕',araba:'🚗',para:'💰',gülümse:'🙂'};
 const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(_){}}
 function getQuick(){return quick.slice();}
 function isEmoji(value){return typeof value==='string'&&all.has(value);}
 function remember(emoji){recent=[emoji,...recent.filter(x=>x!==emoji)].slice(0,28);save(RECENT_KEY,recent);}
 function close(){if(!active)return;const dlg=active.dialog;active=null;try{if(dlg.open)dlg.close();}catch(_){}dlg.remove();}
 function open(messageId,onChoose){
  close();
  if(!messageId||typeof onChoose!=='function')return;
  const dialog=document.createElement('dialog');
  dialog.className='pati-emoji-dialog';
  dialog.setAttribute('aria-label','Mesaj emojileri');
  dialog.innerHTML='<div class="pati-emoji-sheet">'+
   '<div class="pati-emoji-grip" aria-hidden="true"></div>'+
   '<div class="pati-emoji-search-wrap"><span aria-hidden="true">⌕</span><input type="search" class="pati-emoji-search" placeholder="Emoji ara" aria-label="Emoji ara" autocomplete="off"></div>'+
   '<div class="pati-emoji-heading"><strong>İfadelerin</strong><button class="pati-emoji-customize" type="button">Özelleştir</button></div>'+
   '<div class="pati-emoji-quick" aria-label="Altı hızlı emoji"></div>'+
   '<p class="pati-emoji-hint" hidden>Değiştirmek istediğin emojiyi seç, ardından aşağıdan yenisini seç.</p>'+
   '<div class="pati-emoji-list" tabindex="0"><section class="pati-emoji-recent-wrap"></section><section class="pati-emoji-main"><h3 class="pati-emoji-category-name"></h3><div class="pati-emoji-grid"></div></section></div>'+
   '<nav class="pati-emoji-tabs" aria-label="Emoji kategorileri"></nav></div>';
  document.body.appendChild(dialog);
  active={dialog,messageId,onChoose,category:'faces',customizing:false,slot:-1,search:''};
  const tabs=dialog.querySelector('.pati-emoji-tabs');
  tabs.innerHTML='<button type="button" class="pati-emoji-tab" data-cat="recent" aria-label="En Yeniler" title="En Yeniler">◷</button>'+
   sections.map(s=>'<button type="button" class="pati-emoji-tab" data-cat="'+s.id+'" aria-label="'+esc(s.label)+'" title="'+esc(s.label)+'">'+s.icon+'</button>').join('');
  function quickPaint(){
   dialog.querySelector('.pati-emoji-quick').innerHTML=quick.map((emoji,i)=>'<button type="button" data-slot="'+i+'" class="'+(active?.slot===i?'is-selected':'')+'" aria-label="'+(i+1)+'. emoji '+esc(emoji)+'">'+emoji+'</button>').join('');
   dialog.querySelector('.pati-emoji-hint').hidden=!active.customizing;
   const btn=dialog.querySelector('.pati-emoji-customize');
   btn.textContent=active.customizing?'Bitti':'Özelleştir';
   btn.setAttribute('aria-pressed',String(active.customizing));
  }
  function buttons(list){return list.map(emoji=>'<button type="button" class="pati-emoji-cell" data-emoji="'+esc(emoji)+'" aria-label="'+esc(emoji)+' emojisini seç">'+emoji+'</button>').join('');}
  function paint(){
   if(!active)return;
   const list=dialog.querySelector('.pati-emoji-list'),q=active.search.trim().toLocaleLowerCase('tr');
   const recentWrap=dialog.querySelector('.pati-emoji-recent-wrap'),title=dialog.querySelector('.pati-emoji-category-name'),grid=dialog.querySelector('.pati-emoji-grid');
   const matches=(emoji)=>!q||emoji.includes(q)||Object.entries(alias).some(([name,value])=>value===emoji&&name.includes(q));
   const content=q?unique([...sections.flatMap(s=>s.items)].filter(matches)):active.category==='recent'?recent:sections.find(s=>s.id===active.category)?.items||[];
   recentWrap.innerHTML=(!q&&active.category==='faces'&&recent.length)?'<h3>En Yeniler</h3><div class="pati-emoji-grid">'+buttons(recent.slice(0,21))+'</div>':'';
   title.textContent=q?'Arama sonuçları':active.category==='recent'?'En Yeniler':sections.find(s=>s.id===active.category)?.label||'Emojiler';
   grid.innerHTML=content.length?buttons(content):'<p class="pati-emoji-empty">Emoji bulunamadı.</p>';
   tabs.querySelectorAll('[data-cat]').forEach(btn=>{const selected=btn.dataset.cat===active.category;btn.classList.toggle('is-active',selected);btn.setAttribute('aria-current',selected?'true':'false');});
   list.scrollTop=0;
  }
  dialog.addEventListener('click',event=>{
   if(event.target===dialog){close();return;}
   const custom=event.target.closest('.pati-emoji-customize');
   if(custom){active.customizing=!active.customizing;active.slot=-1;quickPaint();return;}
   const slot=event.target.closest('[data-slot]');
   if(slot){const i=Number(slot.dataset.slot);if(active.customizing){active.slot=i;quickPaint();}else{const picked=quick[i];remember(picked);close();onChoose(picked);}return;}
   const cat=event.target.closest('[data-cat]');
   if(cat){active.category=cat.dataset.cat;active.search='';dialog.querySelector('.pati-emoji-search').value='';paint();return;}
   const emojiCell=event.target.closest('[data-emoji]');
   if(!emojiCell)return;
   const emoji=emojiCell.dataset.emoji;
   if(!isEmoji(emoji))return;
   if(active.customizing){
    if(active.slot<0){dialog.querySelector('.pati-emoji-hint').textContent='Önce yukarıdaki 6 emojiden değiştirmek istediğini seç.';return;}
    quick[active.slot]=emoji;save(QUICK_KEY,quick);active.slot=-1;quickPaint();
    dialog.querySelector('.pati-emoji-hint').textContent='Emoji değiştirildi. Başka bir emoji seçebilir veya Bitti’ye basabilirsin.';
   }else{remember(emoji);close();onChoose(emoji);}
  });
  dialog.querySelector('.pati-emoji-search').addEventListener('input',event=>{active.search=event.target.value;paint();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{if(active?.dialog===dialog)active=null;dialog.remove();},{once:true});
  quickPaint();paint();
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 }
 window.PatiDmEmojiPicker={open,getQuick,isEmoji};
})();
