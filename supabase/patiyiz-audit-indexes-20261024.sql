-- 2026-10-24: performance fix, applied to the existing live Patiyiz project.
-- These indexes cover administrative audit foreign keys without altering data.
create index if not exists patiyiz_reward_fulfillment_events_actor_idx
  on public.patiyiz_reward_fulfillment_events(actor_id);
create index if not exists patiyiz_reward_inventory_events_actor_idx
  on public.patiyiz_reward_inventory_events(actor_id);
