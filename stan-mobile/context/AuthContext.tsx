import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  isAnonymous: boolean;
  anonymousId: string | null;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  markOnboardingComplete: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider initializing...');
    
    // Get initial session or create anonymous user
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        
        // First check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session result:', { session: !!session, error, userId: session?.user?.id });
        
        if (session?.user) {
          setUser(session.user);
          setIsAnonymous(false);
        } else {
          // No session, create/get anonymous ID
          const storedAnonymousId = await AsyncStorage.getItem('anonymousId');
          if (storedAnonymousId) {
            console.log('Found existing anonymous ID:', storedAnonymousId);
            setAnonymousId(storedAnonymousId);
          } else {
            // Generate new anonymous ID
            const newAnonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await AsyncStorage.setItem('anonymousId', newAnonymousId);
            console.log('Created new anonymous ID:', newAnonymousId);
            setAnonymousId(newAnonymousId);
          }
          setIsAnonymous(true);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, 'User ID:', session?.user?.id);
        console.log('📧 User email confirmed:', session?.user?.email_confirmed_at);
        console.log('👤 Setting user state:', !!session?.user);
        
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User successfully signed in - should redirect to home');
          setIsAnonymous(false);
          // Clear anonymous data when user signs in
          await AsyncStorage.removeItem('anonymousId');
          setAnonymousId(null);
        } else if (event === 'SIGNED_OUT') {
          // Create new anonymous session after sign out
          const newAnonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await AsyncStorage.setItem('anonymousId', newAnonymousId);
          setAnonymousId(newAnonymousId);
          setIsAnonymous(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    console.log('Attempting to sign up:', email, username);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username,
        },
        emailRedirectTo: undefined, // Disable email confirmation redirect
      },
    });

    console.log('Signup result:', { data, error });

    if (error) {
      console.error('Signup error:', error);
      throw error;
    }

    // Mark as new user for onboarding
    setIsNewUser(true);

    // For development: try to automatically confirm the user
    if (data.user && !data.user.email_confirmed_at) {
      console.log('⚠️ User created but email not confirmed. For development, trying to sign in anyway...');
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Sign in result:', { data: data?.user?.id, error });

    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }

    // Mark as returning user (skip onboarding)
    setIsNewUser(false);

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const markOnboardingComplete = () => {
    setIsNewUser(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isNewUser,
        isAnonymous,
        anonymousId,
        signUp,
        signIn,
        signOut,
        markOnboardingComplete,
      }}
    >
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