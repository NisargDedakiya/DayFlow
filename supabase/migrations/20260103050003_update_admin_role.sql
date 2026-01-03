-- Utility script to update a user's role to admin
-- Replace 'USER_EMAIL_HERE' with the actual admin user's email

-- Example: Update role for a specific user by email
-- UPDATE public.profiles 
-- SET role = 'admin'
-- WHERE email = 'admin@example.com';

-- Or update by user ID (get the ID from auth.users table)
-- UPDATE public.profiles 
-- SET role = 'admin'
-- WHERE id = 'USER_UUID_HERE';

-- To check current roles:
-- SELECT id, email, full_name, role FROM public.profiles;

