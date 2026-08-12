-- حساب المشرف التنفيذي الأول (بدّل الرمز فورًا بعد أول دخول)
insert into public.accounts (role, full_name, code, grade)
values ('exec', 'المشرف التنفيذي', '1000', null)
on conflict (code) do nothing;
