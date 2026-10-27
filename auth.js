/* =========================================================
   Crysea — аккаунты, профиль, оплата
   Локально сайт запускается командой `npx netlify dev` (http://localhost:8888),
   см. ИНСТРУКЦИЯ_NETLIFY.md. Аккаунты общие с приложением Crysea.
   ========================================================= */

Object.assign(EN,{login:'Sign in',authT:'Crysea account',authS:'Access your dashboard and subscription.',fg:'Forgot your password?',or:'or',cD:'Continue with Discord',cG:'Continue with Google',soon:'soon',terms:'By continuing you accept the <a href="/legal#offer">Terms</a> and the <a href="/legal">Privacy Policy</a>.',tl:'Sign in',tr:'Sign up',fn:'Name',fp:'Password',fp2:'Repeat password',
pPlan:'Plan',pUntil:'Valid until',pSince:'Joined',pUp:'Change plan',pOut:'Sign out',pRename:'Change name',pSave:'Save',
prA:'Apply',terms2:'By paying you accept the <a href="/legal#offer">Terms</a>. The subscription does not renew automatically.',payT:'Subscription payment',sPer:'1 month subscription',payM:'Payment method',mS:'No fees',mC:'Card',mSb:'Via the app',mY:'Wallet',mU:'Cryptocurrency',
qT:'Pay with a QR code',qD:'Open your bank app, choose “Pay by QR” and point the camera. On a phone, use the button below.',cn:'Card number',ce:'Expiry',
payN:'🔒 Card data is never stored on this site. Payment is processed by the payment provider.',okT:'Payment successful',okB:'Great',promoOn:p=>`Creator code ${p}: -`,rvLogin:'Sign in to leave a review',rvSent:'Thanks! The review appears after moderation.',rvShort:'Write at least 10 characters'});

const MSG={
 ru:{feat:{pro:'Профили игр, прицел, инструменты Rust',plus:'Всё из Pro, авто-режим Rust, рейд-калькулятор'},demo:'Тестовый режим: тариф включится сразу, деньги не списываются.',soonPay:'Приём платежей пока не подключён. Тариф Free доступен без оплаты.',promo_bad:'Такого кода нет',promo_used:'Лимит этого кода исчерпан',mail:'Введите корректный email',agree:'Поставьте галочку согласия на обработку данных',pass:'Пароль должен быть не короче 6 символов',same:'Пароли не совпадают',method_off:'Этот способ оплаты пока недоступен. Выберите другой.',pay_fail:'Не удалось создать платёж. Попробуйте позже или напишите в поддержку.',net:'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.',limit:'Слишком много попыток, подождите несколько минут',auth:'Сессия истекла, войдите снова',pay_off:'Оплата ещё не подключена',name:'Введите имя',taken:'Этот email уже зарегистрирован',bad:'Неверный email или пароль',
     loginT:'Вход',regT:'Регистрация',loginB:'Войти',regB:'Создать аккаунт',newq:'Впервые в Crysea?',haveq:'Уже есть аккаунт?',mk:'Создать аккаунт',hv:'Войти',
     pay:p=>'Оплатить '+p,wait:'Обработка…',card:'Проверьте данные карты',never:'Бессрочно',
     other:{sbp:'Вы перейдёте на страницу банка, чтобы оплатить по СБП.',card:'Вы перейдёте на защищённую страницу оплаты, данные карты вводятся там.',sber:'Вы перейдёте в приложение СберБанк Онлайн для подтверждения платежа.',ym:'Вы перейдёте на страницу ЮMoney для оплаты из кошелька.',usdt:'Вам будет показан адрес кошелька USDT (TRC20). Тариф активируется после 1 подтверждения сети.'},
     done:(p,d)=>`Тариф ${p} активен до ${d}.`,months:'мес',promoOn:(c,p)=>`Код ${c}: скидка ${p}%`,rvLogin:'Войдите, чтобы оставить отзыв',rvSent:'Спасибо! Отзыв появится после проверки.',rvShort:'Напишите хотя бы 10 символов',
     sbp:'Вы перейдёте на страницу банка, чтобы оплатить по СБП.'},
 en:{feat:{pro:'Game profiles, crosshair, Rust tools',plus:'Everything in Pro, Rust auto mode, raid calculator'},demo:'Test mode: the plan activates instantly, no money is charged.',soonPay:'Payments are not connected yet. The Free plan needs no payment.',promo_bad:'No such code',promo_used:'This code has reached its limit',mail:'Enter a valid email',agree:'Please accept the data processing consent',pass:'Password must be at least 6 characters',same:'Passwords do not match',method_off:'This method is not available yet',pay_fail:'Could not create the payment, try later',net:'Cannot reach the server',limit:'Too many attempts, wait a few minutes',auth:'Session expired, sign in again',pay_off:'Payments are not connected yet',name:'Enter your name',taken:'This email is already registered',bad:'Wrong email or password',
     loginT:'Sign in',regT:'Create account',loginB:'Sign in',regB:'Create account',newq:'New to Crysea?',haveq:'Already have an account?',mk:'Create account',hv:'Sign in',
     pay:p=>'Pay '+p,wait:'Processing…',card:'Check your card details',never:'No expiry',
     other:{sbp:'You will be taken to your bank to pay via SBP.',card:'You will be taken to a secure payment page to enter your card details.',sber:'You will be taken to the SberBank Online app to confirm the payment.',ym:'You will be taken to YooMoney to pay from your wallet.',usdt:'You will see a USDT (TRC20) wallet address. The plan activates after 1 network confirmation.'},
     done:(p,d)=>`${p} plan is active until ${d}.`,months:'mo',promoOn:(c,p)=>`Code ${c}: ${p}% off`,rvLogin:'Sign in to leave a review',rvSent:'Thanks! Your review shows up after moderation.',rvShort:'Write at least 10 characters',
     sbp:'You will be taken to your bank to pay via SBP.'}};
const M=()=>MSG[lang];

/* ---------- Связь с сервером (server/server.js). Тот же сервер использует приложение ---------- */
const PLANS={pro:{name:'Pro',price:199},plus:{name:'Plus',price:399}};
const api=(()=>{
  const K='crysea_token';
  const tok=()=>{try{return localStorage.getItem(K)}catch(e){return null}};
  const setTok=t=>{try{t?localStorage.setItem(K,t):localStorage.removeItem(K)}catch(e){}};
  async function call(method,path,data){
    let r;
    try{r=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json',...(tok()?{Authorization:'Bearer '+tok()}:{})},body:data?JSON.stringify(data):undefined})}
    catch(e){throw new Error('net')}
    const j=await r.json().catch(()=>({}));
    if(!r.ok){if(r.status===401&&j.error==='auth')setTok(null);throw new Error(j.error||'net')}
    return j;
  }
  return{
    async register(d){const j=await call('POST','/register',d);setTok(j.token);return j.user},
    async login(d){const j=await call('POST','/login',d);setTok(j.token);return j.user},
    async me(){if(!tok())return null;try{return(await call('GET','/me')).user}catch(e){return null}},
    async logout(){try{await call('POST','/logout')}catch(e){}setTok(null)},
    async pay(plan,method){return call('POST','/pay',{plan,method})},
    async update(p){return(await call('PUT','/me',p)).user},
    reviews(){return call('GET','/reviews')},
    review(text){return call('POST','/reviews',{text})},
    async promo(code){const j=await call('POST','/promo',{code});return j.user},
    config(){return call('GET','/config')}
  };
})();

/* ---------- Окна ---------- */
let user=null,mode='login',planId=null,method='sbp',payMode='live';
api.config().then(c=>{$$('[data-oauth]').forEach(b=>{const k=b.dataset.oauth;if(!(c.oauth&&c.oauth[k]))return;b.disabled=false;b.removeAttribute('title');const s=b.querySelector('.soon');if(s)s.remove();b.onclick=()=>{location.href='/api/auth/'+k+'/start'}});payMode=c.pay;if(!$('#payM').hidden&&planId)paintPay()}).catch(()=>{});
const $$=s=>[...document.querySelectorAll(s)];
const open=id=>{$('#'+id).hidden=false;document.body.style.overflow='hidden'};
const closeAll=()=>{$$('.mo').forEach(m=>m.hidden=true);document.body.style.overflow=''};
$$('.mo').forEach(m=>m.addEventListener('mousedown',e=>{if(e.target===m)closeAll()}));
$$('[data-close]').forEach(b=>b.addEventListener('click',closeAll));
addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
const fmtDate=d=>new Date(d).toLocaleDateString(lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'long',year:'numeric'});

/* ---------- Шапка / профиль ---------- */
function paintUser(){
  $('#loginBtn').hidden=!!user;$('#profBtn').hidden=!user;
  if(!user)return;
  $('#profAv').textContent=(user.name||user.email)[0].toUpperCase();
  if(user.color)$('#profBtn').style.background=user.color;
}
$('#loginBtn').onclick=()=>openAuth('login');
$('#profBtn').onclick=()=>{location.href='/account'};

/* ---------- Вход / регистрация ---------- */
function setMode(m){
  mode=m;const reg=m==='reg';
  $$('#authF .reg').forEach(e=>e.hidden=!reg);
  $('#fgt').hidden=reg;
  $('#authT').textContent=reg?M().regT:M().loginT;
  $('#authB').textContent=reg?M().regB:M().loginB;
  $('#swQ').textContent=reg?M().haveq:M().newq;$('#swB').textContent=reg?M().hv:M().mk;
  $('#aPass').autocomplete=reg?'new-password':'current-password';$('#authE').textContent='';
}
let afterAuth=null;
function openAuth(m,cb){afterAuth=cb||null;setMode(m);open('authM');setTimeout(()=>$('#aMail').focus(),50)}
$('#swB').onclick=()=>setMode(mode==='reg'?'login':'reg');
$('#authF').onsubmit=async e=>{
  e.preventDefault();const E=$('#authE'),mail=$('#aMail').value.trim(),pass=$('#aPass').value,name=$('#aName').value.trim();
  if(!/^\S+@\S+\.\S+$/.test(mail))return E.textContent=M().mail;
  if(pass.length<6)return E.textContent=M().pass;
  if(mode==='reg'){if(!name)return E.textContent=M().name;if(!$('#aAgree').checked)return E.textContent=M().agree;if(pass!==$('#aPass2').value)return E.textContent=M().same}
  try{
    user=mode==='reg'?await api.register({email:mail,name,password:pass}):await api.login({email:mail,password:pass});
    paintUser();e.target.reset();closeAll();if(afterAuth){const f=afterAuth;afterAuth=null;f()}
  }catch(err){E.textContent=M()[err.message]||err.message}
};

/* ---------- Оплата ---------- */
$$('[data-buy]').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();planId=a.dataset.buy;
  user?openPay():openAuth('reg',openPay);
}));
const priceOf=id=>{const b=PLANS[id].price,pc=user&&user.promo?user.promo.percent:0;return pc?Math.max(1,Math.round(b*(100-pc)/100)):b};
const PX={
  ru:{eb:'Crysea · подписка',title:'Оплата подписки',per:'1 месяц',promoPh:'Код автора',promoB:'Применить',ml:'Способ оплаты',sbp:'СБП',sbpS:'Без комиссии',card:'Карта',cardS:'Visa · Mir · MC',payN:'Реквизиты карты вводятся на странице платёжного провайдера и не сохраняются на нашем сайте.',terms:'Нажимая «Оплатить», вы принимаете <a href="/legal#offer">условия оферты</a>. Подписка не продлевается автоматически: чтобы продолжить, оплатите снова.',okT:'Оплата прошла',okB:'Отлично'},
  en:{eb:'Crysea · subscription',title:'Subscription payment',per:'1 month',promoPh:'Creator code',promoB:'Apply',ml:'Payment method',sbp:'SBP',sbpS:'No fees',card:'Card',cardS:'Visa · Mir · MC',payN:'Card data is never stored on this site. Payment is processed by the payment provider.',terms:'By paying you accept the <a href="/legal#offer">Terms</a>. The subscription does not renew automatically.',okT:'Payment successful',okB:'Great'}
};
/* Все подписи окна оплаты собираются здесь, из одного словаря: так язык не смешивается при переключении */
function paintPay(){
  const p=PLANS[planId],pm=user&&user.promo,off=payMode==='off',t=PX[lang];
  $$('#planSeg button').forEach(b=>{const on=b.dataset.plan===planId;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.querySelector('small').textContent=priceOf(b.dataset.plan)+' ₽'});
  $('#payEb').textContent=t.eb;$('#payT').textContent=t.title;
  $('#sName').textContent=p.name;$('#sPer').textContent=t.per;
  const so=$('#sOld');so.hidden=!pm;if(pm)so.textContent=p.price+' ₽';
  $('#sNew').textContent=priceOf(planId)+' ₽';
  $('#sFeat').textContent=M().feat[planId];
  $('#promoF').hidden=!!pm;$('#promoI').placeholder=t.promoPh;$('#promoB').textContent=t.promoB;
  const pl=$('#sPromo');pl.hidden=!pm;if(pm)pl.querySelector('span').textContent=M().promoOn(pm.code,pm.percent);
  $('#payMl').textContent=t.ml;
  const sb=$('#meth [data-m=sbp]'),cb=$('#meth [data-m=card]');
  sb.querySelector('span').textContent=t.sbp;sb.querySelector('small').textContent=t.sbpS;
  cb.querySelector('span').textContent=t.card;cb.querySelector('small').textContent=t.cardS;
  $('#otherT').textContent=off?M().soonPay:payMode==='demo'?M().demo:M().other[method];
  $('#payN').textContent=t.payN;$('#terms2').innerHTML=t.terms;
  $('#okT').textContent=t.okT;$('#okB').textContent=t.okB;
  const B=$('#payBtn');B.disabled=off;B.textContent=M().pay(priceOf(planId)+' ₽');
}
function setMethod(m){
  method=m;$$('#meth button').forEach(b=>{const on=b.dataset.m===m;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
  $('#payE').textContent='';paintPay();
}
function openPay(){
  $('#payBody').hidden=false;$('#payOk').hidden=true;$('#payE').textContent='';
  setMethod(['sbp','card'].includes(method)?method:'sbp');open('payM');
}
$$('#meth button').forEach(b=>b.onclick=()=>setMethod(b.dataset.m));
$$('#planSeg button').forEach(b=>b.onclick=()=>{planId=b.dataset.plan;$('#payE').textContent='';paintPay()});
$('#promoF').onsubmit=async e=>{
  e.preventDefault();const E=$('#payE'),v=$('#promoI').value.trim();if(!v)return;E.textContent='';
  try{user=await api.promo(v);$('#promoI').value='';paintPay()}catch(err){E.textContent=M()[err.message]||err.message}
};
$('#promoX').onclick=async()=>{try{user=await api.promo('');paintPay()}catch(err){$('#payE').textContent=M()[err.message]||err.message}};
$('#payBtn').onclick=async()=>{
  const E=$('#payE'),B=$('#payBtn');E.textContent='';B.disabled=true;B.textContent=M().wait;
  let go=false;
  try{const r=await api.pay(planId,method);
    if(r.url){go=true;location.href=r.url;return}
    user=r.user;paintUser();
    $('#okD').textContent=M().done(PLANS[planId].name,fmtDate(user.until));
    $('#payBody').hidden=true;$('#payOk').hidden=false;
  }catch(err){E.textContent=M()[err.message]||err.message}
  finally{if(!go){B.disabled=payMode==='off';B.textContent=M().pay(priceOf(planId)+' ₽')}}
};

/* Перерисовка динамических подписей при смене языка */
$('#lang').addEventListener('click',()=>{setMode(mode);if(user)paintUser();if(planId)setMethod(method)});

api.me().then(u=>{user=u;paintUser()});

/* Возврат со страницы оплаты (?paid=1): ждём подтверждения от платёжного провайдера */
if(new URLSearchParams(location.search).has('paid')){
  history.replaceState(null,'',location.pathname);
  let n=0;const was=()=>user&&user.plan;
  (async function poll(){
    const u=await api.me();if(u){user=u;paintUser()}
    if(user&&user.plan!=='free'){
      $('#payBody').hidden=true;$('#payOk').hidden=false;$('#okD').textContent=M().done(PLANS[user.plan].name,fmtDate(user.until));open('payM');return}
    if(++n<15)setTimeout(poll,2000);
  })();
}

/* Переходы из кабинета: ?login=1 открывает вход, ?buy=pro|plus открывает оплату */
(function(){
  const q=new URLSearchParams(location.search),buy=q.get('buy');
  if(!q.has('login')&&!PLANS[buy])return;
  history.replaceState(null,'',location.pathname+(PLANS[buy]?'#pricing':''));
  if(PLANS[buy]){planId=buy;api.me().then(u=>{user=u;paintUser();user?openPay():openAuth('reg',openPay)})}
  else openAuth('login');
})();

/* Показать / скрыть пароль */
$('#eye').onclick=()=>{const i=$('#aPass'),on=i.type==='password';i.type=on?'text':'password';$('#eye').setAttribute('aria-pressed',on);$('#eye use').setAttribute('href',on?'#i-eyeoff':'#i-eye')};

/* Отзывы: показываем одобренные с сервера, отправка только из аккаунта */
api.reviews().then(r=>{mine=(r.reviews||[]).map(x=>({t:'s',x:x.text,n:x.name,d:x.date}));renderRv()}).catch(()=>{});
$('#rf').onsubmit=async e=>{
  e.preventDefault();const txt=$('#rt').value.trim();
  if(!user){openAuth('login');return}
  if(txt.length<10)return toast(M().rvShort);
  try{await api.review(txt);e.target.reset();e.target.classList.remove('open');toast(M().rvSent)}
  catch(err){toast(M()[err.message]||err.message)}
};
$('#ob').addEventListener('click',()=>{if(!user&&$('#rf').classList.contains('open')){$('#rf').classList.remove('open');openAuth('login')}});

/* Небольшое уведомление внизу экрана */
function toast(msg){
  let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3200);
}

if(lang==='en')setLang();
