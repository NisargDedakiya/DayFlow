import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, DollarSign, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AdminPayroll() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ userId: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), basicSalary: '', allowances: '0', deductions: '0' });

  useEffect(() => { fetchData(); }, []);

  // Realtime temporarily disabled; we will refetch after actions

  const fetchData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = (sessionData as any)?.session?.access_token;
      if (!accessToken) throw new Error('Missing access token');

      const resp = await fetch('/api/admin/payrolls', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!resp.ok) throw new Error('Failed to fetch payrolls');
      const payrollBody = await resp.json();

      const resp2 = await fetch('/api/admin/profiles', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!resp2.ok) throw new Error('Failed to fetch profiles');
      const profilesBody = await resp2.json();

      setPayrolls(payrollBody.data || []);
      setEmployees(profilesBody.data || []);
    } catch (e) {
      console.error('Failed to fetch payroll data', e);
      setPayrolls([]);
      setEmployees([]);
    }
    setLoading(false);
  };

  const handleEdit = (payroll: any) => {
    setEditingPayroll(payroll);
    setForm({
      userId: payroll.user_id,
      month: String(payroll.month),
      year: String(payroll.year),
      basicSalary: String(payroll.basic_salary || ''),
      allowances: String(payroll.allowances || '0'),
      deductions: String(payroll.deductions || '0'),
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPayroll(null);
    setForm({ userId: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), basicSalary: '', allowances: '0', deductions: '0' });
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleCloseDialog();
      return;
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = (sessionData as any)?.session?.access_token;
      if (!accessToken) throw new Error('Missing access token');

      const resp = await fetch('/api/admin/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ user_id: form.userId, month: parseInt(form.month), year: parseInt(form.year), basic_salary: parseFloat(form.basicSalary), allowances: parseFloat(form.allowances) || 0, deductions: parseFloat(form.deductions) || 0 }),
      });
      if (!resp.ok) {
        let errorMessage = 'Payroll request failed';
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
      toast({ title: 'Success', description: editingPayroll ? 'Payroll updated successfully' : 'Payroll created successfully' });
      handleCloseDialog();
      fetchData();
    } catch (err: any) {
      console.error('Payroll save failed', err);
      toast({ title: 'Error', description: err?.message || 'Failed to save payroll', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Payroll Management" description="Add or edit employee payroll records">
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild><Button className="gradient-primary"><Plus className="mr-2 h-4 w-4" />Add Payroll</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingPayroll ? 'Edit Payroll Entry' : 'Create Payroll Entry'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={form.userId} onValueChange={(v) => setForm({...form, userId: v})} disabled={!!editingPayroll}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</SelectItem>)}</SelectContent>
                </Select>
                {editingPayroll && <p className="text-xs text-muted-foreground">Employee cannot be changed when editing</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={form.month} onValueChange={(v) => setForm({...form, month: v})} disabled={!!editingPayroll}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{monthNames.map((m,i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input type="number" value={form.year} onChange={(e) => setForm({...form, year: e.target.value})} disabled={!!editingPayroll} />
                </div>
              </div>
              {editingPayroll && <p className="text-xs text-muted-foreground">Period cannot be changed when editing</p>}
              <div className="space-y-2"><Label>Basic Salary ($)</Label><Input type="number" value={form.basicSalary} onChange={(e) => setForm({...form, basicSalary: e.target.value})} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Allowances ($)</Label><Input type="number" value={form.allowances} onChange={(e) => setForm({...form, allowances: e.target.value})} /></div>
                <div className="space-y-2"><Label>Deductions ($)</Label><Input type="number" value={form.deductions} onChange={(e) => setForm({...form, deductions: e.target.value})} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editingPayroll ? 'Update Payroll' : 'Create Payroll'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <CardHeader><CardTitle>Payroll Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Basic</TableHead><TableHead className="text-right">Net Salary</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {payrolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No payroll records found
                  </TableCell>
                </TableRow>
              ) : (
                payrolls.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><p className="font-medium">{p.profiles?.full_name || '-'}</p><p className="text-xs text-muted-foreground">{p.profiles?.employee_id}</p></TableCell>
                    <TableCell>{monthNames[p.month-1]} {p.year}</TableCell>
                    <TableCell className="text-right">${p.basic_salary?.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">${p.net_salary?.toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={p.payment_status === 'paid' ? 'approved' : 'pending'} /></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
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
