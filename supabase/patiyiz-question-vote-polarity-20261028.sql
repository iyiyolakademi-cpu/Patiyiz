-- 2026-10-28: community questions support both positive and negative feedback.
-- Existing question_votes are preserved as helpful.
ALTER TABLE public.question_votes ADD COLUMN IF NOT EXISTS is_helpful boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.question_votes.is_helpful IS 'true for helpful, false for not helpful. Existing votes remain helpful.';
-- Existing votes_select / votes_insert / votes_delete RLS policies remain in place.
