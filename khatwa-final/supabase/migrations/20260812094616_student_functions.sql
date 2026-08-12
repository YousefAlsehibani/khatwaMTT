-- لوحة الطالب كاملة في نداء واحد
create or replace function public.student_board(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me accounts; v jsonb;
begin
  me := actor(p_token);
  if me.id is null or me.role <> 'student' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select jsonb_build_object(
    'ok', true,
    -- العدّادات
    'minutes', coalesce((select sum(a.amount) from progress p join assignments a on a.id=p.assignment_id
                          where p.student_id = me.id and a.kind='audio'), 0),
    'pages',   coalesce((select sum(p.pages_read) from progress p join assignments a on a.id=p.assignment_id
                          where p.student_id = me.id and a.kind='book'), 0),
    -- كل مقررات صفه مع حالة إنجازه
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'kind', a.kind, 'title', a.title, 'url', a.url,
        'amount', a.amount, 'due_date', a.due_date,
        'done', p.id is not null,
        'pages_read', p.pages_read,
        'completed_at', p.completed_at
      ) order by a.due_date, a.title)
      from assignments a
      left join progress p on p.assignment_id = a.id and p.student_id = me.id
      where a.grade = me.grade), '[]'::jsonb),
    -- متصدرو الصف
    'board', coalesce((
      select jsonb_agg(x order by x.done desc, x.name)
      from (
        select s.id, s.full_name as name,
               (select count(*) from progress p where p.student_id = s.id) as done
        from accounts s where s.role='student' and s.grade = me.grade and s.active
      ) x), '[]'::jsonb)
  ) into v;
  return v;
end; $$;

-- تسجيل الإنجاز (سمعت / قرأت)
create or replace function public.mark_done(p_token uuid, p_assignment uuid, p_pages int default null)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare me accounts; a assignments;
begin
  me := actor(p_token);
  if me.id is null or me.role <> 'student' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into a from assignments where id = p_assignment and grade = me.grade;
  if a.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if a.kind = 'book' then
    if p_pages is null or p_pages < 1 then
      return jsonb_build_object('ok', false, 'error', 'pages_required');
    end if;
    if p_pages > a.amount then p_pages := a.amount; end if;
  else
    p_pages := null;
  end if;

  insert into progress (student_id, assignment_id, pages_read)
  values (me.id, a.id, p_pages)
  on conflict (student_id, assignment_id)
    do update set pages_read = excluded.pages_read, completed_at = now();

  return jsonb_build_object('ok', true);
end; $$;

-- التراجع عن الإنجاز
create or replace function public.unmark_done(p_token uuid, p_assignment uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare me accounts;
begin
  me := actor(p_token);
  if me.id is null or me.role <> 'student' then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from progress where student_id = me.id and assignment_id = p_assignment;
  return jsonb_build_object('ok', true);
end; $$;

grant execute on function public.student_board(uuid)          to anon, authenticated;
grant execute on function public.mark_done(uuid, uuid, int)   to anon, authenticated;
grant execute on function public.unmark_done(uuid, uuid)      to anon, authenticated;
