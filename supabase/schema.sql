-- =====================================================================
-- こけにわ  Supabase スキーマ
-- Supabase の SQL Editor に全文を貼り付けて、1回だけ実行してください。
-- 何度実行しても壊れないように書いてあります（再実行可）。
-- プロジェクト作成時の「Automatically expose new tables」はオフ推奨です。
-- オフでも動くように、必要な権限はすべてこのファイルの中で明示的に付けています。
-- =====================================================================

-- Data API（anon / authenticated）が public スキーマを参照できるようにする
-- （テーブルを読めるかどうかは、下の grant と RLS で個別に決める）
grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. アプリの状態（ユーザーごとに1行。タスクと完了記録をJSONで保存）
-- ---------------------------------------------------------------------
create table if not exists public.app_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now(),
  -- 1ユーザーあたり最大1MB（誤操作や悪用でDBが膨らむのを防ぐ）
  constraint app_state_size check (octet_length(state::text) <= 1048576)
);

alter table public.app_state enable row level security;

-- 既定で付く権限をいったん全部外し、ログイン済みユーザーにだけ必要な権限を渡す（未ログインは一切触れない）
revoke all on public.app_state from anon, authenticated;
grant select, insert, update, delete on public.app_state to authenticated;

drop policy if exists "app_state: 自分の行を読む"   on public.app_state;
drop policy if exists "app_state: 自分の行を作る"   on public.app_state;
drop policy if exists "app_state: 自分の行を更新"   on public.app_state;
drop policy if exists "app_state: 自分の行を削除"   on public.app_state;

create policy "app_state: 自分の行を読む" on public.app_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "app_state: 自分の行を作る" on public.app_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "app_state: 自分の行を更新" on public.app_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "app_state: 自分の行を削除" on public.app_state
  for delete to authenticated using ((select auth.uid()) = user_id);

-- updated_at はサーバー側の時刻で上書きする
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch
  before insert or update on public.app_state
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 2. ウィジェット用キー（読み取り専用・いつでも取り消せる）
--    キーそのものは保存せず、SHA-256のハッシュだけを保存する
-- ---------------------------------------------------------------------
create table if not exists public.widget_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token_hash   text not null unique,
  label        text not null default 'iPhone',
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  constraint widget_tokens_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint widget_tokens_label_len   check (char_length(label) between 1 and 40)
);

alter table public.widget_tokens enable row level security;

revoke all on public.widget_tokens from anon, authenticated;
grant select, insert, delete on public.widget_tokens to authenticated;

drop policy if exists "widget_tokens: 自分のキーを見る"   on public.widget_tokens;
drop policy if exists "widget_tokens: 自分のキーを作る"   on public.widget_tokens;
drop policy if exists "widget_tokens: 自分のキーを消す"   on public.widget_tokens;

create policy "widget_tokens: 自分のキーを見る" on public.widget_tokens
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "widget_tokens: 自分のキーを作る" on public.widget_tokens
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "widget_tokens: 自分のキーを消す" on public.widget_tokens
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 3. ウィジェットからの読み取り口
--    正しいキーを持っている場合だけ、そのユーザーの状態を返す（書き込みはできない）
-- ---------------------------------------------------------------------
create or replace function public.get_widget_state(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid;
  v_state jsonb;
begin
  if p_token is null or char_length(p_token) < 32 or char_length(p_token) > 128 then
    return null;
  end if;

  update public.widget_tokens
     set last_used_at = now()
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  returning user_id into v_user;

  if v_user is null then
    return null;
  end if;

  select s.state into v_state from public.app_state s where s.user_id = v_user;
  return v_state;
end;
$$;

revoke all on function public.get_widget_state(text) from public;
grant execute on function public.get_widget_state(text) to anon, authenticated;
