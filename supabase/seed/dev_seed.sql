-- ══════════════════════════════════════════════════════════════════
-- DEVELOPMENT SEED DATA — NOT A MIGRATION
-- ══════════════════════════════════════════════════════════════════
-- This file lives in supabase/seed/, NOT supabase/migrations/, so
-- `supabase db push` never runs it automatically. It must be run manually
-- and deliberately:
--
--   psql "$DATABASE_URL" -v allow_seed=yes -f supabase/seed/dev_seed.sql
--
-- SAFETY DESIGN (why this can't corrupt production even if run by mistake):
-- 1. Explicit opt-in guard below — running it without -v allow_seed=yes
--    aborts immediately with an error, no data touched.
-- 2. Everything this script creates lives under ONE fixed, clearly-named
--    project row ('KS Wedding (DEV SEED — safe to delete)', fixed UUID
--    below) — it NEVER writes into your real "KS Wedding" project. Even a
--    mistaken run against a real environment only adds one extra, obviously
--    fake, fully self-contained project that can be deleted with a single
--    statement (see "Cleanup" at the bottom).
-- 3. Repeatable: it deletes-and-recreates that one dev project every run
--    (cascading deletes remove every row this script ever created), so
--    running it 10 times gives the same clean state, not accumulating junk.
--
-- BEFORE RUNNING: replace 'YOUR_EMAIL_HERE' below with a real, already
-- whitelisted email that has signed in at least once (so a matching
-- auth.users row exists to attach as the dev project's Owner).
-- ══════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- Guard: :'allow_seed' is a psql CLIENT-side variable (from -v allow_seed=yes),
-- substituted as literal text by psql BEFORE this reaches the server — it is
-- NOT the same thing as a Postgres session GUC (current_setting() would not
-- see it, and using that instead was an earlier bug in this script: it would
-- have always failed closed, even when correctly invoked). If the flag is
-- omitted, psql substitutes an empty string here, so the check still fails
-- safe by default.
do $$
begin
  if :'allow_seed' <> 'yes' then
    raise exception
      'Refusing to run: this looks like an accidental execution. '
      'Re-run with: psql "$DATABASE_URL" -v allow_seed=yes -f supabase/seed/dev_seed.sql';
  end if;
end $$;

-- Fixed, obviously-fake project id — never the same id as your real project.
\set dev_project_id '00000000-0000-0000-0000-0000000000d5'
\set dev_owner_email 'YOUR_EMAIL_HERE'

begin;

-- ── Reset: delete-and-recreate for full repeatability ────────────────
delete from projects where id = :'dev_project_id';

insert into projects (id, name, bride_name, groom_name, wedding_date, venue, currency, default_language)
values (
  :'dev_project_id',
  'KS Wedding (DEV SEED — safe to delete)',
  'Suttinee (dev)', 'Krisanapon (dev)',
  current_date + interval '90 days',
  'Dev Seed Venue', 'THB', 'th'
);

-- Attach the dev owner (must already exist in auth.users — sign in once first)
insert into project_members (project_id, user_id, role)
select :'dev_project_id', u.id, 'owner'
from auth.users u
where u.email = :'dev_owner_email'
on conflict (project_id, user_id) do nothing;

do $$
begin
  if not exists (
    select 1 from project_members where project_id = :'dev_project_id'::uuid
  ) then
    raise notice
      'No project_members row was created — either % never signed in yet '
      '(no matching auth.users row), or the placeholder email in this '
      'script was never replaced. The dev project exists but you will not '
      'be able to view it in the app until this is fixed.',
      :'dev_owner_email';
  end if;
end $$;

insert into whitelisted_emails (email, invited_role, project_id)
values (:'dev_owner_email', 'owner', :'dev_project_id')
on conflict (email) do nothing;

select seed_default_permissions(:'dev_project_id'::uuid);

-- ── Payment Accounts (4, per Payment Accounts module spec) ───────────
insert into payment_accounts (id, project_id, name, type, owner) values
  (gen_random_uuid(), :'dev_project_id', 'Wedding Account', 'bank', 'joint'),
  (gen_random_uuid(), :'dev_project_id', 'Bride Account',   'bank', 'bride'),
  (gen_random_uuid(), :'dev_project_id', 'Groom Account',   'bank', 'groom'),
  (gen_random_uuid(), :'dev_project_id', 'Cash',            'cash', 'joint');

-- ── Budget Categories (14, per Functional Requirements suggested list) ──
insert into budget_categories (id, project_id, name, sort_order) values
  (gen_random_uuid(), :'dev_project_id', 'Venue',           1),
  (gen_random_uuid(), :'dev_project_id', 'Food',            2),
  (gen_random_uuid(), :'dev_project_id', 'Drink',           3),
  (gen_random_uuid(), :'dev_project_id', 'Decoration',      4),
  (gen_random_uuid(), :'dev_project_id', 'Photo',           5),
  (gen_random_uuid(), :'dev_project_id', 'Video',           6),
  (gen_random_uuid(), :'dev_project_id', 'Ring',            7),
  (gen_random_uuid(), :'dev_project_id', 'Wedding Dress',   8),
  (gen_random_uuid(), :'dev_project_id', 'Makeup',          9),
  (gen_random_uuid(), :'dev_project_id', 'Music',          10),
  (gen_random_uuid(), :'dev_project_id', 'Transportation', 11),
  (gen_random_uuid(), :'dev_project_id', 'Hotel',          12),
  (gen_random_uuid(), :'dev_project_id', 'Gift',           13),
  (gen_random_uuid(), :'dev_project_id', 'Miscellaneous',  14);

-- Budgeted amount per category — deliberately uneven so the dashboard's
-- "over budget" flag has something real to show once expenses are seeded.
insert into budgets (project_id, category_id, budgeted_amount)
select :'dev_project_id', id,
  (case name
    when 'Venue' then 250000
    when 'Food' then 200000
    when 'Drink' then 40000
    when 'Decoration' then 80000
    when 'Photo' then 60000
    when 'Video' then 50000
    when 'Ring' then 100000
    when 'Wedding Dress' then 70000
    when 'Makeup' then 25000
    when 'Music' then 30000
    when 'Transportation' then 20000
    when 'Hotel' then 40000
    when 'Gift' then 15000
    else 20000
  end)::numeric(12,2)
from budget_categories where project_id = :'dev_project_id';

-- ── Vendors (20 — within the 20-50 scale target) ─────────────────────
insert into vendors (id, project_id, name, contact_person, phone, line_id, facebook, remark)
select gen_random_uuid(), :'dev_project_id', v.name, v.contact, v.phone, v.line, v.fb, v.remark
from (values
  ('Baan Suan Wedding Hall', 'Khun Malee', '081-111-2222', '@baansuan', 'BaanSuanWeddingHall', 'Venue + catering package'),
  ('Sweet Moments Catering', 'Khun Somchai', '081-222-3333', '@sweetmoments', 'SweetMomentsCatering', ''),
  ('Bangkok Bar Service', 'Khun Anan', '081-333-4444', '@bkkbar', 'BangkokBarService', 'Drinks & bartenders'),
  ('Petal & Vine Decor', 'Khun Ploy', '081-444-5555', '@petalvine', 'PetalVineDecor', ''),
  ('Golden Frame Photography', 'Khun Nat', '081-555-6666', '@goldenframe', 'GoldenFramePhoto', ''),
  ('Cinematic Love Films', 'Khun Ice', '081-666-7777', '@cinematiclove', 'CinematicLoveFilms', 'Videography'),
  ('Sparkle Jewelry House', 'Khun Kob', '081-777-8888', '@sparklejewelry', '', 'Rings'),
  ('Chada Bridal Couture', 'Khun Fah', '081-888-9999', '@chadabridal', 'ChadaBridalCouture', 'Wedding dress'),
  ('Glow Up Makeup Studio', 'Khun Bee', '081-999-0000', '@glowupmakeup', '', ''),
  ('Live Band Siam', 'Khun Tor', '082-111-2222', '@livebandsiam', 'LiveBandSiam', 'Music & MC'),
  ('Premium Van Rentals', 'Khun Dam', '082-222-3333', '', '', 'Transportation'),
  ('Riverside Boutique Hotel', 'Khun Ning', '082-333-4444', '@riversideboutique', '', 'Guest accommodation'),
  ('Little Joy Gift Shop', 'Khun Aom', '082-444-5555', '@littlejoy', '', 'Wedding favors'),
  ('Print Perfect Invitations', 'Khun Golf', '082-555-6666', '', '', ''),
  ('Elegant Tent & Lighting', 'Khun Pu', '082-666-7777', '@eleganttent', 'ElegantTentLighting', ''),
  ('Thai Dessert Corner', 'Khun Mint', '082-777-8888', '@thaidessert', '', ''),
  ('Fresh Bloom Florist', 'Khun Fon', '082-888-9999', '@freshbloom', 'FreshBloomFlorist', ''),
  ('Grand Entrance Events', 'Khun Beam', '082-999-0000', '', '', 'MC & event coordination'),
  ('Sound & Stage Pro', 'Khun Champ', '083-111-2222', '', '', 'AV equipment'),
  ('Sunset Rooftop Bar', 'Khun Gap', '083-222-3333', '@sunsetrooftop', '', 'After-party venue')
) as v(name, contact, phone, line, fb, remark);

-- ── Expenses (~200, within the 100-300 scale target) ─────────────────
-- Randomized but repeatable-shaped: cycles through every category/vendor/
-- account combination with varied dates (last 5 months) and amounts scaled
-- per category so totals look plausible against the budgets above.
insert into expenses (
  id, project_id, category_id, payment_account_id, vendor_id,
  date, amount, vat, discount, shipping, withholding_tax,
  remark, payment_method, created_at
)
select
  gen_random_uuid(),
  :'dev_project_id',
  c.id,
  a.id,
  v.id,
  (current_date - (floor(random() * 150))::int),
  round((3000 + random() * 47000)::numeric, 2),
  round((case when random() > 0.5 then 0 else 0.07 end) * (3000 + random() * 47000), 2),
  round((case when random() > 0.8 then random() * 2000 else 0 end)::numeric, 2),
  round((case when random() > 0.85 then random() * 500 else 0 end)::numeric, 2),
  round((case when random() > 0.9 then random() * 1000 else 0 end)::numeric, 2),
  (array['Deposit payment', 'Final settlement', 'Partial payment', null, null])[floor(random() * 5 + 1)::int],
  (array['cash', 'bank_transfer', 'promptpay', 'qr_payment'])[floor(random() * 4 + 1)::int],
  now() - (floor(random() * 150)::int || ' days')::interval
from generate_series(1, 200) gs
join lateral (
  select id from budget_categories
  where project_id = :'dev_project_id'
  offset floor(random() * 14)::int limit 1
) c on true
join lateral (
  select id from payment_accounts
  where project_id = :'dev_project_id'
  offset floor(random() * 4)::int limit 1
) a on true
join lateral (
  select id from vendors
  where project_id = :'dev_project_id'
  offset floor(random() * 20)::int limit 1
) v on true;

-- ── Guests (~450, within the 300-600 scale target) ───────────────────
insert into guests (
  id, project_id, name, phone, email, table_no, rsvp_status,
  transfer_amount, envelope_amount, remark, source, created_at
)
select
  gen_random_uuid(),
  :'dev_project_id',
  fn.name || ' ' || ln.name,
  '08' || lpad((floor(random() * 100000000))::bigint::text, 8, '0'),
  lower(fn.name) || floor(random() * 1000)::int || '@example.com',
  (floor(random() * 40) + 1)::int::text,
  (array['pending', 'attending', 'attending', 'attending', 'declined'])[floor(random() * 5 + 1)::int],
  (case when random() > 0.6 then round((500 + random() * 4500)::numeric, 2) else 0 end),
  (case when random() > 0.6 then 0 else round((300 + random() * 2700)::numeric, 2) end),
  null,
  'walk_in',
  now() - (floor(random() * 180)::int || ' days')::interval
from generate_series(1, 450) gs
join lateral (
  select name from (values
    ('Somchai'),('Suda'),('Anan'),('Malee'),('Nat'),('Ploy'),('Kob'),('Fah'),
    ('Bee'),('Tor'),('Dam'),('Ning'),('Aom'),('Golf'),('Pu'),('Mint'),
    ('Fon'),('Beam'),('Champ'),('Gap'),('Ice'),('Earth'),('Sky'),('Fern'),
    ('James'),('Emily'),('Michael'),('Sarah'),('David'),('Anna')
  ) as t(name)
  offset floor(random() * 30)::int limit 1
) fn on true
join lateral (
  select name from (values
    ('Srisuk'),('Boonmee'),('Chaiyaporn'),('Wongsawat'),('Rattanakul'),
    ('Thongdee'),('Saetang'),('Pongpanich'),('Kittisak'),('Amnuay'),
    ('Smith'),('Johnson'),('Lee'),('Chen'),('Kumar')
  ) as t(name)
  offset floor(random() * 15)::int limit 1
) ln on true;

-- ── Incomes (~200, mostly linked to seeded guests) ───────────────────
insert into incomes (id, project_id, payment_account_id, guest_id, type, amount, date, source, remark, created_at)
select
  gen_random_uuid(),
  :'dev_project_id',
  a.id,
  g.id,
  (case when g.envelope_amount > 0 then 'envelope' else 'transfer' end),
  (case when g.envelope_amount > 0 then g.envelope_amount else g.transfer_amount end),
  (current_date - (floor(random() * 30))::int),
  'manual',
  null,
  now() - (floor(random() * 30)::int || ' days')::interval
from guests g
join lateral (
  select id from payment_accounts where project_id = :'dev_project_id'
  offset floor(random() * 4)::int limit 1
) a on true
where g.project_id = :'dev_project_id'
  and (g.envelope_amount > 0 or g.transfer_amount > 0)
limit 200;

-- A handful of non-guest income (sponsor/gift/gold), for chart variety.
insert into incomes (id, project_id, payment_account_id, guest_id, type, amount, date, source, remark)
select
  gen_random_uuid(),
  :'dev_project_id',
  a.id,
  null,
  (array['sponsor', 'gift', 'gold', 'cheque'])[floor(random() * 4 + 1)::int],
  round((2000 + random() * 18000)::numeric, 2),
  (current_date - (floor(random() * 60))::int),
  'manual',
  'Dev seed extra income'
from generate_series(1, 15) gs
join lateral (
  select id from payment_accounts where project_id = :'dev_project_id'
  offset floor(random() * 4)::int limit 1
) a on true;

commit;

-- ══════════════════════════════════════════════════════════════════
-- Cleanup — run this any time to remove ALL dev seed data in one shot
-- (cascading deletes handle every child table automatically):
--
--   delete from projects where name = 'KS Wedding (DEV SEED — safe to delete)';
-- ══════════════════════════════════════════════════════════════════
