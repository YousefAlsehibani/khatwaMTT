-- ===== المشرف =====
create or replace function public.supervisor_board(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me accounts;
begin
  me := actor(p_token);
  if me.id is null or me.role <> 'supervisor' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'grade', me.grade,
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.full_name, 'code', s.code,
        'done',    (select count(*) from progress p where p.student_id = s.id),
        'minutes', coalesce((select sum(a.amount) from progress p join assignments a on a.id=p.assignment_id
                              where p.student_id=s.id and a.kind='audio'),0),
        'pages',   coalesce((select sum(p.pages_read) from progress p join assignments a on a.id=p.assignment_id
                              where p.student_id=s.id and a.kind='book'),0),
        'late',    (select count(*) from assignments a where a.grade=me.grade and a.due_date < current_date
                     and not exists (select 1 from progress p where p.assignment_id=a.id and p.student_id=s.id))
      ) order by s.full_name)
      from accounts s where s.role='student' and s.grade=me.grade and s.active), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'kind', a.kind, 'title', a.title, 'url', a.url,
        'amount', a.amount, 'due_date', a.due_date,
        'done_count', (select count(*) from progress p where p.assignment_id = a.id)
      ) order by a.due_date desc)
      from assignments a where a.grade = me.grade), '[]'::jsonb),
    'total_students', (select count(*) from accounts where role='student' and grade=me.grade and active)
  );
end; $$;

create or replace function public.save_assignment(
  p_token uuid, p_kind text, p_title text, p_url text,
  p_amount int, p_due date, p_id uuid default null)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare me accounts; v_id uuid;
begin
  me := actor(p_token);
  if me.id is null or me.role <> 'supervisor' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_id is null then
    insert into assignments (grade, kind, title, url, amount, due_date, created_by)
    values (me.grade, p_kind::assignment_kind, btrim(p_title),
            nullif(btrim(coalesce(p_url,'')),''), p_amount, p_due, me.id)
    returning id into v_id;
  else
    update assignments set
      kind = p_kind::assignment_kind, title = btrim(p_title),
      url = nullif(btrim(coalesce(p_url,'')),''), amount = p_amount, due_date = p_due
    where id = p_id and grade = me.grade
    returning id into v_id;
    if v_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end; $$;

create or replace function public.delete_assignment(p_token uuid, p_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare me accounts; n int;
begin
  me := actor(p_token);
  if me.id is null or me.role <> 'supervisor' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from assignments where id = p_id and grade = me.grade;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n > 0);
end; $$;

-- ===== التنفيذي =====
create or replace function public.exec_board(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me accounts;
begin
  me := actor(p_token);
  if me.id is null or me.role <> 'exec' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'total_minutes', coalesce((select sum(a.amount) from progress p join assignments a on a.id=p.assignment_id
                                where a.kind='audio'),0),
    'total_pages',   coalesce((select sum(p.pages_read) from progress p join assignments a on a.id=p.assignment_id
                                where a.kind='book'),0),
    'grades', coalesce((
      select jsonb_agg(jsonb_build_object(
        'grade', g.grade,
        'students',    (select count(*) from accounts s where s.role='student' and s.grade=g.grade and s.active),
        'assignments', (select count(*) from assignments a where a.grade=g.grade),
        'supervisor',  (select s.full_name from accounts s where s.role='supervisor' and s.grade=g.grade),
        'done',        (select count(*) from progress p join accounts s on s.id=p.student_id where s.grade=g.grade),
        'minutes',     coalesce((select sum(a.amount) from progress p join assignments a on a.id=p.assignment_id
                                  join accounts s on s.id=p.student_id
                                  where s.grade=g.grade and a.kind='audio'),0)
      ) order by g.ord)
      from (values ('أول متوسط',1),('ثاني متوسط',2),('ثالث متوسط',3)) as g(grade,ord)), '[]'::jsonb),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.full_name, 'code', s.code, 'grade', s.grade,
        'done',    (select count(*) from progress p where p.student_id=s.id),
        'total',   (select count(*) from assignments a where a.grade=s.grade),
        'minutes', coalesce((select sum(a.amount) from progress p join assignments a on a.id=p.assignment_id
                              where p.student_id=s.id and a.kind='audio'),0),
        'pages',   coalesce((select sum(p.pages_read) from progress p join assignments a on a.id=p.assignment_id
                              where p.student_id=s.id and a.kind='book'),0),
        'late',    (select count(*) from assignments a where a.grade=s.grade and a.due_date < current_date
                     and not exists (select 1 from progress p where p.assignment_id=a.id and p.student_id=s.id))
      ) order by s.grade, s.full_name)
      from accounts s where s.role='student' and s.active), '[]'::jsonb),
    'supervisors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.full_name, 'code', s.code, 'grade', s.grade,
        'students',    (select count(*) from accounts x where x.role='student' and x.grade=s.grade and x.active),
        'assignments', (select count(*) from assignments a where a.created_by = s.id)
      ) order by s.grade)
      from accounts s where s.role='supervisor' and s.active), '[]'::jsonb)
  );
end; $$;

create or replace function public.create_account(p_token uuid, p_role text, p_name text, p_grade text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare me accounts; v_code char(4); v_id uuid;
begin
  me := actor(p_token);
  if me.id is null or me.role <> 'exec' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_role not in ('student','supervisor') then
    return jsonb_build_object('ok', false, 'error', 'bad_role');
  end if;

  v_code := new_code();
  insert into accounts (role, full_name, code, grade)
  values (p_role::account_role, btrim(p_name), v_code, p_grade)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'code', v_code);
exception
  when unique_violation then return jsonb_build_object('ok', false, 'error', 'supervisor_exists');
end; $$;

create or replace function public.deactivate_account(p_token uuid, p_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare me accounts;
begin
  me := actor(p_token);
  if me.id is null or me.role <> 'exec' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update accounts set active = false where id = p_id and role <> 'exec';
  delete from sessions where account_id = p_id;
  return jsonb_build_object('ok', true);
end; $$;

grant execute on function public.supervisor_board(uuid)                                to anon, authenticated;
grant execute on function public.save_assignment(uuid,text,text,text,int,date,uuid)     to anon, authenticated;
grant execute on function public.delete_assignment(uuid,uuid)                          to anon, authenticated;
grant execute on function public.exec_board(uuid)                                      to anon, authenticated;
grant execute on function public.create_account(uuid,text,text,text)                   to anon, authenticated;
grant execute on function public.deactivate_account(uuid,uuid)                         to anon, authenticated;
