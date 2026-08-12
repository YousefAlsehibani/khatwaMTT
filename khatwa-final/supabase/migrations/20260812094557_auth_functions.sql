-- من صاحب هذه الجلسة؟ (داخلية)
create or replace function public.actor(p_token uuid)
returns public.accounts
language sql stable security definer set search_path = public as $$
  select a.* from sessions s
  join accounts a on a.id = s.account_id
  where s.token = p_token and s.expires_at > now() and a.active;
$$;
revoke all on function public.actor(uuid) from public, anon, authenticated;

-- توليد رمز عشوائي غير مستخدم (داخلية)
create or replace function public.new_code()
returns char(4)
language plpgsql volatile security definer set search_path = public as $$
declare c char(4); i int := 0;
begin
  loop
    c := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
    exit when not exists (select 1 from accounts where code = c);
    i := i + 1;
    if i > 500 then raise exception 'لم يعد هناك رموز متاحة'; end if;
  end loop;
  return c;
end; $$;
revoke all on function public.new_code() from public, anon, authenticated;

-- تسجيل الدخول بالرمز
create or replace function public.login(p_code text, p_device text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_acc accounts;
  v_tok uuid;
  v_dev_fails int;
  v_all_fails int;
begin
  if p_code is null or p_code !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;

  -- حد المحاولات: لكل جهاز، ولكل النظام
  select count(*) into v_dev_fails from login_attempts
   where device_id is not distinct from p_device and not ok and at > now() - interval '15 minutes';
  select count(*) into v_all_fails from login_attempts
   where not ok and at > now() - interval '5 minutes';

  if v_dev_fails >= 7 or v_all_fails >= 40 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select * into v_acc from accounts where code = p_code and active;

  if v_acc.id is null then
    insert into login_attempts (device_id, ok) values (p_device, false);
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  insert into login_attempts (device_id, ok) values (p_device, true);
  insert into sessions (account_id, device_id) values (v_acc.id, p_device)
    returning token into v_tok;

  return jsonb_build_object(
    'ok', true, 'token', v_tok,
    'me', jsonb_build_object('id', v_acc.id, 'name', v_acc.full_name,
                             'role', v_acc.role, 'grade', v_acc.grade, 'code', v_acc.code)
  );
end; $$;

-- من أنا؟ (لاستعادة الجلسة عند إعادة فتح الصفحة)
create or replace function public.whoami(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_acc accounts;
begin
  v_acc := actor(p_token);
  if v_acc.id is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true,
    'me', jsonb_build_object('id', v_acc.id, 'name', v_acc.full_name,
                             'role', v_acc.role, 'grade', v_acc.grade, 'code', v_acc.code));
end; $$;

-- خروج
create or replace function public.logout(p_token uuid)
returns void
language sql volatile security definer set search_path = public as $$
  delete from sessions where token = p_token;
$$;

grant execute on function public.login(text, text)  to anon, authenticated;
grant execute on function public.whoami(uuid)       to anon, authenticated;
grant execute on function public.logout(uuid)       to anon, authenticated;
