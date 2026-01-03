# Fix Admin Role Access Issue

If you're logged in as an admin but don't have access to edit payroll and leave applications, your profile's role might not be set to 'admin' in the database.

## Quick Fix Options:

### Option 1: Update via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor** → **profiles** table
3. Find your user record (by email)
4. Edit the `role` column and set it to `admin`
5. Save the changes
6. Refresh your browser and log out/in again

### Option 2: Run SQL Query

Run this SQL in your Supabase SQL Editor:

```sql
-- Replace 'your-email@example.com' with your actual admin email
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Option 3: Use the Employees Page (If you have another admin)

1. Have another admin user log in
2. Go to **Admin** → **Employees**
3. Find your user in the list
4. Change the **Role** dropdown from "Employee" to "Admin"
5. The role will be updated automatically

### Option 4: Direct Database Update via Service Role

If you have access to the backend server, you can temporarily add this endpoint or run a direct database update using the service role key.

## Verify the Fix

After updating:
1. Log out and log back in
2. Check that you can access:
   - `/admin/leave-approvals` - Should show all leave requests
   - `/admin/payroll` - Should allow adding/editing payroll
3. The sidebar should show all admin menu items

## Check Current Role

To check your current role, run this SQL:

```sql
SELECT id, email, full_name, role 
FROM public.profiles 
WHERE email = 'your-email@example.com';
```

If `role` is `NULL` or `employee`, that's the issue. Update it to `admin`.

