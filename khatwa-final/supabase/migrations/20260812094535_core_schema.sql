-- ===== أنواع =====
create type account_role as enum ('student','supervisor','exec');
create type assignment_kind as enum ('audio','book');

-- ===== الحسابات (طلاب + مشرفون + تنفيذي) =====
create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  role        account_role not null,
  full_name   text not null check (length(btrim(full_name)) between 2 and 120),
  code        char(4) not null unique check (code ~ '^[0-9]{4}$'),
  grade       text check (grade in ('أول متوسط','ثاني متوسط','ثالث متوسط')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  -- الطالب والمشرف لازم لهما صف، والتنفيذي بلا صف
  constraint grade_matches_role check (
    (role in ('student','supervisor') and grade is not null)
    or (role = 'exec' and grade is null)
  )
);
-- مشرف واحد لكل صف
create unique index one_supervisor_per_grade
  on public.accounts (grade) where role = 'supervisor';
create index accounts_role_grade_idx on public.accounts (role, grade);

-- ===== المقررات =====
create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  grade       text not null check (grade in ('أول متوسط','ثاني متوسط','ثالث متوسط')),
  kind        assignment_kind not null,
  title       text not null check (length(btrim(title)) between 2 and 200),
  url         text check (url is null or url ~* '^https?://'),
  amount      int not null check (amount between 1 and 999),  -- دقائق أو صفحات حسب النوع
  due_date    date not null,
  created_by  uuid not null references public.accounts(id) on delete restrict,
  created_at  timestamptz not null default now(),
  constraint audio_needs_url check (kind = 'book' or url is not null)
);
create index assignments_grade_date_idx on public.assignments (grade, due_date desc);

-- ===== الإنجاز =====
create table public.progress (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.accounts(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  pages_read    int check (pages_read is null or pages_read >= 1),
  completed_at  timestamptz not null default now(),
  unique (student_id, assignment_id)
);
create index progress_student_idx on public.progress (student_id);
create index progress_assignment_idx on public.progress (assignment_id);

-- ===== الجلسات =====
create table public.sessions (
  token       uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  device_id   text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days'
);
create index sessions_account_idx on public.sessions (account_id);

-- ===== محاولات الدخول =====
create table public.login_attempts (
  id         bigserial primary key,
  device_id  text,
  ok         boolean not null,
  at         timestamptz not null default now()
);
create index login_attempts_device_at_idx on public.login_attempts (device_id, at desc);
create index login_attempts_at_idx on public.login_attempts (at desc);

-- ===== إقفال كامل: لا وصول مباشر من المتصفح =====
alter table public.accounts       enable row level security;
alter table public.assignments    enable row level security;
alter table public.progress       enable row level security;
alter table public.sessions       enable row level security;
alter table public.login_attempts enable row level security;
-- لا سياسات إطلاقًا => anon و authenticated لا يقرؤون ولا يكتبون شيئًا.
-- كل الوصول يمر عبر دوال security definer المعرّفة لاحقًا.

revoke all on public.accounts, public.assignments, public.progress,
              public.sessions, public.login_attempts
  from anon, authenticated;
