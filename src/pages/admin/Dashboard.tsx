import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Clock, Calendar, DollarSign, ArrowRight, AlertCircle, Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    employee_id: string;
  } | null;
}

export default function AdminDashboard() {
  const { role, user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    totalPayroll: 0,
  });
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleWarning, setRoleWarning] = useState(false);

  useEffect(() => {
    fetchData();
    // Check if role is properly set
    if (user && role !== 'admin') {
      setRoleWarning(true);
    }
  }, [user, role]);

  const fetchData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Fetch total employees (profiles with employee role)
    const { count: employeeCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Fetch present today
    const { count: presentCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)
      .eq('status', 'present');

    // Fetch pending leaves
    const { count: pendingCount } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Fetch pending leave requests with profile info
    const { data: leavesData } = await supabase
      .from('leave_requests')
      .select(`
        *,
        profiles!leave_requests_user_id_fkey (
          full_name,
          employee_id
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch total payroll this month
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const { data: payrollData } = await supabase
      .from('payroll')
      .select('net_salary')
      .eq('month', currentMonth)
      .eq('year', currentYear);

    const totalPayroll = payrollData?.reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0;

    setStats({
      totalEmployees: employeeCount || 0,
      presentToday: presentCount || 0,
      pendingLeaves: pendingCount || 0,
      totalPayroll,
    });

    setPendingLeaves(leavesData as unknown as LeaveRequest[] || []);
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <PageHeader 
        title="Admin Dashboard"
        description={`Welcome back! Today is ${format(new Date(), 'EEEE, MMMM d, yyyy')}`}
      />

      {/* Role Warning Alert */}
      {roleWarning && (
        <Alert variant="destructive" className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertTitle>Admin Role Not Set</AlertTitle>
          <AlertDescription>
            Your account doesn't have admin role set in the database. You won't be able to access admin features.
            <br />
            <strong>To fix this:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Go to Supabase Dashboard → Table Editor → profiles table</li>
              <li>Find your user (by email: {user?.email})</li>
              <li>Set the <code className="bg-muted px-1 rounded">role</code> column to <code className="bg-muted px-1 rounded">admin</code></li>
              <li>Refresh this page and log out/in</li>
            </ol>
            <p className="mt-2 text-sm">
              Or see <code className="bg-muted px-1 rounded">FIX_ADMIN_ROLE.md</code> for detailed instructions.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={<Users size={24} />}
          description="Active users"
          iconClassName="gradient-primary text-white"
        />
        <StatCard
          title="Present Today"
          value={stats.presentToday}
          icon={<Clock size={24} />}
          description={`${stats.totalEmployees ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}% attendance`}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title="Pending Leaves"
          value={stats.pendingLeaves}
          icon={<Calendar size={24} />}
          description="Awaiting approval"
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title="Monthly Payroll"
          value={`$${stats.totalPayroll.toLocaleString()}`}
          icon={<DollarSign size={24} />}
          description={format(new Date(), 'MMMM yyyy')}
          iconClassName="bg-info/10 text-info"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/admin/employees">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:gradient-primary group-hover:text-white transition-all">
                <Users size={24} />
              </div>
              <div className="flex-1">
                <p className="font-medium">Employees</p>
                <p className="text-sm text-muted-foreground">Manage staff</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/attendance">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10 text-success group-hover:gradient-success group-hover:text-white transition-all">
                <Clock size={24} />
              </div>
              <div className="flex-1">
                <p className="font-medium">Attendance</p>
                <p className="text-sm text-muted-foreground">View records</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-success transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/leave-approvals">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white transition-all">
                <Calendar size={24} />
              </div>
              <div className="flex-1">
                <p className="font-medium">Leave Approvals</p>
                <p className="text-sm text-muted-foreground">{stats.pendingLeaves} pending</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-warning transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/payroll">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-info/10 text-info group-hover:bg-info group-hover:text-white transition-all">
                <DollarSign size={24} />
              </div>
              <div className="flex-1">
                <p className="font-medium">Payroll</p>
                <p className="text-sm text-muted-foreground">Manage salaries</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-info transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Leave Requests Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border-2 border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between bg-warning/5">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg">Leave Requests Management</CardTitle>
            </div>
            <Link to="/admin/leave-approvals">
              <Button variant="ghost" size="sm" className="text-warning hover:text-warning hover:bg-warning/10">
                Manage All <ArrowRight size={16} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Review and manage all employee leave requests. Approve or decline requests with comments.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-warning">{stats.pendingLeaves} Pending</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">Accept or Decline</span>
              </div>
            </div>
            {pendingLeaves.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">No pending leave requests</p>
                <Link to="/admin/leave-approvals">
                  <Button variant="outline" size="sm">View All Leaves</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLeaves.slice(0, 3).map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{leave.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {leave.profiles?.employee_id} • {leave.leave_type} • {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d')}
                      </p>
                    </div>
                    <Link to="/admin/leave-approvals">
                      <Button size="sm" variant="outline">Review</Button>
                    </Link>
                  </div>
                ))}
                {pendingLeaves.length > 3 && (
                  <Link to="/admin/leave-approvals">
                    <Button variant="ghost" size="sm" className="w-full">
                      View {pendingLeaves.length - 3} more requests <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll Management Section */}
        <Card className="border-2 border-info/20">
          <CardHeader className="flex flex-row items-center justify-between bg-info/5">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-info" />
              <CardTitle className="text-lg">Payroll Management</CardTitle>
            </div>
            <Link to="/admin/payroll">
              <Button variant="ghost" size="sm" className="text-info hover:text-info hover:bg-info/10">
                Manage All <ArrowRight size={16} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Add or edit payroll records for any employee. Manage salaries, allowances, and deductions.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-info">${stats.totalPayroll.toLocaleString()}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">This Month</span>
              </div>
            </div>
            <div className="space-y-3">
              <Link to="/admin/payroll">
                <Button className="w-full gradient-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Payroll
                </Button>
              </Link>
              <Link to="/admin/payroll">
                <Button variant="outline" className="w-full">
                  <DollarSign className="mr-2 h-4 w-4" />
                  View All Payroll Records
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
