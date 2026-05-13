alter table fruit_dictionary
  add column weight_mapping jsonb not null default '{}';
