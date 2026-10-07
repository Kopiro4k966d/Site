const EN={tb:'Before / after comparison',n1:'Features',n2:'Updates',n3:'Pricing',n4:'Reviews',dl:'Download',vn:'See what’s new',h1:'Rich colors in every game',tk:'100 · no change',lead:'Crysea changes saturation and contrast at the Windows level. Move the slider and see the result instantly.',c1:'Download for Windows',c2:'What Crysea does',fa:'Saturation to 300% and comparison. Just an account, no card.',fp0:'With a plan',fb:'Profiles, advanced controls, quick modules and more. From 199 ₽ a month.',win:'Free plan with no time limit. Windows 10 and 11.',ap:'The sliders work whatever you play.',t1:'Without Crysea',t2:'With Crysea',rng:'Enhancement strength',fh:'What Crysea does',fhp:'Six modules you never have to hunt for in menus.',f1t:'Saturation',f1d:'One slider from 0 to 300%. Brighter colors, shadow detail intact.',f2t:'Themes',f2d:'Five ready-made themes and your own accent color. The app looks the way you like.',f3t:'Profiles',f3d:'A separate look for every game. Switch in a second.',f4t:'Compare',f4d:'Before and after inside the app, no screenshots.',f5t:'Advanced controls',f5d:'Contrast, brightness and gamma in one section.',f6t:'Quick modules',f6d:'Frequent actions stay at hand, no nested menus.',uh:'What’s new',d1:'Sep 28, 2026',d2:'Sep 24, 2026',d3:'Sep 22, 2026',u1t:'New comparison module',u1d:'Original on the left, result on the right, live strength slider.',u2t:'Interface cleanup',u2d:'More space between sections, cards are easier to read.',u3t:'Phone support',u3d:'The page stacks neatly on small screens.',rh:'Reviews',ts:'Site review',td:'Discord vouch',rl1:'Left through an Crysea account.',rl2:'Posted in our Discord, word for word. Names cut to a letter.',pa:'Pause',pl:'Play',wr:'Leave a review',sb:'Send',nm:'Name',tx:'Your review',ph:'Free, Pro or Plus',pp:'Start free, pay when you need more.',p1d:'Basic optimization and comparison.',a1:'Saturation to 300%',a2:'5 app themes',a3:'Before / after view',b1:'Download Free',pb:'Most popular',mo:' / mo',mo2:' / mo',p2d:'The main plan with all the tools you need.',a4:'Everything in Free',a5:'Game profiles and custom crosshair',a6:'Rust toolkit',a7:'Custom optimization modules',b2:'Get Pro',p3d:'Full access to every feature.',a8:'Everything in Pro',a9:'Rust auto mode',a10:'Raid calculator',b3:'Get Plus',a11:'Rust servers, timers and diagnostics',a12:'Custom theme: any colors',lg:'Terms & Privacy',d0:'Oct 7, 2026',u0t:'Crysea: new name and more Rust',u0d:'Five themes, a custom theme with any colors, favorite Rust servers, timers, PC diagnostics and new optimization modules.',ftx:'Color tuning and system modules for Windows.'};
const $=s=>document.querySelector(s),els=[...document.querySelectorAll('[data-i]')];
els.forEach(e=>e.dataset.ru=e.innerHTML);
const PH={ru:{nm:'Имя',tx:'Ваш отзыв'},en:{nm:'Name',tx:'Your review'}};
let lang='ru';
const RUX={pl:'Играть',pa:'Пауза'};const T=k=>lang==='en'?EN[k]:RUX[k];
function setLang(){document.documentElement.lang=lang;els.forEach(e=>e.innerHTML=lang==='en'?EN[e.dataset.i]:e.dataset.ru);document.querySelectorAll('[data-ph]').forEach(e=>e.placeholder=PH[lang][e.dataset.ph]);$('#lang').textContent=lang==='ru'?'EN':'RU';$('#pz span').textContent=T($('#marq').classList.contains('paused')?'pl':'pa');renderRv()}
$('#lang').onclick=()=>{lang=lang==='ru'?'en':'ru';setLang()};
$('#menu').onclick=()=>$('#nav').classList.toggle('open');
document.querySelectorAll('#nav a').forEach(a=>a.onclick=()=>$('#nav').classList.remove('open'));

/* Демо-слайдер */
const scene=$('#scene'),clip=$('#clip'),line=$('#line');let drag=false;
function setPos(x){const r=scene.getBoundingClientRect(),p=Math.max(0,Math.min(100,(x-r.left)/r.width*100));clip.style.clipPath=`inset(0 ${100-p}% 0 0)`;line.style.left=p+'%'}
scene.addEventListener('pointerdown',e=>{drag=true;scene.setPointerCapture(e.pointerId);setPos(e.clientX)});
scene.addEventListener('pointermove',e=>drag&&setPos(e.clientX));
['pointerup','pointercancel'].forEach(t=>scene.addEventListener(t,()=>drag=false));
function setSat(v){v=+v;$('#rng').value=v;$('#v1').textContent=$('#v2').textContent=v+'%';$('#after').style.filter=`saturate(${v/230})`}
$('#rng').oninput=e=>setSat(e.target.value);setSat(230);

/* Отзывы. ВАЖНО: тексты ниже — примеры-заглушки, замените их настоящими отзывами. */
const SEED=[
{t:'d',x:'+rep трава наконец зелёная, а не серая',n:'a',d:'2026-09-18'},
{t:'s',x:'Работает как надо. Поставил и забыл.',n:'Aiden',d:'2026-09-17'},
{t:'d',x:'+rep лучший инструмент для цвета, что я пробовал',n:'d',d:'2026-09-16'},
{t:'d',x:'+rep в тёмных углах теперь всё видно, очень помогает на ночных картах',n:'m',d:'2026-09-16'},
{t:'s',x:'Взял Pro ради профилей: у каждой игры свой вид, переключаю одним кликом.',n:'Kira',d:'2026-09-15'},
{t:'d',x:'+rep простой интерфейс, ничего лишнего',n:'y',d:'2026-09-15'},
{t:'d',x:'+rep сравнение до/после прямо в программе — удобно подбирать значение',n:'w',d:'2026-09-14'}];
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TAG={ru:{s:'Отзыв с сайта',d:'Отзыв из Discord'},en:{s:'Site review',d:'Discord vouch'}};
let mine=[];try{mine=JSON.parse(localStorage.getItem('crysea_reviews')||'[]')}catch(e){}
function renderRv(){
  const fmt=d=>new Date(d).toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'short',year:'numeric'});
  const list=[...mine,...SEED];
  const h=list.map(r=>`<article class="rv"><span class="tag"><svg class="ic"><use href="#${r.t==='s'?'i-user':'i-chat'}"/></svg>${TAG[lang][r.t]}</span><p>${esc(r.x)}</p><footer><b>${esc(r.n)}</b>${fmt(r.d)}</footer></article>`).join('');
  mq.n=list.length;mq.html=h;
  track.innerHTML=h+h;mqMeasure();
}
/* Бегущая лента отзывов. Движется через requestAnimationFrame, поэтому не зависит от CSS-анимаций,
   настройки «уменьшить движение» в системе и «залипающего» :hover на телефонах.
   Пауза: кнопка, курсор мыши над лентой, перетаскивание. Лента тянется мышью и пальцем. */
const marq=$('#marq'),track=$('#track');
const mq={x:0,period:1,n:0,html:'',paused:false,hover:false,drag:false,last:0,sx:0,sm:0,speed:45};
function mqMeasure(){
  if(!mq.n||!track.children.length)return;
  const c=track.children;
  if(c.length>mq.n)mq.period=c[mq.n].offsetLeft-c[0].offsetLeft||mq.period;
  /* копий должно хватать на ширину экрана плюс один период, иначе на широких мониторах появится пустота */
  const need=Math.max(2,Math.ceil(marq.clientWidth/mq.period)+1);
  if(c.length!==mq.n*need){track.innerHTML=mq.html.repeat(need)}
}
function mqTick(t){
  const dt=Math.min(64,t-(mq.last||t));mq.last=t;
  if(mq.period>1&&!mq.paused&&!mq.hover&&!mq.drag&&!document.hidden)mq.x-=mq.speed*dt/1000;
  if(mq.period>1){mq.x=((mq.x%mq.period)-mq.period)%mq.period;track.style.transform=`translate3d(${mq.x}px,0,0)`}
  requestAnimationFrame(mqTick);
}
marq.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')mq.hover=true});
marq.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')mq.hover=false});
marq.addEventListener('pointerdown',e=>{mq.drag=true;mq.sx=e.clientX;mq.sm=mq.x;marq.setPointerCapture(e.pointerId);marq.classList.add('grab')});
marq.addEventListener('pointermove',e=>{if(mq.drag)mq.x=mq.sm+(e.clientX-mq.sx)});
['pointerup','pointercancel'].forEach(t=>marq.addEventListener(t,()=>{mq.drag=false;marq.classList.remove('grab')}));
addEventListener('resize',()=>{if(mq.n){track.innerHTML=mq.html+mq.html;mqMeasure()}});
requestAnimationFrame(mqTick);
$('#pz').onclick=()=>{mq.paused=!mq.paused;marq.classList.toggle('paused',mq.paused);$('#pz').innerHTML=`<svg class="ic" style="width:16px;height:16px"><use href="#${mq.paused?'i-play':'i-pause'}"/></svg><span>${T(mq.paused?'pl':'pa')}</span>`};
$('#ob').onclick=()=>$('#rf').classList.toggle('open');
$('#rf').onsubmit=e=>{e.preventDefault();mine.unshift({t:'s',x:$('#rt').value.trim(),n:$('#rn').value.trim(),d:new Date().toISOString().slice(0,10)});mine=mine.slice(0,20);try{localStorage.setItem('crysea_reviews',JSON.stringify(mine))}catch(_){}renderRv();e.target.reset();e.target.classList.remove('open')};
renderRv();
