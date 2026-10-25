-- Patiyiz account deletion safety, 25 October 2026.
-- A retired founder-course record cannot hold an otherwise-deletable auth user hostage.
-- Former user-authored courses are personal content; remove them with their owner.
-- Admin announcement / moderation FKs deliberately remain NO ACTION: admins are
-- forbidden to self-delete and moderation audit records must be retained.
alter table public.founder_courses
  drop constraint if exists founder_courses_author_id_fkey;
alter table public.founder_courses
  add constraint founder_courses_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete cascade;
