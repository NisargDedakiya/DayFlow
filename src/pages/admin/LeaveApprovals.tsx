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

  useEffect(() => { fetchLeaves(); }, []);

  const fetchLeaves = async () => {
    const { data } = await supabase.from('leave_requests').select(`*, profiles!leave_requests_user_id_fkey (full_name, employee_id)`).order('created_at', { ascending: false });
    setLeaves(data as unknown as LeaveRequest[] || []);
    setLoading(false);
  };

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!selectedLeave || !user) return;
    setProcessing(true);
    await supabase.from('leave_requests').update({ status, admin_comments: comments || null, reviewed_by: user.id }).eq('id', selectedLeave.id);
    toast({ title: 'Success', description: `Leave request ${status}` });
    setSelectedLeave(null);
    setComments('');
    fetchLeaves();
    // Notify employee and insert audit log
    try {
      await supabase.from('notifications').insert([{ user_id: selectedLeave.user_id, title: `Leave ${status}`, message: `Your leave request has been ${status}.`, read: false }]);
    } catch (nErr) {
      console.error('Failed to insert notification', nErr);
    }
    try {
      await supabase.from('audit_logs').insert([{ action: `leave_${status}`, performed_by: user.id, target_user_id: selectedLeave.user_id, details: { leave_id: selectedLeave.id, comments } }]);
    } catch (aErr) {
      console.error('Failed to insert audit log', aErr);
    }
    setProcessing(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Leave Approvals" description="Review and manage leave requests" />
      <Card>
        <CardHeader><CardTitle>All Leave Requests</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell><p className="font-medium">{leave.profiles?.full_name || '-'}</p><p className="text-xs text-muted-foreground">{leave.profiles?.employee_id}</p></TableCell>
                  <TableCell className="capitalize">{leave.leave_type}</TableCell>
                  <TableCell>{format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d')}</TableCell>
                  <TableCell><StatusBadge status={leave.status as any} /></TableCell>
                  <TableCell>{leave.status === 'pending' && <Button size="sm" onClick={() => setSelectedLeave(leave)}>Review</Button>}</TableCell>
                </TableRow>
              ))}
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
