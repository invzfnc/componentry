create table if not exists public.catalog (
  id uuid not null default gen_random_uuid(),
  part_name text not null,
  category text not null,
  sku text not null,
  price numeric(10, 2) not null default 0.00,
  stock_level integer not null default 0,
  icon text null default 'hardware'::text,
  specs jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint catalog_pkey primary key (id),
  constraint catalog_sku_key unique (sku)
);

create index if not exists catalog_category_idx on public.catalog (category);
create index if not exists catalog_specs_gin_idx on public.catalog using gin (specs);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists catalog_set_updated_at on public.catalog;
create trigger catalog_set_updated_at
before update on public.catalog
for each row
execute function public.set_updated_at();
