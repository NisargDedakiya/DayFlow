import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  performed_by?: string;
  target_user_id?: string;
  details?: any;
  created_at?: string;
}

export default function AuditLogs() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    // Realtime disabled; fetch logs on mount
    fetchLogs();
    return () => {};
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch audit logs', variant: 'destructive' });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <PageHeader title="Audit Logs" description="System audit trail" />
      <Card>
        <CardHeader><CardTitle>Recent Actions</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No audit logs</p>
          ) : (
            <div className="space-y-3">
              {logs.map((l) => (
                <div key={l.id} className="p-3 rounded-md border bg-background">
                  <p className="font-medium">{l.action}</p>
                  <p className="text-xs text-muted-foreground">By: {l.performed_by || 'system'} • {l.created_at}</p>
                  <pre className="text-xs mt-2 whitespace-pre-wrap">{JSON.stringify(l.details || {}, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
