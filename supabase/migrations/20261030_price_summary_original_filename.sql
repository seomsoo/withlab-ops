alter table public.order_imports add column if not exists original_file_name text;
-- Legacy combined names cannot be recovered unambiguously; leave those for review.
update public.order_imports set original_file_name = file_name
where original_file_name is null and position(' + ' in file_name) = 0;
create or replace function public.preserve_order_import_filename()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    NEW.original_file_name := NEW.file_name;
  elsif OLD.original_file_name is not null then
    NEW.original_file_name := OLD.original_file_name;
  end if;
  return NEW;
end;
$$;
create trigger preserve_order_import_filename before insert or update on public.order_imports
for each row execute function public.preserve_order_import_filename();
