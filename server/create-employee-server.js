import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET; // simple shared secret for dev

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function generateTempPassword() {
  return Math.random().toString(36).slice(-10) + 'A1!';
}

app.post('/api/admin/add-employee', async (req, res) => {
  try {
    // Authenticate caller via Bearer token (must be logged-in admin)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      console.error('Missing Authorization header');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.toString().split(' ')[1];

    // Get user from access token
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('Failed to validate access token', userErr?.message || userErr);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const requesterId = userData.user.id;

    // Verify requester has admin role via profiles.role
    const { data: profileRow, error: profileErr } = await supabase.from('profiles').select('role').eq('id', requesterId).maybeSingle();
    if (profileErr) {
      console.error('Failed to fetch profile for role check', profileErr.message || profileErr);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
    if (!profileRow || profileRow.role !== 'admin') {
      console.warn('Unauthorized role attempted to create employee', { requesterId, role: profileRow?.role });
      return res.status(403).json({ error: 'Forbidden: admin role required' });
    }

    const { employee_id, full_name, email, department, designation, basic_salary, phone } = req.body;
    if (!employee_id || !full_name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // check duplicates
    const { data: existingByEmployee, error: err1 } = await supabase.from('profiles').select('id').eq('employee_id', employee_id).maybeSingle();
    if (err1) return res.status(500).json({ error: err1.message });
    if (existingByEmployee) return res.status(409).json({ error: 'Employee ID already exists' });

    const { data: existingByEmail } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
    if (existingByEmail) return res.status(409).json({ error: 'Email already exists' });

    const tempPassword = generateTempPassword();

    // create user in supabase auth via service role
    const { data: userDataCreated, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { employee_id, full_name, role: 'employee' },
    });
    if (createErr) return res.status(500).json({ error: createErr.message });

    const userId = userDataCreated?.user?.id;
    if (!userId) return res.status(500).json({ error: 'Failed to create auth user' });

    // insert profile
    const { error: pErr } = await supabase.from('profiles').insert([
      {
        id: userId,
        employee_id,
        full_name,
        email,
        department: department || null,
        designation: designation || null,
        basic_salary: basic_salary || null,
        phone: phone || null,
      },
    ]);
    if (pErr) {
      console.error('Profile insert error', pErr.message || pErr);
    }

    // do not use user_roles table; roles are tracked in profiles

    // insert audit log and notification (best-effort)
    try {
      await supabase.from('audit_logs').insert([{ action: 'create_employee', performed_by: requesterId, target_user_id: userId, details: { employee_id, full_name, email } }]);
      await supabase.from('notifications').insert([{ user_id: userId, title: 'Account created', message: 'Your account was created. Use the temporary password provided by HR.', read: false }]);
    } catch (e) {
      console.error('audit/notification insert failed', e?.message || e);
    }

    return res.json({ userId, tempPassword });
  } catch (e) {
    console.error('Create employee endpoint error', e?.stack || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: approve/reject leave requests
app.post('/api/admin/leave-action', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      console.error('Missing Authorization header on leave-action');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.toString().split(' ')[1];
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('Failed to validate token on leave-action', userErr?.message || userErr);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const adminId = userData.user.id;
    const { data: profileRow, error: profileErr } = await supabase.from('profiles').select('role').eq('id', adminId).maybeSingle();
    if (profileErr) {
      console.error('Failed to fetch profile for role check on leave-action', profileErr.message || profileErr);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
    if (!profileRow || profileRow.role !== 'admin') {
      console.warn('Non-admin attempted leave action', { adminId, role: profileRow?.role });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { leave_id, action, admin_comment } = req.body;
    if (!leave_id || !action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Update leave request with status, admin_comments (DB column), and reviewed_by (DB column)
    const updatePayload = {
      status: action,
      admin_comments: admin_comment || null,
      reviewed_by: adminId
    };

    // Perform update using service role
    const { data: updated, error: updErr } = await supabase
      .from('leave_requests')
      .update(updatePayload)
      .eq('id', leave_id)
      .select()
      .maybeSingle();
    
    if (updErr) {
      console.error('Failed to update leave request', updErr.message || updErr);
      return res.status(500).json({ error: 'Failed to update leave request' });
    }

    if (!updated) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // Insert notification for the employee
    try {
      await supabase
        .from('notifications')
        .insert([{ user_id: updated.user_id, title: `Leave ${action === 'approved' ? 'Approved' : 'Rejected'}`, message: `Your leave request has been ${action}.${admin_comment ? ` Admin comment: ${admin_comment}` : ''}`, read: false }]);
    } catch (nErr) {
      console.error('Failed to insert notification on leave-action', nErr?.message || nErr);
    }

    // Insert audit log
    try {
      const actionLabel = action === 'approved' ? 'Leave Approved' : 'Leave Rejected';
      await supabase
        .from('audit_logs')
        .insert([{ action: actionLabel, performed_by: adminId, target_user_id: updated.user_id, details: { leave_id, admin_comment: admin_comment || null } }]);
    } catch (aErr) {
      console.error('Failed to insert audit log on leave-action', aErr?.message || aErr);
    }

    return res.json({ success: true, leave: updated });
  } catch (e) {
    console.error('leave-action endpoint error', e?.stack || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Admin: fetch all leave requests (server-side, validates admin via profiles.role)
app.get('/api/admin/leaves', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      console.error('Missing Authorization header on admin/leaves');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.toString().split(' ')[1];
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('Failed to validate token on admin/leaves', userErr?.message || userErr);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const adminId = userData.user.id;
    // Verify role via profiles
    const { data: profileRow, error: profileErr } = await supabase.from('profiles').select('role').eq('id', adminId).maybeSingle();
    if (profileErr) {
      console.error('Failed to fetch profile for role check on admin/leaves', profileErr.message || profileErr);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
    if (!profileRow || profileRow.role !== 'admin') {
      console.warn('Non-admin attempted to fetch all leaves', { adminId, role: profileRow?.role });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch all leave requests with profile join (employee name/id)
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, profiles!leave_requests_user_id_fkey (full_name, employee_id)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch leave requests', error.message || error);
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }

    // Return data as-is (using correct columns: admin_comment, approved_by)
    return res.json({ data: data || [] });
  } catch (e) {
    console.error('admin/leaves endpoint error', e?.stack || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: create/update payroll
app.post('/api/admin/payroll', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      console.error('Missing Authorization header on payroll');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.toString().split(' ')[1];
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('Failed to validate token on payroll', userErr?.message || userErr);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const adminId = userData.user.id;
    const { data: profileRow, error: profileErr } = await supabase.from('profiles').select('role').eq('id', adminId).maybeSingle();
    if (profileErr) {
      console.error('Failed to fetch profile for role check on payroll', profileErr.message || profileErr);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
    if (!profileRow || profileRow.role !== 'admin') {
      console.warn('Non-admin attempted payroll action', { adminId, role: profileRow?.role });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { user_id, month, year, basic_salary, allowances = 0, deductions = 0 } = req.body;
    if (!user_id || !month || !year || typeof basic_salary === 'undefined') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // find bonus sum for the period (best-effort: bonuses table may have month/year)
    let bonusSum = 0;
    try {
      const { data: bonusData, error: bonusErr } = await supabase.from('bonuses').select('amount').eq('user_id', user_id).eq('month', month).eq('year', year);
      if (!bonusErr && bonusData) {
        bonusSum = bonusData.reduce((s, b) => s + (b.amount || 0), 0);
      }
    } catch (bErr) {
      console.warn('Bonus sum query failed, defaulting to 0', bErr?.message || bErr);
    }

    // compute net salary locally for audit/logging, but do not attempt to set generated columns in DB
    const computedNet = (parseFloat(basic_salary) || 0) + (parseFloat(allowances) || 0) + (bonusSum || 0) - (parseFloat(deductions) || 0);

    // ensure one payroll per employee per month
    const { data: existing, error: existsErr } = await supabase.from('payroll').select('*').eq('user_id', user_id).eq('month', month).eq('year', year).maybeSingle();
    if (existsErr) {
      console.error('Failed to check existing payroll', existsErr.message || existsErr);
      return res.status(500).json({ error: 'Failed to check existing payroll' });
    }

    let payrollRecord;
    if (existing) {
      // Update only writable columns; do not set generated net_salary or non-existent bonus_amount column
      const { data: updated, error: updErr } = await supabase.from('payroll').update({ basic_salary, allowances, deductions }).eq('id', existing.id).select().maybeSingle();
      if (updErr) {
        console.error('Failed to update payroll', updErr.message || updErr);
        return res.status(500).json({ error: 'Failed to update payroll' });
      }
      payrollRecord = updated;
      try { await supabase.from('audit_logs').insert([{ action: 'Payroll Updated', performed_by: adminId, target_user_id: user_id, details: { payroll_id: updated.id, month, year, computedNet } }]); } catch (aErr) { console.error('Audit insert failed', aErr?.message || aErr); }
    } else {
      const { data: created, error: createErr } = await supabase.from('payroll').insert([{ user_id, month, year, basic_salary, allowances, deductions }]).select().maybeSingle();
      if (createErr) {
        console.error('Failed to create payroll', createErr.message || createErr);
        return res.status(500).json({ error: 'Failed to create payroll' });
      }
      payrollRecord = created;
      try { await supabase.from('audit_logs').insert([{ action: 'Payroll Created', performed_by: adminId, target_user_id: user_id, details: { payroll_id: created.id, month, year, computedNet } }]); } catch (aErr) { console.error('Audit insert failed', aErr?.message || aErr); }
    }

    // notify employee
    try { await supabase.from('notifications').insert([{ user_id, title: 'Payroll Updated', message: `Payroll for ${month}/${year} has been processed.`, read: false }]); } catch (nErr) { console.error('Notification insert failed', nErr?.message || nErr); }

    return res.json({ success: true, payroll: payrollRecord });
  } catch (e) {
    console.error('payroll endpoint error', e?.stack || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: fetch all payroll records (service-role, admin-validated)
app.get('/api/admin/payrolls', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      console.error('Missing Authorization header on admin/payrolls');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.toString().split(' ')[1];
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('Failed to validate token on admin/payrolls', userErr?.message || userErr);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const adminId = userData.user.id;
    const { data: profileRow, error: profileErr } = await supabase.from('profiles').select('role').eq('id', adminId).maybeSingle();
    if (profileErr) {
      console.error('Failed to fetch profile for role check on payrolls', profileErr.message || profileErr);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
    if (!profileRow || profileRow.role !== 'admin') {
      console.warn('Non-admin attempted to fetch payrolls', { adminId, role: profileRow?.role });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabase.from('payroll').select('*, profiles!payroll_user_id_fkey (full_name, employee_id)').order('year', { ascending: false }).order('month', { ascending: false });
    if (error) {
      console.error('Failed to fetch payrolls', error.message || error);
      return res.status(500).json({ error: 'Failed to fetch payrolls' });
    }
    return res.json({ data: data || [] });
  } catch (e) {
    console.error('admin/payrolls endpoint error', e?.stack || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: fetch all profiles (for employee selection)
app.get('/api/admin/profiles', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      console.error('Missing Authorization header on admin/profiles');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.toString().split(' ')[1];
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('Failed to validate token on admin/profiles', userErr?.message || userErr);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const adminId = userData.user.id;
    const { data: profileRow, error: profileErr } = await supabase.from('profiles').select('role').eq('id', adminId).maybeSingle();
    if (profileErr) {
      console.error('Failed to fetch profile for role check on profiles', profileErr.message || profileErr);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
    if (!profileRow || profileRow.role !== 'admin') {
      console.warn('Non-admin attempted to fetch profiles', { adminId, role: profileRow?.role });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabase.from('profiles').select('id, full_name, employee_id');
    if (error) {
      console.error('Failed to fetch profiles', error.message || error);
      return res.status(500).json({ error: 'Failed to fetch profiles' });
    }
    return res.json({ data: data || [] });
  } catch (e) {
    console.error('admin/profiles endpoint error', e?.stack || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: fetch attendance for a date
app.get('/api/admin/attendance', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      console.error('Missing Authorization header on attendance');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.toString().split(' ')[1];
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('Failed to validate token on attendance', userErr?.message || userErr);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const adminId = userData.user.id;
    const { data: profileRow, error: profileErr } = await supabase.from('profiles').select('role').eq('id', adminId).maybeSingle();
    if (profileErr) {
      console.error('Failed to fetch profile for role check on attendance', profileErr.message || profileErr);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
    if (!profileRow || profileRow.role !== 'admin') {
      console.warn('Non-admin attempted attendance view', { adminId, role: profileRow?.role });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const date = req.query.date;
    if (!date) return res.status(400).json({ error: 'Missing date query param' });

    const { data, error } = await supabase.from('attendance').select(`*, profiles!attendance_user_id_fkey (full_name, employee_id)`).eq('date', date).order('check_in', { ascending: false });
    if (error) {
      console.error('Failed to fetch attendance', error.message || error);
      return res.status(500).json({ error: 'Failed to fetch attendance' });
    }
    return res.json({ data });
  } catch (e) {
    console.error('attendance endpoint error', e?.stack || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: create a notification (simple utility)
app.post('/api/admin/notifications', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      console.error('Missing Authorization header on notifications');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.toString().split(' ')[1];
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('Failed to validate token on notifications', userErr?.message || userErr);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const adminId = userData.user.id;
    const { data: profileRow, error: profileErr } = await supabase.from('profiles').select('role').eq('id', adminId).maybeSingle();
    if (profileErr) {
      console.error('Failed to fetch profile for role check on notifications', profileErr.message || profileErr);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
    if (!profileRow || profileRow.role !== 'admin') {
      console.warn('Non-admin attempted notification create', { adminId, role: profileRow?.role });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { user_id, title, message } = req.body;
    if (!user_id || !title || !message) return res.status(400).json({ error: 'Missing fields' });

    const { error } = await supabase.from('notifications').insert([{ user_id, title, message }]);
    if (error) {
      console.error('Failed to create notification', error.message || error);
      return res.status(500).json({ error: 'Failed to create notification' });
    }
    return res.json({ success: true });
  } catch (e) {
    console.error('notifications endpoint error', e?.stack || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: update user role
app.post('/api/admin/update-role', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      console.error('Missing Authorization header on update-role');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = authHeader.toString().split(' ')[1];
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error('Failed to validate token on update-role', userErr?.message || userErr);
      return res.status(401).json({ error: 'Invalid token' });
    }
    const adminId = userData.user.id;
    const { data: profileRow, error: profileErr } = await supabase.from('profiles').select('role').eq('id', adminId).maybeSingle();
    if (profileErr) {
      console.error('Failed to fetch profile for role check on update-role', profileErr.message || profileErr);
      return res.status(500).json({ error: 'Failed to verify role' });
    }
    if (!profileRow || profileRow.role !== 'admin') {
      console.warn('Non-admin attempted to update role', { adminId, role: profileRow?.role });
      return res.status(403).json({ error: 'Forbidden: admin role required' });
    }

    const { user_id, role } = req.body;
    if (!user_id || !role || !['admin', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid payload: user_id and role (admin/employee) required' });
    }

    // Update role in profiles table
    const { data: updated, error: updErr } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user_id)
      .select()
      .maybeSingle();

    if (updErr) {
      console.error('Failed to update role', updErr.message || updErr);
      return res.status(500).json({ error: 'Failed to update role' });
    }

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Insert audit log
    try {
      await supabase
        .from('audit_logs')
        .insert([{
          action: 'Role Updated',
          performed_by: adminId,
          target_user_id: user_id,
          details: { new_role: role }
        }]);
    } catch (aErr) {
      console.error('Failed to insert audit log on update-role', aErr?.message || aErr);
    }

    return res.json({ success: true, profile: updated });
  } catch (e) {
    console.error('update-role endpoint error', e?.stack || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Create-employee server running on port ${PORT}`);
});
