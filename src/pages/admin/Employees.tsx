import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Employee {
  id: string;
  employee_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  date_of_joining: string | null;
}

export default function AdminEmployees() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [designationInput, setDesignationInput] = useState('');
  const [salaryInput, setSalaryInput] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch employees',
        variant: 'destructive',
      });
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeIdInput || !fullNameInput || !emailInput || !tempPassword) {
      toast({ title: 'Validation', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    setCreating(true);

    // Create auth user via signUp (admin action)
    const { data, error } = await supabase.auth.signUp({
      email: emailInput,
      password: tempPassword,
      options: {
        data: {
          employee_id: employeeIdInput,
          full_name: fullNameInput,
          role: 'employee',
        },
      },
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setCreating(false);
      return;
    }

    const userId = data?.user?.id;
    if (userId) {
      // Update profile fields that the DB trigger may have created on auth.user insert
      const { error: pError } = await supabase.from('profiles').update({
        department: departmentInput || null,
        designation: designationInput || null,
        salary: salaryInput || null,
        // set is_first_login if column exists
        is_first_login: true,
      }).eq('id', userId);
      if (pError) {
        // If update fails (maybe columns don't exist), log but continue
        console.error('Failed to update profile after signup:', pError);
      }

      // Insert notification for the new user (best-effort)
      try {
        await supabase.from('notifications').insert([{ user_id: userId, title: 'Welcome to DayFlow', message: 'Your account has been created. Please change your password on first login.', read: false }]);
      } catch (nErr) {
        console.error('Notification insert failed', nErr);
      }

      // Insert audit log (best-effort)
      try {
        await supabase.from('audit_logs').insert([{ action: 'create_employee', performed_by: user?.id || null, target_user_id: userId, details: { employee_id: employeeIdInput, full_name: fullNameInput, email: emailInput } }]);
      } catch (aErr) {
        console.error('Audit log insert failed', aErr);
      }

      toast({ title: 'Employee created', description: 'An email with temporary password was sent' });
      // clear form
      setEmployeeIdInput('');
      setFullNameInput('');
      setEmailInput('');
      setTempPassword('');
      setDepartmentInput('');
      setDesignationInput('');
      setSalaryInput('');
      fetchEmployees();
    } else {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' });
    }

    setCreating(false);
  };

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = search.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(searchLower) ||
      emp.employee_id.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      emp.department?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader 
        title="Employees"
        description="View and manage all employees"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <div className="p-3 rounded-lg gradient-primary">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Create Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Input placeholder="Employee ID" value={employeeIdInput} onChange={(e) => setEmployeeIdInput(e.target.value)} />
            <Input placeholder="Full name" value={fullNameInput} onChange={(e) => setFullNameInput(e.target.value)} />
            <Input placeholder="Email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
            <Input placeholder="Temporary password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} />
            <Input placeholder="Department" value={departmentInput} onChange={(e) => setDepartmentInput(e.target.value)} />
            <Input placeholder="Designation" value={designationInput} onChange={(e) => setDesignationInput(e.target.value)} />
            <Input placeholder="Salary" value={salaryInput} onChange={(e) => setSalaryInput(e.target.value)} />
            <div className="sm:col-span-2">
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Employee'}</button>
            </div>
          </form>
        </CardContent>

        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">All Employees</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.employee_id}</TableCell>
                    <TableCell>{emp.full_name || '-'}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{emp.department || '-'}</TableCell>
                    <TableCell>{emp.designation || '-'}</TableCell>
                    <TableCell>
                      {emp.date_of_joining 
                        ? format(new Date(emp.date_of_joining), 'MMM d, yyyy') 
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
