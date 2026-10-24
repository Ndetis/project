import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, UserRole } from './types';

interface SignUpResult {
  error: string | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

function roleFromMetadata(meta: Record<string, unknown> | undefined): UserRole {
  return meta?.role === 'admin' ? 'admin' : 'member';
}

async function ensureProfile(
  authUser: User,
  fallback?: { fullName: string; role: UserRole },
): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();
  if (error) return { profile: null, error: error.message };
  if (data) return { profile: data as Profile, error: null };

  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof meta.full_name === 'string' && meta.full_name
    ? meta.full_name
    : fallback?.fullName ?? '';
  const role = meta.role === 'admin' || meta.role === 'member' ? meta.role : fallback?.role ?? roleFromMetadata(meta);
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: authUser.id, full_name: fullName, role })
    .select('*')
    .single();

  if (insertError?.code === '23505') {
    const { data: existing, error: reloadError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    if (reloadError) return { profile: null, error: reloadError.message };
    return { profile: (existing as Profile | null) ?? null, error: existing ? null : insertError.message };
  }
  if (insertError) return { profile: null, error: insertError.message };
  return { profile: created as Profile, error: null };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (authUser: User) => {
    const { profile: next, error } = await ensureProfile(authUser);
    if (error) console.error('Error loading profile:', error);
    setProfile(next);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await loadProfile(s.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'member') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) return { error: error.message };
    if (!data.session || !data.user) {
      return { error: null, needsEmailConfirmation: true };
    }
    const { error: profileError } = await ensureProfile(data.user, { fullName, role });
    if (profileError) return { error: profileError };
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
