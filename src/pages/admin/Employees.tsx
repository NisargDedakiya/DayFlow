import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Users, Shield, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
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
  role?: 'admin' | 'employee';
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

  const handleRoleUpdate = async (userId: string, newRole: 'admin' | 'employee') => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = (sessionData as any)?.session?.access_token;
      if (!accessToken) {
        throw new Error('No access token available. Please re-login.');
      }

      const resp = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });

      if (!resp.ok) {
        let errorMessage = 'Failed to update role';
        try {
          const errData = await resp.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          const errText = await resp.text();
          errorMessage = errText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: 'Success',
        description: `Role updated to ${newRole}`,
      });
      fetchEmployees();
    } catch (err: any) {
      console.error('Update role failed', err);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeIdInput || !fullNameInput || !emailInput) {
      toast({ title: 'Validation', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    setCreating(true);

    try {
      // Use relative API path; Vite proxy forwards /api to the backend server in development
      const apiPath = '/api/admin/add-employee';

      // get current session's access token to authenticate the request
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = (sessionData as any)?.session?.access_token || '';
      if (!accessToken) {
        throw new Error('No access token available. Please re-login.');
      }

      const resp = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          employee_id: employeeIdInput,
          full_name: fullNameInput,
          email: emailInput,
          department: departmentInput || null,
          designation: designationInput || null,
          salary: salaryInput || null,
          // optional: allow admin to provide a temp password
          password: tempPassword || undefined,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || 'Create employee request failed');
      }

      const body = await resp.json();
      const userId = body.userId;
      const returnedTemp = body.tempPassword;

      if (userId) {
        // Try to update profile meta (best-effort)
        try {
          await supabase.from('profiles').update({
            department: departmentInput || null,
            designation: designationInput || null,
            salary: salaryInput || null,
            is_first_login: true,
          }).eq('id', userId);
        } catch (pErr) {
          console.error('Failed to update profile after server create:', pErr);
        }

        // Inform admin of temp password if returned
        toast({ title: 'Employee created', description: returnedTemp ? `Temporary password: ${returnedTemp}` : 'Employee created', });

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
        throw new Error('No user id returned from server');
      }
    } catch (err: any) {
      console.error('Create employee failed', err);
      toast({ title: 'Error', description: err?.message || 'Failed to create employee', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
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
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.employee_id}</TableCell>
                    <TableCell>{emp.full_name || '-'}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>
                      <Select
                        value={emp.role || 'employee'}
                        onValueChange={(value: 'admin' | 'employee') => handleRoleUpdate(emp.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Employee
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Admin
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
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
