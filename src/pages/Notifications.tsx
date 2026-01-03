import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  user_id?: string;
  title?: string;
  message?: string;
  read?: boolean;
  created_at?: string;
}

export default function Notifications() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    // Realtime disabled; fetch notifications on mount and after actions
    fetchNotifications();
    return () => {};
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
    if (role !== 'admin' && user) query = supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    const { data, error } = await query;
    if (error) {
      toast({ title: 'Error', description: 'Failed to load notifications', variant: 'destructive' });
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const markRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to mark read', variant: 'destructive' });
      return;
    }
    setNotes((s) => s.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <DashboardLayout>
      <PageHeader title="Notifications" description="Recent notifications" />

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : notes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No notifications</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className={`p-4 rounded-md border ${n.read ? 'bg-muted/30' : 'bg-background'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{n.title || 'Notification'}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                    </div>
                    {!n.read && <button className="text-sm text-primary" onClick={() => markRead(n.id)}>Mark read</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
