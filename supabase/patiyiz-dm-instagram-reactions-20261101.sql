-- Extend existing, participant-only DM reactions with Instagram-style angry and thumbs-up emoji.
-- Does not alter RLS, ownership, sender/receiver restrictions, or existing rows.
alter table public.patiyiz_dm_reactions drop constraint if exists patiyiz_dm_reactions_emoji_check;
alter table public.patiyiz_dm_reactions add constraint patiyiz_dm_reactions_emoji_check
 check (emoji in ('❤️','😂','😮','😢','😡','👍','👏','🐾'));
