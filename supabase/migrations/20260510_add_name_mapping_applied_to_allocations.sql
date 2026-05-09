alter table allocations
  add column if not exists name_mapping_applied boolean not null default false;
