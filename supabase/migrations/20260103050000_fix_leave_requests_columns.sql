-- Ensure leave_requests table has the correct columns: admin_comment and approved_by
-- This migration adds these columns if they don't exist, or renames existing ones

-- Add admin_comment column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'admin_comment'
  ) THEN
    -- If admin_comments exists, rename it; otherwise add new column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'leave_requests' AND column_name = 'admin_comments'
    ) THEN
      ALTER TABLE public.leave_requests RENAME COLUMN admin_comments TO admin_comment;
    ELSE
      ALTER TABLE public.leave_requests ADD COLUMN admin_comment TEXT;
    END IF;
  END IF;
END $$;

-- Add approved_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_requests' AND column_name = 'approved_by'
  ) THEN
    -- If reviewed_by exists, rename it; otherwise add new column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'leave_requests' AND column_name = 'reviewed_by'
    ) THEN
      ALTER TABLE public.leave_requests RENAME COLUMN reviewed_by TO approved_by;
    ELSE
      ALTER TABLE public.leave_requests ADD COLUMN approved_by UUID REFERENCES auth.users(id);
    END IF;
  END IF;
END $$;

