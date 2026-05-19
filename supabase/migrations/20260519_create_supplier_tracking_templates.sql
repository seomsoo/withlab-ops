create table supplier_tracking_templates (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  sheet_name text not null default '',
  header_row int not null default 1,
  data_start_row int not null default 2,
  order_key_column int not null,
  order_key_header text not null,
  tracking_number_column int not null,
  tracking_number_header text not null,
  courier_column int,
  courier_header text,
  default_courier text,
  product_name_column int,
  product_name_header text,
  recipient_column int,
  recipient_header text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(supplier_id)
);

alter table supplier_tracking_templates enable row level security;

create policy "Allow all for authenticated users"
  on supplier_tracking_templates
  for all
  to authenticated
  using (true)
  with check (true);
