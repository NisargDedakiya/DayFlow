import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  profiles: {
    full_name: string | null;
    employee_id: string;
  } | null;
}

export default function AdminAttendance() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchAttendance();
  }, [dateFilter]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = (sessionData as any)?.session?.access_token;
      if (!accessToken) throw new Error('Missing access token');
      const resp = await fetch(`/api/admin/attendance?date=${encodeURIComponent(dateFilter)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || 'Failed to fetch attendance records');
      }
      const json = await resp.json();
      setRecords(json.data || []);
    } catch (err: any) {
      console.error('Failed to fetch attendance', err);
      toast({ title: 'Error', description: err?.message || 'Failed to fetch attendance records', variant: 'destructive' });
    }
    setLoading(false);
  };

  const filteredRecords = records.filter((rec) => {
    const searchLower = search.toLowerCase();
    return (
      rec.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      rec.profiles?.employee_id.toLowerCase().includes(searchLower)
    );
  });

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

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
        title="Attendance Management"
        description="View and manage employee attendance"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-success">{presentCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <Clock className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-destructive">{absentCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10">
                <Clock className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
              <div className="p-3 rounded-lg gradient-primary">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Attendance Records</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto"
              />
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No attendance records for this date
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">{rec.profiles?.employee_id}</TableCell>
                    <TableCell>{rec.profiles?.full_name || '-'}</TableCell>
                    <TableCell>
                      {rec.check_in ? format(new Date(rec.check_in), 'h:mm a') : '-'}
                    </TableCell>
                    <TableCell>
                      {rec.check_out ? format(new Date(rec.check_out), 'h:mm a') : '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={rec.status as any} />
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
