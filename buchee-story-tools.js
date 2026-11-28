/* Story annotations share the same normalized canvas in the camera and viewer. */
(()=>{
 'use strict';
 const demo=window.BucheeDemoConfig?.enabled??(new URLSearchParams(location.search).get('demo')==='1');
 const colors=['#ffffff','#f9cc5d','#ef669c','#8bded2','#17191d'];
 const emojis=demo?['😂','😮','😍','😢','👏','🔥','🎉','💯']:['❤️','😍','🐾','😂','👏'];
 const maxStrokes=32,maxPoints=640;
 const layoutKey='buchee_demo_story_layout_v1';
 function layoutFor(story){try{return JSON.parse(localStorage.getItem(layoutKey)||'{}')[JSON.stringify([story.story_text||'',story.story_link_url||'',story.story_link_label||'',story.question_prompt||'',story.poll_question||''])]||{}}catch{return {}}}
 function place(el,p){if(!p)return;if(p.scale)el.style.setProperty('scale',String(p.scale));Object.assign(el.style,{left:p.x+'%',top:p.y+'%',right:'auto',transform:'translate(-50%,-50%) rotate('+(Number(p.rotation)||0)+'deg)',width:'max-content',maxWidth:'84%'})}
 function draggable(el,stage,p){
 el.style.pointerEvents='auto';el.style.touchAction='none';el.style.cursor='grab';place(el,p);
 const points=new Map();let start=null,frame=0;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const reset=()=>{const q=[...points.values()];start=q.length?{x:p.x,y:p.y,scale:p.scale||1,rotation:p.rotation||0,cx:q.reduce((n,v)=>n+v.x,0)/q.length,cy:q.reduce((n,v)=>n+v.y,0)/q.length,d:q.length===2?Math.hypot(q[1].x-q[0].x,q[1].y-q[0].y):0,angle:q.length===2?Math.atan2(q[1].y-q[0].y,q[1].x-q[0].x):0}:null};
 el.addEventListener('pointerdown',e=>{if(e.button!==0||points.size>=2)return;e.preventDefault();e.stopPropagation();points.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);reset()});
 el.addEventListener('pointermove',e=>{if(!points.has(e.pointerId)||!start)return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});const q=[...points.values()],r=stage.getBoundingClientRect();if(!r.width||!r.height)return;const cx=q.reduce((n,v)=>n+v.x,0)/q.length,cy=q.reduce((n,v)=>n+v.y,0)/q.length;p.x=clamp(start.x+(cx-start.cx)/r.width*100,12,88);p.y=clamp(start.y+(cy-start.cy)/r.height*100,8,92);if(q.length===2&&start.d>0){p.scale=clamp(start.scale*Math.hypot(q[1].x-q[0].x,q[1].y-q[0].y)/start.d,.6,1.6);p.rotation=start.rotation+(Math.atan2(q[1].y-q[0].y,q[1].x-q[0].x)-start.angle)*180/Math.PI}if(!frame)frame=requestAnimationFrame(()=>{frame=0;place(el,p)})});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,e=>{if(points.delete(e.pointerId))reset()});
 }


 const getLink=value=>{
  try{
   const url=new URL(value);
   return /^https?:$/.test(url.protocol)&&!url.username&&!url.password&&url.href.length<=1000?url.href:'';
  }catch{return ''}
 };
 function canvasFor(parent){
  const c=document.createElement('canvas');
  c.className='buchee-story-ink';c.width=360;c.height=640;
  parent.append(c);return c;
 }
 function paint(canvas,strokes){
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!Array.isArray(strokes))return;
  ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
  let remaining=maxPoints;
  for(const entry of strokes.slice(0,maxStrokes)){
   if(!colors.includes(entry?.color)||!Array.isArray(entry.points))continue;
   const points=entry.points.slice(0,remaining).filter(p=>Array.isArray(p)&&
    p.length===2&&p.every(value=>typeof value==='number'&&value>=0&&value<=1));
   remaining-=points.length;
   if(!points.length)continue;
   const [x,y]=points[0];
   ctx.strokeStyle=ctx.fillStyle=entry.color;ctx.beginPath();
   if(points.length===1){ctx.arc(x*360,y*640,2.5,0,2*Math.PI);ctx.fill();continue}
   ctx.moveTo(x*360,y*640);
   for(const [px,py] of points.slice(1))ctx.lineTo(px*360,py*640);
   ctx.stroke();
  }
 }
 function mount(root,privacy){
  const stage=root.querySelector('.pati-system-preview-wrap');
  const panel=root.querySelector('.pati-system-edit-panel');
  const canvas=canvasFor(stage),text=document.createElement('span');
  text.className='buchee-story-overlay-text';text.hidden=true;stage.append(text);
  const tools=document.createElement('section');
  tools.className='buchee-story-editor';tools.setAttribute('aria-label','Hikâye araçları');
  tools.innerHTML='<div class="buchee-story-toolbar" role="group" aria-label="Hikâyeye ekle">'+
   [['text','Metin'],['draw','Çizim'],['link','Bağlantı'],['question','Soru'],['poll','Anket']].map(([key,label])=>
    '<button type="button" data-story-tool="'+key+'" aria-pressed="false">'+label+'</button>').join('')+
   '</div><div data-story-fields="text" hidden><label>Hikâye metni<textarea name="story_overlay" maxlength="160" rows="2" placeholder="Bir şey yaz…"></textarea></label></div>'+
   '<div data-story-fields="draw" hidden><div class="buchee-story-palette" role="group" aria-label="Çizim rengi">'+colors.map((color,index)=>
    '<button type="button" data-ink="'+color+'" style="--ink:'+color+'" aria-label="'+['Beyaz','Sarı','Pembe','Turkuaz','Siyah'][index]+'" aria-pressed="'+(index===0)+'"></button>').join('')+
   '<button type="button" data-story-undo>Geri al</button><button type="button" data-story-clear>Temizle</button></div><small>Çizmek için fotoğrafın veya videonun üzerine dokun.</small></div>'+
   '<div data-story-fields="link" hidden><label>Bağlantı adresi<input type="url" name="story_link" maxlength="1000" placeholder="https://"></label><label>Düğme metni<input name="story_link_label" maxlength="36" placeholder="Bağlantıyı aç"></label></div>'+
   '<div data-story-fields="question" hidden><label>Soru kutusu<input name="story_question" maxlength="120" placeholder="Bana bir soru sor…"></label></div>'+
   '<div data-story-fields="poll" hidden><label>Anket sorusu<input name="story_poll" maxlength="120" placeholder="Hangisini seçersin?"></label><label>Birinci seçenek<input name="story_option_a" maxlength="60"></label><label>İkinci seçenek<input name="story_option_b" maxlength="60"></label></div>'+
   '<button class="buchee-story-hide-entry" type="button" data-story-privacy>Hikâyeyi belirli kişilerden gizle</button>';
  panel.prepend(tools);
  const layout={text:{x:50,y:33},link:{x:50,y:57},question:{x:50,y:65},poll:{x:50,y:72}};
  const previews={};
  if(demo){
   stage.style.position='relative';
   draggable(text,stage,layout.text);
   for(const key of ['link','question','poll']){const el=document.createElement('span');el.className='buchee-story-overlay-text';el.hidden=true;stage.append(el);previews[key]=el;draggable(el,stage,layout[key]);}
   const hint=document.createElement('small');hint.textContent='Öğeleri ön izlemede sürükleyerek konumlandır.';tools.prepend(hint);
   const controls=document.createElement('div');controls.innerHTML='<label>Yazı boyutu<input type="range" min="12" max="32" value="17" name="demo_size"></label><label>Yazı rengi<input type="color" value="#ffffff" name="demo_color"></label>';
   tools.querySelector('[data-story-fields="text"]').append(controls);
   const font=document.createElement('select');font.name='demo_font';for(const [value,label] of [['system-ui','Modern'],['Georgia','Klasik'],['monospace','Daktilo']]){const o=document.createElement('option');o.value=value;o.textContent=label;font.append(o)}controls.append(font);
   const draft=document.createElement('button');draft.type='button';draft.textContent='Metin taslağını kaydet';controls.append(draft);
   draft.onclick=()=>{try{localStorage.setItem('buchee_story_text_draft',tools.querySelector('[name="story_overlay"]').value);draft.textContent='Taslak kaydedildi'}catch{draft.textContent='Taslak kaydedilemedi'}};
   const restore=document.createElement('button');restore.type='button';restore.textContent='Taslağı getir';controls.append(restore);restore.onclick=()=>{try{const v=localStorage.getItem('buchee_story_text_draft');if(v!==null){const t=tools.querySelector('[name="story_overlay"]');t.value=v;t.dispatchEvent(new Event('input',{bubbles:true}))}}catch{}};
   for(const key of ['text','link','question','poll']){
    const label=document.createElement('label');label.textContent='Öğe boyutu';
    const range=document.createElement('input');range.type='range';range.min='60';range.max='160';range.value='100';range.step='5';
    range.addEventListener('input',()=>{layout[key].scale=Number(range.value)/100;place(key==='text'?text:previews[key],layout[key])});
    label.append(range);tools.querySelector('[data-story-fields="'+key+'"]').append(label);
   }
  }
  const strokes=[];
  let active='',interactive='',ink=colors[0],pointer=null;
  const field=name=>tools.querySelector('[name="'+name+'"]').value.trim();
  function setTool(next){
   active=active===next?'':next;
   for(const box of tools.querySelectorAll('[data-story-fields]'))box.hidden=box.dataset.storyFields!==active;
   for(const button of tools.querySelectorAll('[data-story-tool]'))button.setAttribute('aria-pressed',String(button.dataset.storyTool===active));
   canvas.classList.toggle('is-drawing',active==='draw');
   if(active==='poll'||active==='question')interactive=active;
   if(active!=='draw')tools.querySelector('[data-story-fields]:not([hidden]) :is(input,textarea)')?.focus({preventScroll:true});
  }
  tools.addEventListener('click',event=>{
   const button=event.target.closest('button');
   if(!button)return;
   if(button.dataset.storyTool){setTool(button.dataset.storyTool);return}
   if(button.dataset.ink){
    ink=button.dataset.ink;
    tools.querySelectorAll('[data-ink]').forEach(c=>c.setAttribute('aria-pressed',String(c===button)));
   }
   if(button.hasAttribute('data-story-undo'))strokes.pop();
   if(button.hasAttribute('data-story-clear'))strokes.length=0;
   if(button.hasAttribute('data-story-privacy'))void privacy();
   paint(canvas,strokes);
  });
  tools.addEventListener('input',()=>{
   text.textContent=field('story_overlay');
   text.hidden=!text.textContent;
   if(demo){
    layout.text.size=Number(field('demo_size'));layout.text.color=field('demo_color');
    text.style.setProperty('font-size',layout.text.size+'px','important');text.style.color=layout.text.color;layout.text.font=field('demo_font');text.style.fontFamily=layout.text.font;
    const values={link:field('story_link')?(field('story_link_label')||'Bağlantıyı aç'):'',question:field('story_question'),poll:field('story_poll')};
    for(const key of Object.keys(previews)){previews[key].textContent=values[key];previews[key].hidden=!values[key];}
   }
  });
  const point=e=>{
   const r=canvas.getBoundingClientRect();
   const norm=(value,start,size)=>Math.round(Math.max(0,Math.min(1,(value-start)/Math.max(1,size)))*1000)/1000;
   return [norm(e.clientX,r.left,r.width),norm(e.clientY,r.top,r.height)];
  };
  canvas.addEventListener('pointerdown',event=>{
   if(active!=='draw'||event.button!==0||pointer!==null||strokes.length>=maxStrokes||
    strokes.reduce((n,s)=>n+s.points.length,0)>=maxPoints)return;
   pointer=event.pointerId;canvas.setPointerCapture(pointer);
   strokes.push({color:ink,points:[point(event)]});
   paint(canvas,strokes);
  });
  canvas.addEventListener('pointermove',event=>{
   if(pointer!==event.pointerId||strokes.reduce((n,s)=>n+s.points.length,0)>=maxPoints)return;
   strokes.at(-1)?.points.push(point(event));paint(canvas,strokes);
  });
  const end=event=>{if(pointer===event.pointerId)pointer=null};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
  return ()=>{
   const raw=field('story_link'),link=getLink(raw);
   if(raw&&!link)throw Error('Bağlantı için geçerli bir http:// veya https:// adresi gir.');
   const question=interactive==='question'?field('story_question'):'';
   const poll=interactive==='poll'?field('story_poll'):'';
   const options=[field('story_option_a'),field('story_option_b')];
   if(interactive==='poll'&&(poll||options.some(Boolean))&&(!poll||options.some(o=>!o)||options[0].toLocaleLowerCase('tr')===options[1].toLocaleLowerCase('tr')))
    throw Error('Anket sorusunu ve birbirinden farklı iki seçeneği doldur.');
   if(demo){try{const key=JSON.stringify([field('story_overlay'),link,link?(field('story_link_label')||'Bağlantıyı aç'):'',question,poll]);const saved=JSON.parse(localStorage.getItem(layoutKey)||'{}');saved[key]=layout;localStorage.setItem(layoutKey,JSON.stringify(Object.fromEntries(Object.entries(saved).slice(-100))))}catch{}}
   return {
    story_text:field('story_overlay')||null,story_link_url:link||null,
    story_link_label:link?(field('story_link_label')||'Bağlantıyı aç'):null,
    story_drawing:strokes.length?strokes:null,question_prompt:question||null,
    poll_question:poll||null,poll_options:poll?options:null
   };
  };
 }
 function dialog(title){
  const view=document.createElement('dialog');
  view.className='buchee-story-dialog';
  view.setAttribute('aria-label',title);
  const head=document.createElement('header'),heading=document.createElement('h2'),close=document.createElement('button');
  heading.textContent=title;close.type='button';close.textContent='Kapat';
  close.addEventListener('click',()=>view.close());
  head.append(heading,close);view.append(head);
  view.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation()});
  view.addEventListener('close',()=>view.remove(),{once:true});
  document.body.append(view);view.showModal();return view;
 }
 function mountStory(root,story,{active,own,pause,resume,interact,reply}){
  const player=root.querySelector('.story-player');
  if(!player)return;
  const layout=demo?layoutFor(story):{};
  if(story.story_drawing)paint(canvasFor(player),story.story_drawing);
  if(story.story_text){
   const text=document.createElement('p');text.className='buchee-story-overlay-text';text.textContent=story.story_text;player.append(text);if(demo&&layout.text){place(text,layout.text);if(layout.text.size)text.style.setProperty('font-size',layout.text.size+'px','important');if(layout.text.color)text.style.color=layout.text.color;if(['system-ui','Georgia','monospace'].includes(layout.text.font))text.style.fontFamily=layout.text.font;}
  }
  const url=getLink(story.story_link_url);
  if(url||story.poll_question||story.question_prompt||active&&!own){
   const bar=document.createElement('div');bar.className='buchee-story-widgets';
   const add=(title,kind)=>{
    const b=document.createElement('button');b.type='button';b.textContent=title;
    b.addEventListener('click',()=>interact(kind));bar.append(b);
   };
   if(url){
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=story.story_link_label||'Bağlantıyı aç';bar.append(a);
   }
   if(story.question_prompt&&(active||own))add('Soru · '+story.question_prompt,'question');
   if(story.poll_question&&(active||own))add('Anket · '+story.poll_question,'poll');
   if(active&&!own&&!demo)add('Tepki','emoji');
   if(bar.childElementCount){player.append(bar);if(demo){for(const el of Array.from(bar.children)){const key=el.tagName==='A'?'link':el.textContent.startsWith('Soru')?'question':'poll';if(layout[key]){player.append(el);el.classList.add('buchee-story-overlay-text');el.style.pointerEvents='auto';place(el,layout[key]);}}}}
  }
  const like=player.querySelector('.pati-story-like');
  if(!active||own||!like)return;
  const form=document.createElement('form');
  form.className='buchee-story-reply';
  form.innerHTML='<input type="text" name="reply" maxlength="1000" autocomplete="off" placeholder="'+(demo?'Bir şeyler yaz...':'Mesaj gönder…')+'" aria-label="Hikâyeye mesaj gönder"><button type="submit" class="buchee-story-send" aria-label="Yanıtı gönder" hidden>Gönder</button><span class="buchee-story-like-slot"></span>';
  like.replaceWith(form);form.querySelector('span').append(like);
  if(demo){
   Object.assign(form.style,{position:'absolute',bottom:'max(12px,env(safe-area-inset-bottom))',left:'12px',right:'12px',display:'flex',alignItems:'center',gap:'8px',zIndex:'10020',width:'auto',transform:'none'});
   Object.assign(form.elements.reply.style,{flex:'1',minWidth:'0',width:'auto',border:'1px solid #777',borderRadius:'24px',padding:'12px',background:'#111',color:'#fff'});
   const slot=form.querySelector('span');
   slot.style.cssText='position:static!important;display:flex;align-items:center;flex:0 0 48px;width:48px;height:48px';
   like.style.cssText='position:static!important;inset:auto!important;transform:none!important;margin:0!important;width:48px!important;height:48px!important;flex:none';
   form.elements.reply.style.boxSizing='border-box';
   
   const quick=document.createElement('section');
   quick.hidden=true;quick.style.cssText='position:absolute;bottom:100%;left:0;right:0;background:#080808b8;color:white;padding:18px 12px 22px;border-radius:16px;z-index:10021;text-align:center';
   const heading=document.createElement('strong');heading.textContent='Hızlı İfadeler';heading.style.fontSize='22px';quick.append(heading);
   const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px';
   for(const emoji of emojis){const b=document.createElement('button');b.type='button';b.textContent=emoji;b.style.cssText='background:transparent;border:0;font-size:34px;min-height:48px;cursor:pointer';b.addEventListener('pointerdown',e=>e.preventDefault());b.onclick=()=>{if(form.querySelector('[type=submit]').disabled)return;form.elements.reply.value=emoji;quick.hidden=true;form.requestSubmit()};grid.append(b)}
   quick.append(grid);form.append(quick);
   form.elements.reply.addEventListener('focus',()=>{quick.hidden=!!form.elements.reply.value.trim()});
   form.elements.reply.addEventListener('click',()=>{quick.hidden=!!form.elements.reply.value.trim()});
   form.elements.reply.addEventListener('input',()=>{quick.hidden=!!form.elements.reply.value.trim()});
   form.elements.reply.addEventListener('blur',()=>{quick.hidden=true});
   form.addEventListener('pointerdown',e=>e.stopPropagation());
   form.addEventListener('click',e=>e.stopPropagation());
  }
  const input=form.elements.reply,send=form.querySelector('button[type="submit"]');
  input.addEventListener('input',()=>{send.hidden=!input.value.trim()});
  input.addEventListener('focus',()=>{pause();root.classList.add('buchee-story-typing')});
  input.addEventListener('blur',()=>{root.classList.remove('buchee-story-typing');if(!send.disabled)resume()});
  form.addEventListener('submit',async event=>{
   event.preventDefault();event.stopPropagation();
   const value=input.value.trim();
   if(!value||send.disabled)return;
   send.disabled=true;pause();
   const feedback=document.createElement('small');
   feedback.className='buchee-story-reply-success';feedback.setAttribute('role','status');
   try{await reply(value);input.value='';send.hidden=true;input.blur();feedback.textContent='Hikâyeye yanıt gönderildi.'}
   catch(error){send.hidden=false;feedback.textContent=error.message||'Mesaj gönderilemedi.'}
   finally{
    send.disabled=false;
    if(form.isConnected){form.querySelector('small')?.remove();form.append(feedback);setTimeout(()=>{feedback.remove();if(form.isConnected&&document.activeElement!==input)resume()},2200)}
   }
  });
 }
 window.BucheeStoryTools={mount,mountStory,dialog,emojis};
})();
