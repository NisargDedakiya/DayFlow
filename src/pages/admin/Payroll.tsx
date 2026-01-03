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
import { Loader2, Plus, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AdminPayroll() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ userId: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), basicSalary: '', allowances: '0', deductions: '0' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: payrollData } = await supabase.from('payroll').select(`*, profiles!payroll_user_id_fkey (full_name, employee_id)`).order('year', { ascending: false }).order('month', { ascending: false });
    const { data: empData } = await supabase.from('profiles').select('id, full_name, employee_id');
    setPayrolls(payrollData || []);
    setEmployees(empData || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.from('payroll').insert({ user_id: form.userId, month: parseInt(form.month), year: parseInt(form.year), basic_salary: parseFloat(form.basicSalary), allowances: parseFloat(form.allowances) || 0, deductions: parseFloat(form.deductions) || 0 });
    if (error) {
      toast({ title: 'Error', description: error.code === '23505' ? 'Payroll already exists for this period' : 'Failed to create payroll', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Payroll created' });
      setDialogOpen(false);
      fetchData();

      // Notify employee and insert audit log
      try {
        const newPayroll = data?.[0];
        await supabase.from('notifications').insert([{ user_id: form.userId, title: 'Payroll Updated', message: `Payroll created for ${monthNames[parseInt(form.month)-1]} ${form.year}.`, read: false }]);
        await supabase.from('audit_logs').insert([{ action: 'create_payroll', performed_by: null, target_user_id: form.userId, details: { payroll_id: newPayroll?.id, month: form.month, year: form.year } }]);
      } catch (e) {
        console.error('Notification/audit insert failed', e);
      }
    }
    setSubmitting(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Payroll Management" description="Manage employee salaries">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="gradient-primary"><Plus className="mr-2 h-4 w-4" />Add Payroll</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Payroll Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2"><Label>Employee</Label><Select value={form.userId} onValueChange={(v) => setForm({...form, userId: v})}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Month</Label><Select value={form.month} onValueChange={(v) => setForm({...form, month: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{monthNames.map((m,i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => setForm({...form, year: e.target.value})} /></div>
              </div>
              <div className="space-y-2"><Label>Basic Salary ($)</Label><Input type="number" value={form.basicSalary} onChange={(e) => setForm({...form, basicSalary: e.target.value})} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Allowances ($)</Label><Input type="number" value={form.allowances} onChange={(e) => setForm({...form, allowances: e.target.value})} /></div>
                <div className="space-y-2"><Label>Deductions ($)</Label><Input type="number" value={form.deductions} onChange={(e) => setForm({...form, deductions: e.target.value})} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create Payroll</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <CardHeader><CardTitle>Payroll Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Basic</TableHead><TableHead className="text-right">Net Salary</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {payrolls.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><p className="font-medium">{p.profiles?.full_name || '-'}</p><p className="text-xs text-muted-foreground">{p.profiles?.employee_id}</p></TableCell>
                  <TableCell>{monthNames[p.month-1]} {p.year}</TableCell>
                  <TableCell className="text-right">${p.basic_salary?.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold">${p.net_salary?.toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={p.payment_status === 'paid' ? 'approved' : 'pending'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
