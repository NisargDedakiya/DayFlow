import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, LogOut, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

export default function EmployeeAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [weeklyRecords, setWeeklyRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (user) {
      fetchAttendance();
    }
  }, [user]);

  const fetchAttendance = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

    // Fetch today's record
    const { data: todayData } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user?.id)
      .eq('date', today)
      .maybeSingle();
    setTodayRecord(todayData);

    // Fetch weekly records
    const { data: weeklyData } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user?.id)
      .gte('date', weekStart)
      .lte('date', weekEnd)
      .order('date', { ascending: false });
    setWeeklyRecords(weeklyData || []);

    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!user) return;

    setCheckingIn(true);
    const now = new Date().toISOString();
    const today = format(new Date(), 'yyyy-MM-dd');

    const { error } = await supabase
      .from('attendance')
      .insert({
        user_id: user.id,
        date: today,
        check_in: now,
        status: 'present',
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.code === '23505' ? 'Already checked in today' : 'Failed to check in',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Checked In!',
        description: `You checked in at ${format(new Date(), 'h:mm a')}`,
      });
      fetchAttendance();
    }
    setCheckingIn(false);
  };

  const handleCheckOut = async () => {
    if (!user || !todayRecord) return;

    setCheckingOut(true);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('attendance')
      .update({ check_out: now })
      .eq('id', todayRecord.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to check out',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Checked Out!',
        description: `You checked out at ${format(new Date(), 'h:mm a')}`,
      });
      fetchAttendance();
    }
    setCheckingOut(false);
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date()),
  });

  const getRecordForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return weeklyRecords.find((r) => r.date === dateStr);
  };

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
        title="Attendance"
        description="Track your daily attendance and work hours"
      />

      {/* Check In/Out Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">Today's Date</p>
              <p className="text-2xl font-bold">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Current Time: {format(new Date(), 'h:mm a')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {!todayRecord ? (
                <Button 
                  size="lg" 
                  className="gradient-primary" 
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                >
                  {checkingIn ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Check In
                </Button>
              ) : !todayRecord.check_out ? (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Checked in at</p>
                    <p className="font-medium text-success">
                      {format(new Date(todayRecord.check_in!), 'h:mm a')}
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    variant="destructive"
                    onClick={handleCheckOut}
                    disabled={checkingOut}
                  >
                    {checkingOut ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    Check Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Checked in</p>
                    <p className="font-medium text-success">
                      {format(new Date(todayRecord.check_in!), 'h:mm a')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Checked out</p>
                    <p className="font-medium text-destructive">
                      {format(new Date(todayRecord.check_out!), 'h:mm a')}
                    </p>
                  </div>
                  <StatusBadge status="present" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const record = getRecordForDate(day);
              const isTodayDate = isToday(day);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`p-3 rounded-lg text-center ${
                    isTodayDate ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/50'
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                  <p className={`font-bold ${isTodayDate ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </p>
                  {record ? (
                    <div className="mt-2">
                      <StatusBadge status={record.status as any} className="text-[10px] px-1.5" />
                    </div>
                  ) : (
                    <div className="mt-2 h-5" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock size={20} />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No attendance records this week
                  </TableCell>
                </TableRow>
              ) : (
                weeklyRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {format(new Date(record.date), 'EEE, MMM d')}
                    </TableCell>
                    <TableCell>
                      {record.check_in ? format(new Date(record.check_in), 'h:mm a') : '-'}
                    </TableCell>
                    <TableCell>
                      {record.check_out ? format(new Date(record.check_out), 'h:mm a') : '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={record.status as any} />
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
