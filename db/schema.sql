-- Crysea: схема базы данных (PostgreSQL: Supabase, Neon, любой Postgres 13+).
-- Выполните целиком один раз (Supabase: SQL Editor -> New query -> Run).

-- Пользователи: один аккаунт для сайта и приложения
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,                 -- всегда в нижнем регистре
  name          text not null,
  color         text,                                 -- цвет аватара из приложения
  pass_salt     text not null,
  pass_hash     text not null,                        -- scrypt, пароль в открытом виде не хранится
  plan          text not null default 'free' check (plan in ('free','pro','plus')),
  plan_until    timestamptz,                          -- до какого числа оплачен тариф
  data          jsonb,                                -- облако приложения: профили игр, прицел, тема, Rust-настройки
  data_updated  bigint not null default 0,            -- время последнего изменения data (мс), для синхронизации
  created_at    timestamptz not null default now()
);

-- Сессии входа (в базе лежит только хэш токена)
create table if not exists sessions (
  token_hash  text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists sessions_user_idx on sessions(user_id);

-- Платежи (история продаж)
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete set null,
  plan         text not null check (plan in ('pro','plus')),
  amount_rub   integer not null,
  method       text,                                  -- sbp / card / sber / ym
  provider     text,                                  -- yookassa / demo
  provider_id  text unique,                           -- id платежа у провайдера
  status       text not null default 'pending' check (status in ('pending','paid','canceled','demo')),
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
create index if not exists payments_user_idx on payments(user_id);

-- Защита от подбора паролей
create table if not exists rate_limits (
  key       text primary key,
  n         integer not null,
  reset_at  timestamptz not null
);

-- ВАЖНО для Supabase: закрыть таблицы от публичного REST API.
-- Функция Netlify ходит напрямую по DATABASE_URL (роль postgres) и RLS не мешает.
alter table users       enable row level security;
alter table sessions    enable row level security;
alter table payments    enable row level security;
alter table rate_limits enable row level security;
