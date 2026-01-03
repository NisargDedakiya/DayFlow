import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock } from 'lucide-react';

export default function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { session, role, isFirstLogin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!session) {
    navigate('/login');
    return null;
  }

  if (!isFirstLogin) {
    // if not first login, redirect to appropriate dashboard
    navigate(role === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      toast({ title: 'Error', description: updateError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // mark profile as not first login
    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id;
    if (userId) {
      const { error: pError } = await supabase.from('profiles').update({ is_first_login: false }).eq('id', userId);
      if (pError) {
        console.error('Failed to update profile is_first_login', pError);
      }
      
      // Re-fetch profile to get the latest role
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      const userRole = updatedProfile?.role || role || 'employee';
      
      toast({ title: 'Password updated', description: 'You may now access your dashboard.' });
      setLoading(false);
      
      console.log('ChangePassword redirect:', { role: userRole, userId });
      navigate(userRole === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
    } else {
      setLoading(false);
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="shadow-xl border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Change Password</CardTitle>
            <CardDescription className="text-center">Set a new password to continue</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirm" type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-10" required />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
