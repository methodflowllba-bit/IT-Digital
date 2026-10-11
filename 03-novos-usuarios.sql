begin;
create or replace function private.itdigital_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role, active)
  values (new.id, coalesce(new.email, ''), 'usuario', false)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.itdigital_new_user() from public;
drop trigger if exists itdigital_new_user on auth.users;
create trigger itdigital_new_user
after insert on auth.users
for each row execute function private.itdigital_new_user();
commit;
