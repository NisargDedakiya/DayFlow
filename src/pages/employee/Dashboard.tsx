import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Clock, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [stats, setStats] = useState({
    presentDays: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .maybeSingle();
    setProfile(profileData);

    // Fetch recent leave requests
    const { data: leavesData } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(3);
    setRecentLeaves(leavesData || []);

    // Fetch today's attendance
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user?.id)
      .eq('date', today)
      .maybeSingle();
    setTodayAttendance(attendanceData);

    // Fetch stats
    const { count: presentCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('status', 'present');

    const { count: pendingCount } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('status', 'pending');

    const { count: approvedCount } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('status', 'approved');

    setStats({
      presentDays: presentCount || 0,
      pendingLeaves: pendingCount || 0,
      approvedLeaves: approvedCount || 0,
    });
  };

  return (
    <DashboardLayout>
      <PageHeader 
        title={`Welcome, ${profile?.full_name || 'Employee'}!`}
        description={`Employee ID: ${profile?.employee_id || 'N/A'} • ${format(new Date(), 'EEEE, MMMM d, yyyy')}`}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Today's Status"
          value={todayAttendance ? 'Checked In' : 'Not Checked In'}
          icon={<Clock size={24} />}
          description={todayAttendance?.check_in ? `At ${format(new Date(todayAttendance.check_in), 'h:mm a')}` : 'Click to check in'}
          iconClassName="bg-info/10 text-info"
        />
        <StatCard
          title="Present Days"
          value={stats.presentDays}
          icon={<Calendar size={24} />}
          description="This month"
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
          title="Approved Leaves"
          value={stats.approvedLeaves}
          icon={<Calendar size={24} />}
          description="This year"
          iconClassName="bg-accent/10 text-accent"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/employee/profile">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:gradient-primary group-hover:text-white transition-all">
                <User size={24} />
              </div>
              <div className="flex-1">
                <p className="font-medium">My Profile</p>
                <p className="text-sm text-muted-foreground">View & edit</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/employee/attendance">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10 text-success group-hover:gradient-success group-hover:text-white transition-all">
                <Clock size={24} />
              </div>
              <div className="flex-1">
                <p className="font-medium">Attendance</p>
                <p className="text-sm text-muted-foreground">Check in/out</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-success transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/employee/leave">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white transition-all">
                <Calendar size={24} />
              </div>
              <div className="flex-1">
                <p className="font-medium">Leave Requests</p>
                <p className="text-sm text-muted-foreground">Apply & track</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-warning transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/employee/payroll">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-info/10 text-info group-hover:bg-info group-hover:text-white transition-all">
                <DollarSign size={24} />
              </div>
              <div className="flex-1">
                <p className="font-medium">Payroll</p>
                <p className="text-sm text-muted-foreground">View salary</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-info transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Leave Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Leave Requests</CardTitle>
          <Link to="/employee/leave">
            <Button variant="ghost" size="sm">
              View All <ArrowRight size={16} className="ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentLeaves.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No leave requests yet</p>
          ) : (
            <div className="space-y-4">
              {recentLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{leave.leave_type} Leave</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <StatusBadge status={leave.status as any} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
