begin;

insert into public.profiles (
  id,
  full_name,
  role_id,
  is_active,
  first_login,
  is_super_admin,
  tenant_id
)
select
  users.id,
  'Agencia Wiks',
  (select id from public.roles where lower(name) = 'admin' limit 1),
  true,
  false,
  true,
  '11111111-1111-1111-1111-111111111111'::uuid
from auth.users as users
where lower(users.email) = lower('agenciawiks@gmail.com')
on conflict (id) do update
set full_name = excluded.full_name,
    role_id = coalesce(excluded.role_id, public.profiles.role_id),
    is_active = true,
    first_login = false,
    is_super_admin = true,
    tenant_id = excluded.tenant_id;

notify pgrst, 'reload schema';

commit;
