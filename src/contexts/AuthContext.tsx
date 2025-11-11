import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department?: string;
  designation?: string;
  region?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const MOCK_PASSWORDS: Record<string, string> = {
  'admin@gov.in': 'Admin@123',
  'analyst@gov.in': 'Analyst@123',
  'official@gov.in': 'Official@123',
  'viewer@gov.in': 'Viewer@123',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_IN' && session) {
          await loadUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 1000)
      );

      const sessionPromise = supabase.auth.getSession();

      const { data: { session } } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as Awaited<typeof sessionPromise>;

      if (session) {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.warn('Supabase unavailable, checking localStorage');

      const storedUser = localStorage.getItem('mockAuthUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUser(data as User);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );

      const loginPromise = (async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          await loadUserProfile(data.user.id);
        }
      })();

      await Promise.race([loginPromise, timeoutPromise]);
    } catch (error) {
      console.warn('Supabase auth unavailable, using fallback auth');

      if (MOCK_PASSWORDS[email] !== password) {
        throw new Error('Invalid email or password');
      }

      const users = JSON.parse(localStorage.getItem('mockUsers') || '[]');
      let mockUser = users.find((u: User) => u.email === email);

      if (!mockUser) {
        mockUser = {
          id: '1',
          email,
          full_name: 'Mock User',
          role: email === 'admin@gov.in' ? 'admin' as UserRole : 'viewer' as UserRole,
        };
        users.push(mockUser);
        localStorage.setItem('mockUsers', JSON.stringify(users));
      }

      localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
      setUser(mockUser);
    }
  };

  const signUp = async (signUpData: SignUpData) => {
    const { email, password, full_name, role, department, designation, region } = signUpData;

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );

      const signUpPromise = (async () => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (!data.user) {
          throw new Error('Registration failed - no user returned');
        }

        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          email,
          full_name,
          role,
          department: department || null,
          designation: designation || null,
          region: region || null,
        });

        if (profileError) {
          await supabase.auth.signOut();
          throw profileError;
        }

        await loadUserProfile(data.user.id);
      })();

      await Promise.race([signUpPromise, timeoutPromise]);
    } catch (error) {
      console.warn('Supabase auth unavailable, using fallback auth');

      const users = JSON.parse(localStorage.getItem('mockUsers') || '[]');

      if (users.find((u: User) => u.email === email)) {
        throw new Error('User already exists');
      }

      const newUser: User = {
        id: Date.now().toString(),
        email,
        full_name,
        role,
        department: department || undefined,
        designation: designation || undefined,
        region: region || undefined,
        avatar_url: undefined,
      };

      users.push(newUser);
      localStorage.setItem('mockUsers', JSON.stringify(users));
      MOCK_PASSWORDS[email] = password;

      localStorage.setItem('mockAuthUser', JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  const logout = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 1000)
      );

      await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise
      ]);
    } catch (error) {
      console.warn('Supabase sign out timeout or error');
    } finally {
      localStorage.removeItem('mockAuthUser');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signUp, logout, isLoading }}>
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
