import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Save } from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  employee_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  department: string | null;
  designation: string | null;
  date_of_joining: string | null;
  profile_image: string | null;
}

export default function EmployeeProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Editable fields
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .maybeSingle();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } else if (data) {
      setProfile(data);
      setPhone(data.phone || '');
      setAddress(data.address || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        phone,
        address,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      fetchProfile();
    }
    setSaving(false);
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
        title="My Profile"
        description="View and update your personal information"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mb-4">
                <User size={40} className="text-white" />
              </div>
              <h2 className="text-xl font-bold">{profile?.full_name || 'N/A'}</h2>
              <p className="text-muted-foreground">{profile?.designation || 'Employee'}</p>
              <p className="text-sm text-muted-foreground mt-1">{profile?.department || 'Department'}</p>
              <div className="mt-4 pt-4 border-t w-full">
                <p className="text-sm"><span className="text-muted-foreground">Employee ID:</span> {profile?.employee_id}</p>
                <p className="text-sm mt-1"><span className="text-muted-foreground">Email:</span> {profile?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={profile?.full_name || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input value={profile?.employee_id || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={profile?.department || 'Not assigned'} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={profile?.designation || 'Not assigned'} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Date of Joining</Label>
                <Input 
                  value={profile?.date_of_joining ? format(new Date(profile.date_of_joining), 'MMM d, yyyy') : 'Not set'} 
                  disabled 
                  className="bg-muted" 
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-4">Editable Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your address"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
