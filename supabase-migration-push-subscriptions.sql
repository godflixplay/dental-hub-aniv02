-- Push notifications (Web Push / VAPID)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users manage own subscriptions select" on public.push_subscriptions;
create policy "users manage own subscriptions select"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "users manage own subscriptions insert" on public.push_subscriptions;
create policy "users manage own subscriptions insert"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users manage own subscriptions delete" on public.push_subscriptions;
create policy "users manage own subscriptions delete"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
