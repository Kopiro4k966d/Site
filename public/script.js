const EN={tb:'Before / after comparison',n1:'Features',n2:'Updates',n3:'Pricing',n4:'Reviews',dl:'Download',vn:'See what’s new',h1:'Rich colors in every game',tk:'100 · no change',lead:'Crysea changes saturation and contrast at the Windows level. Move the slider and see the result instantly.',c1:'Download for Windows',c2:'What Crysea does',fa:'Saturation to 300% and comparison. Just an account, no card.',fp0:'With a plan',fb:'Profiles, advanced controls, quick modules and more. From 199 ₽ a month.',win:'Free plan with no time limit. Windows 10 and 11.',ap:'The sliders work whatever you play.',t1:'Without Crysea',t2:'With Crysea',rng:'Enhancement strength',fh:'What Crysea does',fhp:'Six modules you never have to hunt for in menus.',f1t:'Saturation',f1d:'One slider from 0 to 300%. Brighter colors, shadow detail intact.',f2t:'Themes',f2d:'Three ready-made themes: dark, light and soft. The app looks the way you like.',f3t:'Profiles',f3d:'A separate look for every game. Switch in a second.',f4t:'Compare',f4d:'Before and after inside the app, no screenshots.',f5t:'Advanced controls',f5d:'Contrast and brightness in one section.',f6t:'Quick modules',f6d:'Frequent actions stay at hand, no nested menus.',uh:'What’s new',d1:'Sep 28, 2026',d2:'Sep 24, 2026',d3:'Sep 22, 2026',u1t:'New comparison module',u1d:'Original on the left, result on the right, live strength slider.',u2t:'Interface cleanup',u2d:'More space between sections, cards are easier to read.',u3t:'Phone support',u3d:'The page stacks neatly on small screens.',rh:'Reviews',ts:'Site review',td:'Discord vouch',rl1:'Left through an Crysea account.',rl2:'Posted in our Discord, word for word. Names cut to a letter.',pa:'Pause',pl:'Play',wr:'Leave a review',sb:'Send',nm:'Name',tx:'Your review',ph:'Free, Pro or Plus',pp:'Start free, pay when you need more.',p1d:'Basic optimization and comparison.',a1:'Saturation to 300%',a2:'3 app themes',a3:'Before / after view',b1:'Download Free',pb:'Most popular',mo:' / mo',mo2:' / mo',p2d:'The main plan with all the tools you need.',a4:'Everything in Free',a5:'Game profiles and custom crosshair',a6:'Rust toolkit',a7:'Custom optimization modules',b2:'Get Pro',p3d:'Full access to every feature.',a8:'Everything in Pro',a9:'Rust auto mode',a10:'Raid calculator',b3:'Get Plus',a11:'Rust wipe timer and launch options',a12:'Custom theme: any colors',lg:'Terms & Privacy',d0:'Oct 7, 2026',u0t:'Crysea: new name',u0d:'One account for the site and the app, Free, Pro and Plus plans, game profiles, crosshair and Rust tools: wipe timer, launch options and optimization modules.',ftx:'Color tuning and system modules for Windows.',n5:'FAQ',qh:'Frequently asked',q1:'Is it safe for games and anti-cheat?',q1a:'Crysea does not inject code into games or read their memory: colors are changed by Windows itself and the crosshair is a separate window on top of the game. We cannot guarantee how a particular anti-cheat treats overlays, so use the crosshair only where the game rules allow overlays.',q2:'What stays free?',q2a:'Saturation to 300%, three themes and before / after comparison. No card, no time limit.',q3:'Does the plan renew itself?',q3a:'No. You pay for a month, then the account returns to Free and your settings stay.',q4:'How do I get access after paying?',q4a:'Sign in inside the app with the same account as on the site. Your plan and game profiles sync on their own.',q5:'What about refunds?',q5a:'Refund terms are in the <a href="legal.html#offer">offer</a>. Ask us in Discord for anything else.'};
const $=s=>document.querySelector(s),els=[...document.querySelectorAll('[data-i]')];
els.forEach(e=>e.dataset.ru=e.innerHTML);
const PH={ru:{nm:'Имя',tx:'Ваш отзыв'},en:{nm:'Name',tx:'Your review'}};
let lang='ru';try{if(localStorage.getItem('crysea_lang')==='en')lang='en'}catch(e){}
const RUX={pl:'Играть',pa:'Пауза'};const T=k=>lang==='en'?EN[k]:RUX[k];
function setLang(){document.documentElement.lang=lang;els.forEach(e=>e.innerHTML=lang==='en'?EN[e.dataset.i]:e.dataset.ru);document.querySelectorAll('[data-ph]').forEach(e=>e.placeholder=PH[lang][e.dataset.ph]);$('#lang').textContent=lang==='ru'?'EN':'RU';$('#pz span').textContent=T($('#marq').classList.contains('paused')?'pl':'pa');renderRv()}
$('#lang').onclick=()=>{lang=lang==='ru'?'en':'ru';try{localStorage.setItem('crysea_lang',lang)}catch(e){}setLang()};
$('#menu').onclick=()=>$('#menu').setAttribute('aria-expanded',$('#nav').classList.toggle('open'));
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
/* Сюда добавляйте ТОЛЬКО настоящие отзывы из Discord, слово в слово, с разрешения автора.
   t:'d' = из Discord, n = первая буква имени, d = дата отзыва (ГГГГ-ММ-ДД). Пример: {t:'d',x:'текст',n:'a',d:'2026-10-20'} */
const SEED=[];
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TAG={ru:{s:'Отзыв с сайта',d:'Отзыв из Discord'},en:{s:'Site review',d:'Discord vouch'}};
let mine=[];
function renderRv(){
  const fmt=d=>new Date(d).toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'short',year:'numeric'});
  const list=[...mine,...SEED];
  {const mq_=document.getElementById('marq'),pz_=document.getElementById('pz');if(mq_)mq_.style.display=list.length?'':'none';if(pz_)pz_.style.display=list.length?'':'none';}
  if(!list.length){const tr=document.getElementById('track');if(tr)tr.innerHTML='';return}
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
$('#ob').onclick=()=>$('#rf').classList.toggle('open');/* отправка отзыва: auth.js */
renderRv();
if(lang==='en')setLang();

/* ===== Появление блоков при прокрутке, подсветка раздела в меню, тень шапки ===== */
(function(){
  const rv=[...document.querySelectorAll('[data-rv]')],reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce||!('IntersectionObserver' in window)){rv.forEach(e=>e.classList.add('in'));}
  else{
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
    rv.forEach((e,i)=>{e.style.setProperty('--d',(i%3)*70+'ms');io.observe(e)});
  }
  const links=[...document.querySelectorAll('.pill nav a')],secs=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const pill=document.querySelector('.pill');
  function spy(){
    pill.classList.toggle('lift',scrollY>12);
    let cur=null;secs.forEach(sec=>{if(sec.getBoundingClientRect().top<innerHeight*.4)cur=sec.id});
    links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+cur));
  }
  addEventListener('scroll',spy,{passive:true});spy();
  /* число процентов в демо плавно догоняет ползунок */
  let shown=230;const v1=$('#v1'),v2=$('#v2'),rng=$('#rng');
  if(!reduce){
    rng.addEventListener('input',()=>{const to=+rng.value,from=shown,t0=performance.now();
      (function step(t){const k=Math.min(1,(t-t0)/180);shown=Math.round(from+(to-from)*k);v1.textContent=v2.textContent=shown+'%';if(k<1)requestAnimationFrame(step)})(t0)});
  }
})();

/* Один раз при загрузке линия сравнения «качнётся», чтобы было понятно, что её можно двигать */
(function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let stop=false;['pointerdown','keydown'].forEach(t=>addEventListener(t,()=>stop=true,{once:true}));
  const path=[[50,50],[78,900],[32,1000],[50,800]];let i=0,from=50,t0=0;
  function go(){if(stop||i>=path.length)return;from=path[i-1]?path[i-1][0]:50;t0=performance.now();requestAnimationFrame(step)}
  function step(t){if(stop)return;const [to,ms]=path[i],k=Math.min(1,(t-t0)/ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,p=from+(to-from)*e,r=scene.getBoundingClientRect();
    if(i>0)setPos(r.left+r.width*p/100);
    if(k<1)requestAnimationFrame(step);else{i++;go()}}
  setTimeout(()=>{i=1;go()},1600);
})();
