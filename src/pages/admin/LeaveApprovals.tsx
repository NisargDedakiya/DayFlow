import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  remarks: string | null;
  status: string;
  created_at: string;
  profiles: { full_name: string | null; employee_id: string } | null;
}

export default function AdminLeaveApprovals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => { fetchLeaves(); }, []);

  const fetchLeaves = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = (sessionData as any)?.session?.access_token;
      if (!accessToken) throw new Error('Missing access token');

      const resp = await fetch('/api/admin/leaves', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!resp.ok) {
        let errorMessage = 'Failed to fetch leaves';
        try {
          const errData = await resp.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          errorMessage = await resp.text() || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const body = await resp.json();
      setLeaves(body.data as LeaveRequest[] || []);
    } catch (err) {
      console.error('Failed to fetch leaves', err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!selectedLeave || !user) return;
    setProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = (sessionData as any)?.session?.access_token;
      if (!accessToken) throw new Error('Missing access token');

      const resp = await fetch('/api/admin/leave-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ leave_id: selectedLeave.id, action: status, admin_comment: comments }),
      });

      if (!resp.ok) {
        let errorMessage = 'Leave action failed';
        try {
          const errData = await resp.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          const errText = await resp.text();
          errorMessage = errText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const body = await resp.json();
      toast({ title: 'Success', description: `Leave request ${status}` });
      setSelectedLeave(null);
      setComments('');
      // server triggers real-time update; fetch is optional but keep UI current
      fetchLeaves();
    } catch (err: any) {
      console.error('Leave action failed', err);
      toast({ title: 'Error', description: err?.message || 'Failed to process leave action', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Leave Approvals" description="Review and manage leave requests" />
      <Card>
        <CardHeader><CardTitle>All Leave Requests</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <button className={`px-3 py-1 rounded ${statusFilter === 'all' ? 'bg-primary text-white' : 'bg-muted/20'}`} onClick={() => setStatusFilter('all')}>All</button>
            <button className={`px-3 py-1 rounded ${statusFilter === 'pending' ? 'bg-primary text-white' : 'bg-muted/20'}`} onClick={() => setStatusFilter('pending')}>Pending</button>
            <button className={`px-3 py-1 rounded ${statusFilter === 'approved' ? 'bg-primary text-white' : 'bg-muted/20'}`} onClick={() => setStatusFilter('approved')}>Approved</button>
            <button className={`px-3 py-1 rounded ${statusFilter === 'rejected' ? 'bg-primary text-white' : 'bg-muted/20'}`} onClick={() => setStatusFilter('rejected')}>Rejected</button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.filter(l => statusFilter === 'all' ? true : l.status === statusFilter).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No leave requests found
                  </TableCell>
                </TableRow>
              ) : (
                leaves.filter(l => statusFilter === 'all' ? true : l.status === statusFilter).map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell><p className="font-medium">{leave.profiles?.full_name || '-'}</p><p className="text-xs text-muted-foreground">{leave.profiles?.employee_id}</p></TableCell>
                    <TableCell className="capitalize">{leave.leave_type}</TableCell>
                    <TableCell>{format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d')}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={leave.remarks || 'No reason provided'}>
                      {leave.remarks || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={leave.status as any} /></TableCell>
                    <TableCell>
                      {leave.status === 'pending' ? (
                        <Button size="sm" onClick={() => setSelectedLeave(leave)}>Review</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p><strong>Employee:</strong> {selectedLeave?.profiles?.full_name}</p>
            <p><strong>Type:</strong> {selectedLeave?.leave_type}</p>
            <p><strong>Duration:</strong> {selectedLeave && `${format(new Date(selectedLeave.start_date), 'MMM d')} - ${format(new Date(selectedLeave.end_date), 'MMM d, yyyy')}`}</p>
            <p><strong>Remarks:</strong> {selectedLeave?.remarks || 'None'}</p>
            <Textarea placeholder="Add comments..." value={comments} onChange={(e) => setComments(e.target.value)} />
            <div className="flex gap-2">
              <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => handleAction('approved')} disabled={processing}><Check className="mr-2 h-4 w-4" />Approve</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleAction('rejected')} disabled={processing}><X className="mr-2 h-4 w-4" />Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
