-- Patiler directory: efficient newest-first paging and owner-specific lists.
-- No rows or RLS policies are changed.
create index if not exists patiyiz_pets_directory_recent_idx
 on public.pets (created_at desc, id desc);
create index if not exists patiyiz_pets_owner_recent_idx
 on public.pets (owner_id, created_at desc);
