/* Страница возврата после входа через Discord или Google. Токен приходит во фрагменте адреса (#token=...),
   поэтому не попадает в логи сервера. */
(function(){
  var h=new URLSearchParams(location.hash.slice(1)),t=document.getElementById('t'),d=document.getElementById('d'),b=document.getElementById('b');
  var ru=(navigator.language||'ru').slice(0,2)!=='en';
  var E={off:['Вход через эту соцсеть ещё не подключён','Sign-in with this provider is not enabled yet'],
    denied:['Вход отменён','Sign-in was cancelled'],state:['Ссылка входа устарела, попробуйте ещё раз','The sign-in link expired, please try again'],
    noemail:['У аккаунта нет подтверждённого email. Подтвердите почту в Discord/Google или войдите по email и паролю','Your account has no verified email. Verify it with Discord/Google or sign in with email and password'],
    server:['Ошибка сервера, попробуйте ещё раз через минуту','Server error, please try again in a minute'],
    provider:['Не удалось войти, попробуйте ещё раз','Sign-in failed, please try again'],limit:['Слишком много попыток, подождите несколько минут','Too many attempts, wait a few minutes']};
  history.replaceState(null,'',location.pathname);
  var tok=h.get('token');
  if(tok&&/^[0-9a-f]{64}$/.test(tok)){
    try{localStorage.setItem('crysea_token',tok)}catch(e){}
    t.textContent=ru?'Вы вошли':'Signed in';d.textContent=ru?'Перенаправляем на сайт…':'Redirecting…';
    setTimeout(function(){location.replace('/')},600);return;
  }
  if(h.get('app')){t.textContent=ru?'Готово!':'Done!';d.textContent=ru?'Вернитесь в приложение Crysea: вход выполнится автоматически. Это окно можно закрыть.':'Go back to the Crysea app: you will be signed in automatically. You can close this tab.';b.hidden=true;return}
  var e=E[h.get('error')]||E.provider;
  t.textContent=ru?'Не получилось':'Something went wrong';d.textContent=e[ru?0:1];b.hidden=false;b.textContent=ru?'На главную':'Home';
})();
