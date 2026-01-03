import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Download, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PayrollRecord {
  id: string;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_status: string;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function EmployeePayroll() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);

  useEffect(() => {
    if (user) {
      fetchPayroll();
    }
  }, [user]);

  const fetchPayroll = async () => {
    const { data, error } = await supabase
      .from('payroll')
      .select('*')
      .eq('user_id', user?.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch payroll data',
        variant: 'destructive',
      });
    } else {
      setPayrolls(data || []);
    }
    setLoading(false);
  };

  const downloadPayslip = (payroll: PayrollRecord) => {
    // Simple text-based payslip
    const payslipContent = `
PAYSLIP
=======
Period: ${monthNames[payroll.month - 1]} ${payroll.year}

EARNINGS
--------
Basic Salary: $${payroll.basic_salary.toLocaleString()}
Allowances: $${payroll.allowances?.toLocaleString() || '0'}

DEDUCTIONS
----------
Total Deductions: $${payroll.deductions?.toLocaleString() || '0'}

NET SALARY: $${payroll.net_salary.toLocaleString()}
Payment Status: ${payroll.payment_status.toUpperCase()}
    `;

    const blob = new Blob([payslipContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip_${monthNames[payroll.month - 1]}_${payroll.year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const latestPayroll = payrolls[0];
  const totalEarnings = payrolls.reduce((sum, p) => sum + (p.net_salary || 0), 0);

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
        title="Payroll"
        description="View your salary details and download payslips"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Salary</p>
                <p className="text-2xl font-bold">
                  ${latestPayroll?.net_salary?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {latestPayroll ? `${monthNames[latestPayroll.month - 1]} ${latestPayroll.year}` : 'No data'}
                </p>
              </div>
              <div className="p-3 rounded-lg gradient-primary">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">YTD Earnings</p>
                <p className="text-2xl font-bold">${totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{payrolls.length} records</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <p className="text-2xl font-bold capitalize">
                  {latestPayroll?.payment_status || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">Latest period</p>
              </div>
              <div className={`p-3 rounded-lg ${latestPayroll?.payment_status === 'paid' ? 'bg-success/10' : 'bg-warning/10'}`}>
                <DollarSign className={`h-5 w-5 ${latestPayroll?.payment_status === 'paid' ? 'text-success' : 'text-warning'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Breakdown */}
      {latestPayroll && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Latest Salary Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Basic Salary</p>
                <p className="text-xl font-bold">${latestPayroll.basic_salary?.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-success/10 rounded-lg">
                <p className="text-sm text-success">Allowances</p>
                <p className="text-xl font-bold text-success">+${latestPayroll.allowances?.toLocaleString() || '0'}</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive">Deductions</p>
                <p className="text-xl font-bold text-destructive">-${latestPayroll.deductions?.toLocaleString() || '0'}</p>
              </div>
              <div className="p-4 gradient-primary rounded-lg">
                <p className="text-sm text-white/80">Net Salary</p>
                <p className="text-xl font-bold text-white">${latestPayroll.net_salary?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payroll History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No payroll records yet
                  </TableCell>
                </TableRow>
              ) : (
                payrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">
                      {monthNames[payroll.month - 1]} {payroll.year}
                    </TableCell>
                    <TableCell className="text-right">${payroll.basic_salary?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-success">+${payroll.allowances?.toLocaleString() || '0'}</TableCell>
                    <TableCell className="text-right text-destructive">-${payroll.deductions?.toLocaleString() || '0'}</TableCell>
                    <TableCell className="text-right font-bold">${payroll.net_salary?.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={payroll.payment_status === 'paid' ? 'approved' : 'pending'} />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => downloadPayslip(payroll)}
                      >
                        <Download className="h-4 w-4" />
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
