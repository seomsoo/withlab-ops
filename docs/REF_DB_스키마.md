# REF: DB 스키마 (Supabase PostgreSQL)

> 12개 테이블. 마이그레이션 순서대로 실행할 것.

## 테이블 관계도

```
suppliers ─────────────┬───── product_mappings
    │                  ├───── name_mappings
    │                  ├───── courier_mappings
    │                  └───── supplier_templates
    │
work_sessions
    │
    ├── order_imports ──── orders ──── allocations ──── trackings
    │                                      │
    └── tracking_imports ──────────────────┘

platform_templates (독립)
```

## SQL 마이그레이션

```sql
-- ==========================================
-- 1. suppliers (다른 테이블이 참조)
-- ==========================================
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  memo text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 활성 공급처 이름 유니크
create unique index uniq_active_supplier_name
  on suppliers(name) where is_active = true;

-- ==========================================
-- 2. work_sessions
-- ==========================================
create table work_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'ordered', 'completed')),
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  completed_at timestamptz
);

create index idx_ws_status on work_sessions(status);
create index idx_ws_created on work_sessions(created_at desc);

-- ==========================================
-- 3. order_imports (작업건 + 플랫폼당 1파일)
-- ==========================================
create table order_imports (
  id uuid primary key default gen_random_uuid(),
  work_session_id uuid not null references work_sessions(id) on delete cascade,
  platform text not null check (platform in ('coupang', 'toss')),
  file_name text not null,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz default now(),

  unique (work_session_id, platform)  -- 같은 작업건에 같은 플랫폼 파일 1개만
);

-- ==========================================
-- 4. orders
-- ==========================================
create table orders (
  id uuid primary key default gen_random_uuid(),
  work_session_id uuid not null references work_sessions(id) on delete cascade,
  order_import_id uuid not null references order_imports(id) on delete cascade,

  platform text not null check (platform in ('coupang', 'toss')),
  order_no text not null,
  order_item_no text not null,
  matching_key text not null,
  order_date timestamptz,

  product_name text not null,
  option_name text not null default '',
  quantity integer not null check (quantity > 0),

  buyer_name text,
  buyer_phone text,
  buyer_phone_digits text,

  recipient_name text not null,
  recipient_phone text,
  recipient_phone_digits text,
  zip_code text,
  address text not null,
  delivery_message text,

  raw jsonb not null,
  raw_values jsonb not null,          -- 셀 배열 (컬럼 순서 보존)
  raw_row_number integer not null,

  created_at timestamptz default now(),

  unique (work_session_id, platform, matching_key)  -- 중복 주문 방지
);

create index idx_orders_ws on orders(work_session_id);
create index idx_orders_match on orders(work_session_id, matching_key);
create index idx_orders_product on orders(work_session_id, product_name, option_name);

-- ==========================================
-- 5. allocations (1 주문 = 1 배정, unique order_id)
-- ==========================================
create table allocations (
  id uuid primary key default gen_random_uuid(),
  work_session_id uuid not null references work_sessions(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  supplier_id uuid not null references suppliers(id),

  supplier_product_name text not null,
  supplier_product_code text,
  allocated_quantity integer not null check (allocated_quantity > 0),

  status text not null default 'pending'
    check (status in ('pending', 'ordered')),
  is_temporary_override boolean default false,

  created_at timestamptz default now(),
  ordered_at timestamptz,

  unique (order_id)  -- ★ 수량 분할 금지 강제
);

create index idx_alloc_ws on allocations(work_session_id);
create index idx_alloc_supplier on allocations(work_session_id, supplier_id);
create index idx_alloc_status on allocations(work_session_id, status);

-- ==========================================
-- 6. tracking_imports
-- ==========================================
create table tracking_imports (
  id uuid primary key default gen_random_uuid(),
  work_session_id uuid not null references work_sessions(id) on delete cascade,
  source_supplier_id uuid not null references suppliers(id),
  file_name text not null,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz default now()
);

create index idx_ti_ws on tracking_imports(work_session_id);

-- ==========================================
-- 7. trackings
-- ==========================================
create table trackings (
  id uuid primary key default gen_random_uuid(),
  work_session_id uuid not null references work_sessions(id) on delete cascade,
  tracking_import_id uuid not null references tracking_imports(id) on delete cascade,
  allocation_id uuid references allocations(id) on delete set null,

  status text not null
    check (status in ('matched', 'unmatched', 'duplicated', 'invalid')),
  invalid_reason text,

  tracking_company text,
  tracking_number text,

  source_supplier_id uuid not null references suppliers(id),
  raw_order_key text,

  raw jsonb not null,
  raw_row_number integer not null,

  uploaded_at timestamptz default now(),
  matched_at timestamptz
);

create index idx_track_ws on trackings(work_session_id);
create index idx_track_alloc on trackings(allocation_id);
create index idx_track_status on trackings(work_session_id, status);

-- ==========================================
-- 8. product_mappings (품목→공급처)
-- ==========================================
create table product_mappings (
  id uuid primary key default gen_random_uuid(),

  platform text not null default 'common'
    check (platform in ('coupang', 'toss', 'common')),
  product_name text not null,
  option_name text not null default '',

  supplier_id uuid not null references suppliers(id) on delete cascade,
  is_default boolean default true,
  priority integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (platform, product_name, option_name, supplier_id)
);

create index idx_pm_lookup on product_mappings(platform, product_name, option_name);

-- ==========================================
-- 9. name_mappings (상품명 변환)
-- ==========================================
create table name_mappings (
  id uuid primary key default gen_random_uuid(),

  platform text not null default 'common'
    check (platform in ('coupang', 'toss', 'common')),
  platform_product_name text not null,
  platform_option_name text not null default '',

  supplier_id uuid not null references suppliers(id) on delete cascade,
  supplier_product_name text not null,
  supplier_product_code text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (platform, platform_product_name, platform_option_name, supplier_id)
);

create index idx_nm_lookup on name_mappings(supplier_id, platform, platform_product_name);

-- ==========================================
-- 10. courier_mappings (택배사 변환)
-- ==========================================
create table courier_mappings (
  id uuid primary key default gen_random_uuid(),

  source_supplier_id uuid not null references suppliers(id) on delete cascade,
  source_name text not null,
  coupang_name text not null,
  toss_name text not null,

  created_at timestamptz default now(),

  unique (source_supplier_id, source_name)
);

-- ==========================================
-- 11. supplier_templates (공급처 발주서 양식)
-- ==========================================
create table supplier_templates (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,

  template_path text not null,       -- Supabase Storage 경로
  template_file_name text not null,
  sheet_name text not null,
  header_row integer not null default 1,
  data_start_row integer not null default 2,

  column_mappings jsonb not null,    -- ColumnMappingItem[]

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (supplier_id)               -- 공급처당 1양식
);

-- ==========================================
-- 12. platform_templates (플랫폼 운송장 양식)
-- ==========================================
create table platform_templates (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique
    check (platform in ('coupang', 'toss')),

  template_path text not null,
  template_file_name text not null,
  sheet_name text not null,
  header_row integer not null,
  data_start_row integer not null,

  match_key_column_index integer not null,
  match_key_column_name text not null,
  tracking_company_column_index integer not null,
  tracking_company_column_name text not null,
  tracking_number_column_index integer not null,
  tracking_number_column_name text not null,

  status_column_index integer,       -- 토스 전용
  status_column_name text,
  status_value text,                 -- 토스: "배송중"

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==========================================
-- updated_at 자동 갱신 트리거
-- ==========================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_suppliers_updated before update on suppliers
  for each row execute function set_updated_at();
create trigger trg_pm_updated before update on product_mappings
  for each row execute function set_updated_at();
create trigger trg_nm_updated before update on name_mappings
  for each row execute function set_updated_at();
create trigger trg_st_updated before update on supplier_templates
  for each row execute function set_updated_at();
create trigger trg_pt_updated before update on platform_templates
  for each row execute function set_updated_at();

-- ==========================================
-- RLS (Row Level Security)
-- 모든 테이블: authenticated 사용자 전체 접근
-- ==========================================
alter table work_sessions enable row level security;
alter table order_imports enable row level security;
alter table orders enable row level security;
alter table allocations enable row level security;
alter table tracking_imports enable row level security;
alter table trackings enable row level security;
alter table suppliers enable row level security;
alter table product_mappings enable row level security;
alter table name_mappings enable row level security;
alter table courier_mappings enable row level security;
alter table supplier_templates enable row level security;
alter table platform_templates enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'work_sessions', 'order_imports', 'orders', 'allocations',
      'tracking_imports', 'trackings', 'suppliers', 'product_mappings',
      'name_mappings', 'courier_mappings', 'supplier_templates', 'platform_templates'
    ])
  loop
    execute format(
      'create policy "auth_all" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end;
$$;

-- ==========================================
-- Storage 버킷 + RLS 정책
-- ==========================================
-- 1. Supabase Dashboard에서 버킷 생성:
--    - 이름: templates
--    - Public: false (Private)
--
-- 2. 아래 SQL로 storage.objects에 정책 적용:
--    (버킷 생성만으로는 부족 — storage.objects RLS 정책이 반드시 필요)

create policy "authenticated can read templates"
on storage.objects
for select
to authenticated
using (bucket_id = 'templates');

create policy "authenticated can upload templates"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'templates');

create policy "authenticated can update templates"
on storage.objects
for update
to authenticated
using (bucket_id = 'templates')
with check (bucket_id = 'templates');

create policy "authenticated can delete templates"
on storage.objects
for delete
to authenticated
using (bucket_id = 'templates');
```

## 마이그레이션 실행 순서
1. 위 SQL 전체를 Supabase SQL Editor에서 실행 (12테이블 + 트리거 + RLS)
2. Dashboard → Storage에서 `templates` 버킷 수동 생성 (Private)
3. SQL Editor에서 storage.objects 정책 4개 적용
4. Auth → Email/Password 활성화 + 테스트 계정 생성
5. 로그인 후 templates 버킷에 테스트 파일 업로드/다운로드 동작 확인

## 주문 테이블 의미

> **`orders` 테이블의 1 row = 플랫폼 주문 1건이 아닌 "주문 라인 1개"** 를 의미한다.
> 토스의 경우 1 주문에 여러 상품(주문 라인)이 들어갈 수 있는데, 이를 각각 별도 row로 저장한다.
>
> 매칭키 규칙:
> - 쿠팡: `matching_key = 주문번호` (쿠팡은 상품마다 주문번호가 따로 발급됨)
> - 토스: `matching_key = 주문상품번호` (1주문 다상품을 구분하기 위함)
>
> 따라서 `unique(work_session_id, platform, matching_key)`는 동일 작업건 내 같은 라인의 중복 업로드를 방지한다.

## 핵심 제약조건 정리
| 제약 | 테이블 | 설명 |
|------|--------|------|
| `unique(order_id)` | allocations | 한 주문 라인은 한 공급처에만 배정 (수량 분할 금지) |
| `unique(work_session_id, platform)` | order_imports | 작업건당 플랫폼별 1파일 |
| `unique(work_session_id, platform, matching_key)` | orders | 주문 라인 중복 업로드 방지 |
| `unique(supplier_id)` | supplier_templates | 공급처당 1양식 |
| `unique(platform)` | platform_templates | 플랫폼당 1양식 |
| `on delete cascade` | order_imports → orders | 재업로드 시 연쇄 삭제 |
| `on delete set null` | trackings.allocation_id | allocation 삭제 시 미매칭 전환 |
