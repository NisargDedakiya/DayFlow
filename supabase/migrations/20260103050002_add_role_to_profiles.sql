-- Add role column to profiles table if it doesn't exist
-- This aligns with the requirement to use profiles.role instead of user_roles table

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role app_role DEFAULT 'employee';
    
    -- Migrate existing roles from user_roles table if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'user_roles'
    ) THEN
      UPDATE public.profiles p
      SET role = ur.role
      FROM public.user_roles ur
      WHERE p.id = ur.user_id
      AND ur.role IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Ensure role column has NOT NULL constraint after migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role' AND is_nullable = 'YES'
  ) THEN
    -- Set default for any null values
    UPDATE public.profiles SET role = 'employee' WHERE role IS NULL;
    -- Make it NOT NULL
    ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'employee';
  END IF;
END $$;

