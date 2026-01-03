import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Role = 'employee' | 'admin';

interface Profile {
  id: string;
  employee_id?: string;
  full_name?: string;
  email?: string;
  role?: Role;
  is_first_login?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: Role | null;
  isFirstLogin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, employeeId: string, fullName: string, role: Role) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; profile?: Profile | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  };

  const fetchUserRole = async (userId: string) => {
    // Deprecated: user_roles table is no longer used. Read role from profiles.
    const profile = await fetchProfile(userId);
    return profile?.role ?? null;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          setIsFirstLogin(Boolean(p?.is_first_login));
          setRole(p?.role ?? null);
        });
      } else {
        setRole(null);
        setIsFirstLogin(false);
      }

      if (event === 'SIGNED_OUT') {
        setRole(null);
        setIsFirstLogin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          setIsFirstLogin(Boolean(p?.is_first_login));
          setRole(p?.role ?? null);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, employeeId: string, fullName: string, role: Role) => {
    const redirectUrl = `${window.location.origin}/`;

    // Force admin role for signups via UI. Employee accounts must be created by Admin.
    const enforcedRole: Role = 'admin';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          employee_id: employeeId,
          full_name: fullName,
          role: enforcedRole,
        },
      },
    });

    if (error) return { error };

    const userId = data?.user?.id;
    // Do not insert profiles here — the DB trigger on auth.users will create base profile and role.
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error };

    const userId = data?.user?.id;
    let profile: Profile | null = null;
    if (userId) {
      // Fetch profile and ensure we get the latest role
      profile = await fetchProfile(userId);
      
      // If role is null or undefined, try to get it from the database directly
      if (!profile?.role) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, is_first_login')
          .eq('id', userId)
          .maybeSingle();
        
        if (profileData) {
          profile = { ...profile, role: profileData.role as Role, is_first_login: profileData.is_first_login } as Profile;
        }
      }
      
      // Set role in context
      const finalRole = profile?.role ?? null;
      setRole(finalRole);
      setIsFirstLogin(Boolean(profile?.is_first_login));
      
      console.log('SignIn - Role set:', { userId, role: finalRole, email, profile });
    }

    return { error: null, profile };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setIsFirstLogin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, isFirstLogin, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
