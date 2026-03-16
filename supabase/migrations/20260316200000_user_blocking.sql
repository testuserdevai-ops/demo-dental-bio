-- Add is_blocked column to users table for account-level blocking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);

-- Index for quick lookup of blocked users
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON public.users(is_blocked) WHERE is_blocked = TRUE;
