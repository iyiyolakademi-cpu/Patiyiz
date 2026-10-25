-- 13. Sağlık Dosyası: owner-only metadata update, no public document access.
-- Existing rows, private storage policies and object files remain unchanged.
drop policy if exists health_documents_update_owner_pet on public.patiyiz_health_documents;
create policy health_documents_update_owner_pet
on public.patiyiz_health_documents
for update to authenticated
using (owner_id = (select auth.uid()))
with check (
 owner_id = (select auth.uid())
 and exists (
  select 1 from public.pets p
  where p.id = patiyiz_health_documents.pet_id
    and p.owner_id = (select auth.uid())
 )
 and (
  object_path is null
  or object_path like (owner_id::text || '/' || pet_id::text || '/%')
 )
);
