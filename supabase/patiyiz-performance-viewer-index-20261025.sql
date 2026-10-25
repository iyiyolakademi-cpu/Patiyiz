-- Patiyiz performance phase 2, 25 October 2026.
-- The existing unique (post_id, viewer_id) index does not support
-- foreign-key lookups where the first indexed column is viewer_id.
-- This non-unique index improves account deletion and viewer-scoped queries.
create index if not exists patiyiz_post_view_events_viewer_idx
 on public.patiyiz_post_view_events (viewer_id);
