/* =========================================================
   Crysea — аккаунты, профиль, оплата
   Локально сайт запускается командой `npx netlify dev` (http://localhost:8888),
   см. ИНСТРУКЦИЯ_NETLIFY.md. Аккаунты общие с приложением Crysea.
   ========================================================= */

Object.assign(EN,{login:'Sign in',authT:'Crysea account',authS:'Access your dashboard and subscription.',fg:'Forgot your password?',or:'or',cD:'Continue with Discord',cG:'Continue with Google',soon:'soon',terms:'By continuing you accept the <a href="legal.html#offer">Terms</a> and the <a href="legal.html">Privacy Policy</a>.',tl:'Sign in',tr:'Sign up',fn:'Name',fp:'Password',fp2:'Repeat password',
pPlan:'Plan',pUntil:'Valid until',pSince:'Joined',pUp:'Change plan',pOut:'Sign out',pRename:'Change name',pSave:'Save',
payT:'Subscription payment',sPer:'1 month subscription',payM:'Payment method',mS:'QR code, no fees',mC:'Bank card',mSb:'Via the app',mY:'Wallet',mU:'Cryptocurrency',
qT:'Pay with a QR code',qD:'Open your bank app, choose “Pay by QR” and point the camera. On a phone, use the button below.',cn:'Card number',ce:'Expiry',
payN:'🔒 Card data is never stored on this site. Payment is processed by the payment provider.',okT:'Payment successful',okB:'Great'});

const MSG={
 ru:{mail:'Введите корректный email',pass:'Пароль — минимум 6 символов',same:'Пароли не совпадают',method_off:'Этот способ пока недоступен',pay_fail:'Не удалось создать платёж, попробуйте позже',net:'Нет связи с сервером',limit:'Слишком много попыток, подождите несколько минут',auth:'Сессия истекла, войдите снова',pay_off:'Оплата ещё не подключена',name:'Введите имя',taken:'Этот email уже зарегистрирован',bad:'Неверный email или пароль',
     loginT:'Вход',regT:'Регистрация',loginB:'Войти',regB:'Создать аккаунт',newq:'Впервые в Crysea?',haveq:'Уже есть аккаунт?',mk:'Создать аккаунт',hv:'Войти',
     pay:p=>'Оплатить '+p,wait:'Обработка…',card:'Проверьте данные карты',never:'Бессрочно',
     other:{card:'Вы перейдёте на защищённую страницу оплаты, данные карты вводятся там.',sber:'Вы перейдёте в приложение СберБанк Онлайн для подтверждения платежа.',ym:'Вы перейдёте на страницу ЮMoney для оплаты из кошелька.',usdt:'Вам будет показан адрес кошелька USDT (TRC20). Тариф активируется после 1 подтверждения сети.'},
     done:(p,d)=>`Тариф ${p} активен до ${d}.`,months:'мес'},
 en:{mail:'Enter a valid email',pass:'Password must be at least 6 characters',same:'Passwords do not match',method_off:'This method is not available yet',pay_fail:'Could not create the payment, try later',net:'Cannot reach the server',limit:'Too many attempts, wait a few minutes',auth:'Session expired, sign in again',pay_off:'Payments are not connected yet',name:'Enter your name',taken:'This email is already registered',bad:'Wrong email or password',
     loginT:'Sign in',regT:'Create account',loginB:'Sign in',regB:'Create account',newq:'New to Crysea?',haveq:'Already have an account?',mk:'Create account',hv:'Sign in',
     pay:p=>'Pay '+p,wait:'Processing…',card:'Check your card details',never:'No expiry',
     other:{card:'You will be taken to a secure payment page to enter your card details.',sber:'You will be taken to the SberBank Online app to confirm the payment.',ym:'You will be taken to YooMoney to pay from your wallet.',usdt:'You will see a USDT (TRC20) wallet address. The plan activates after 1 network confirmation.'},
     done:(p,d)=>`${p} plan is active until ${d}.`,months:'mo'}};
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
    async update(p){return(await call('PUT','/me',p)).user},
    async pay(plan,method){return call('POST','/pay',{plan,method})},
    config(){return call('GET','/config')}
  };
})();

/* ---------- Окна ---------- */
let user=null,mode='login',planId=null,method='sbp',payMode='demo';
api.config().then(c=>{payMode=c.pay;if(payMode==='live'){const u=$('[data-m=usdt]');if(u)u.hidden=true}}).catch(()=>{});
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
$('#profBtn').onclick=()=>{location.href='account.html'};

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
  if(mode==='reg'){if(!name)return E.textContent=M().name;if(pass!==$('#aPass2').value)return E.textContent=M().same}
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
function openPay(){
  const p=PLANS[planId];
  $('#sPlan').textContent='Crysea '+p.name;$('#sPrice').textContent=p.price+' ₽';
  $('#payBody').hidden=false;$('#payOk').hidden=true;$('#payE').textContent='';
  setMethod('sbp');drawQR();open('payM');
}
function setMethod(m){
  method=m;$$('#meth button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  const other=['sber','ym','usdt'].includes(m)||(payMode==='live'&&m==='card');
  $('[data-p=sbp]').hidden=m!=='sbp';$('[data-p=card]').hidden=m!=='card';$('[data-p=other]').hidden=!other;
  if(other)$('#otherT').textContent=M().other[m];
  $('#payBtn').textContent=M().pay(PLANS[planId].price+' ₽');$('#payE').textContent='';
}
$$('#meth button').forEach(b=>b.onclick=()=>setMethod(b.dataset.m));
$('#cNum').oninput=e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
$('#cExp').oninput=e=>{let v=e.target.value.replace(/\D/g,'').slice(0,4);e.target.value=v.length>2?v.slice(0,2)+'/'+v.slice(2):v};
$('#cCvc').oninput=e=>e.target.value=e.target.value.replace(/\D/g,'');

/* Декоративный QR-плейсхолдер. В реальности QR/ссылку СБП выдаёт платёжный провайдер. */
function drawQR(){
  const c=$('#qr'),g=c.getContext('2d'),n=25,s=c.width/n;let seed=planId==='pro'?7:13;
  const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.fillStyle='#111';
  const finder=(x,y)=>{g.fillRect(x*s,y*s,7*s,7*s);g.fillStyle='#fff';g.fillRect((x+1)*s,(y+1)*s,5*s,5*s);g.fillStyle='#111';g.fillRect((x+2)*s,(y+2)*s,3*s,3*s)};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const inF=(x<8&&y<8)||(x>n-9&&y<8)||(x<8&&y>n-9);
    if(!inF&&rnd()>.52)g.fillRect(x*s,y*s,s,s)}
  finder(0,0);finder(n-7,0);finder(0,n-7);
}
$('#payBtn').onclick=async()=>{
  const E=$('#payE'),B=$('#payBtn');E.textContent='';
  if(method==='card'&&payMode!=='live'){
    const num=$('#cNum').value.replace(/\s/g,''),exp=$('#cExp').value,cvc=$('#cCvc').value;
    const mm=+exp.slice(0,2);
    if(num.length<16||!/^\d\d\/\d\d$/.test(exp)||mm<1||mm>12||cvc.length<3)return E.textContent=M().card;
  }
  B.disabled=true;B.textContent=M().wait;
  try{const r=await api.pay(planId,method);
    if(r.url){location.href=r.url;return}
    user=r.user;paintUser();
    $('#okD').textContent=M().done(PLANS[planId].name,fmtDate(user.until));
    $('#payBody').hidden=true;$('#payOk').hidden=false;
    ['#cNum','#cExp','#cCvc'].forEach(s=>$(s).value='');
  }catch(err){E.textContent=M()[err.message]||err.message;B.textContent=M().pay(PLANS[planId].price+' ₽')}
  finally{B.disabled=false}
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
