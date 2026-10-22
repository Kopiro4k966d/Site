# Партнёрка Crysea: как вести

## Как это устроено
- Партнёр заходит на страницу **/partner** (отдельное окно, ссылка «Партнёрство» в подвале) и подаёт заявку: ссылка на канал, подписчики, средние просмотры, реквизиты, связь. Во вкладке «Партнёрка» в кабинете видно статус и промокод.
- Условия: TikTok — от **1 000 просмотров** и **50 подписчиков**; YouTube — от **300 просмотров** и **50 подписчиков** (средние на последние видео). Пороги лежат в `PARTNER.min` в `netlify/functions/api.mjs`, страница берёт их оттуда же по смыслу. Сайт проверяет только число и формат. Реальные цифры проверяете вы: откройте канал и посмотрите последние видео.
- После одобрения партнёр выбирает промокод (3–16 латинских букв или цифр). Код закрепляется за ним один раз.
- Покупатель вводит код на сайте или в кабинете и получает **10% скидки** (меняется в `PARTNER.buyerPercent` в `netlify/functions/api.mjs` и в константе `BUYER` в `public/partner.js`).
- Партнёр получает **5% от оплаченной суммы** по своему коду (`PARTNER.rate` в api.mjs и константа `RATE` в `partner.js`). Собственные покупки партнёра с его кодом не начисляются.
- Начисления видны партнёру во вкладке. Выплаты вы делаете вручную по его реквизитам и отмечаете в базе.

Все команды ниже выполняются в SQL-консоли (Neon / Supabase).

## 1. Одобрить заявку
Смотрим заявки на проверку:
```sql
select u.email, p.platform, p.channel_url, p.followers, p.avg_views, p.payout_details, p.created_at
from partners p join users u on u.id = p.user_id
where p.status = 'pending' order by p.created_at;
```
Одобрить (по email партнёра):
```sql
update partners set status = 'approved', approved_at = now()
where user_id = (select id from users where email = 'partner@example.com');
```
Отклонить:
```sql
update partners set status = 'rejected'
where user_id = (select id from users where email = 'partner@example.com');
```
При отклонении код партнёра (если уже был) лучше выключить:
```sql
update promo_codes set active = false
where partner_id = (select id from users where email = 'partner@example.com');
```

## 2. Выдать код вручную (если нужно не через партнёрку)
```sql
insert into promo_codes(code, percent, creator, partner_id, max_uses)
values ('IVAN', 10, 'Иван', (select id from users where email = 'partner@example.com'), null);
```

## 3. Баланс всех партнёров
Начислено минус выплачено:
```sql
select u.email, c.code,
  coalesce((select sum(floor(pay.amount_rub * 5 / 100.0)) from payments pay
            join promo_codes pc on pc.code = pay.promo
            where pc.partner_id = p.user_id and pay.status = 'paid'
              and (pay.user_id is null or pay.user_id <> p.user_id)), 0) as earned,
  coalesce((select sum(amount_rub) from partner_payouts where partner_id = p.user_id), 0) as paid
from partners p
join users u on u.id = p.user_id
left join promo_codes c on c.partner_id = p.user_id
where p.status = 'approved';
```
К выплате = earned − paid.

## 4. Записать выплату
После перевода денег партнёру:
```sql
insert into partner_payouts(partner_id, amount_rub, note)
values ((select user_id from partners p join users u on u.id = p.user_id where u.email = 'partner@example.com'),
        1500, 'июнь, карта');
```

## 5. Возврат покупки
Если оплату вернули, поставьте статус `canceled`. С этого момента начисление по ней не считается:
```sql
update payments set status = 'canceled' where provider_id = 'ID_ПЛАТЕЖА_В_ЮKassa';
```
Уже выплаченное не пересчитывается автоматически. Такие случаи учитывайте вручную при следующей выплате.

## Важно
- Деньги партнёрам переводите после оплат, которые подтверждены в ЮKassa (статус `paid`). Тестовые оплаты `demo` в начислениях не участвуют.
- Выплаты физлицам облагаются налогом (НДФЛ или налог на профессиональный доход). Условия партнёрской программы и договор с партнёрами покажите юристу или бухгалтеру, прежде чем запускать выплаты.
- При изменении схемы выполните `npm run db:init`. Команда безопасна для повторного запуска.
