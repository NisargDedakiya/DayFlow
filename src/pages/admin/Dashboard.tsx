import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Clock, Calendar, DollarSign, ArrowRight, AlertCircle } from 'lucide-react';
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
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    totalPayroll: 0,
  });
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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

      {/* Pending Leave Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
          </div>
          <Link to="/admin/leave-approvals">
            <Button variant="ghost" size="sm">
              View All <ArrowRight size={16} className="ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {pendingLeaves.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending leave requests</p>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{leave.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {leave.profiles?.employee_id} • {leave.leave_type} leave
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <StatusBadge status="pending" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
