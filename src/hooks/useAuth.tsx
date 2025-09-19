import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'director' | 'judge' | 'participant' | 'evaluator';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id' | 'is_verified'> & { password: string }, documents?: File[]) => Promise<{ success: boolean; needsApproval?: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);



export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  // Suppress auth state effects during registration to avoid transient login
  const isRegisteringRef = useRef(false);

  // Helper function to update both state and ref
  const updateUser = (newUser: User | null) => {
    userRef.current = newUser;
    setUser(newUser);
  };

  // Get user profile from database
  const getUserProfile = async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        phone: data.phone,
        is_verified: data.is_verified,
      };
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let isInitializing = true;
    let isTabVisible = !document.hidden;

    const handleAuthState = async (session: Session | null, isInitial = false) => {
      if (!mounted) return;

      // Capture the initial user state to determine if we should show loading
      const hadExistingUser = userRef.current !== null;
      const shouldShowLoading = isInitial || !hadExistingUser;

      try {
        if (session?.user) {
          // If we are in the middle of registration, ignore this transient session
          if (isRegisteringRef.current) {
            console.log('Registration in progress - ignoring transient session');
            return;
          }

          console.log(`${isInitial ? 'Initial session' : 'Auth state change'} for:`, session.user.email);
          
          // Only show loading for initial load or if we don't have a user yet
          if (shouldShowLoading) {
            setLoading(true);
          }
          
          const profile = await getUserProfile(session.user);
          if (profile && mounted) {
            if (!profile.is_verified) {
              console.log('Profile not verified - signing out');
              await supabase.auth.signOut();
              updateUser(null);
            } else {
              console.log('Profile loaded:', profile.email);
              updateUser(profile);
            }
          } else if (mounted) {
            console.log('No profile found, signing out');
            await supabase.auth.signOut();
            updateUser(null);
          }
        } else if (mounted) {
          console.log(isInitial ? 'No existing session' : 'User signed out');
          updateUser(null);
        }
      } catch (error) {
        console.error('Error handling auth state:', error);
        if (mounted) {
          updateUser(null);
        }
      } finally {
        if (mounted) {
          // Only set loading to false if we were showing loading
          if (shouldShowLoading) {
            setLoading(false);
          }
          if (isInitial) {
            isInitializing = false;
            console.log('Auth initialization complete');
          }
        }
      }
    };

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        setLoading(true);
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted && isInitializing) {
            console.log('Auth initialization timeout - forcing completion');
            setLoading(false);
            isInitializing = false;
          }
        }, 10000); // 10 second timeout
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            updateUser(null);
            setLoading(false);
            isInitializing = false;
          }
          return;
        }

        await handleAuthState(session, true);
        
        // Clear timeout since initialization completed successfully
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          updateUser(null);
          setLoading(false);
          isInitializing = false;
        }
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email, 'Tab visible:', isTabVisible);
        
        if (!mounted || isInitializing) return; // Skip if still initializing

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            // If we already have the same user and tab just became visible, skip loading
            if (userRef.current && userRef.current.email === session.user.email && isTabVisible) {
              console.log('Same user already authenticated, skipping loading state');
              return;
            }
            await handleAuthState(session, false);
          } else if (event === 'SIGNED_OUT') {
            updateUser(null);
            setLoading(false);
          } else if (event === 'TOKEN_REFRESHED') {
            // Don't change user state on token refresh - just log it
            console.log('Token refreshed for user:', session?.user?.email);
            // Don't trigger loading or state changes for token refresh
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
          if (mounted) {
            updateUser(null);
            setLoading(false);
          }
        }
      }
    );

    // Handle visibility change to prevent unnecessary loading states
    const handleVisibilityChange = () => {
      const wasVisible = isTabVisible;
      isTabVisible = !document.hidden;
      
      // If tab becomes visible again and we have a user, don't trigger loading
      if (!wasVisible && isTabVisible && userRef.current) {
        console.log('Tab became visible - user already authenticated, skipping reload');
      }
    };

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize auth after setting up the listener
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);

      // Supabase auth only (demo login removed)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        
        // Handle specific email confirmation error
        if (error.message.includes('Email not confirmed')) {
          console.log('Email not confirmed - this should be disabled in Supabase settings');
          console.log('Go to Authentication > Settings > Email Auth and disable "Enable email confirmations"');
        }
        
        setLoading(false);
        return false;
      }

      if (data.user) {
        // Check if user exists in profiles table first
        const profile = await getUserProfile(data.user);
        if (profile) {
          // Check if user is verified in our custom verification system
          if (!profile.is_verified) {
            // Sign out the user since they're not verified by admin
            await supabase.auth.signOut();
            setLoading(false);
            return false; // Return false to show "account not verified" message
          }
          
          updateUser(profile);
          setLoading(false);
          return true;
        } else {
          // User exists in auth but not in profiles table
          console.error('User authenticated but no profile found');
          await supabase.auth.signOut();
          setLoading(false);
          return false;
        }
      }

      setLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      return false;
    }
  };

  const register = async (
    userData: Omit<User, 'id' | 'is_verified'> & { password: string },
    documents?: File[]
  ): Promise<{ success: boolean; needsApproval?: boolean; error?: string }> => {
    try {
      setLoading(true);

      // Remove demo password functionality for registration
      // Demo accounts should only work for login, not registration

      // Register with Supabase
      // Mark that a registration flow is in progress to suppress transient auth state
      isRegisteringRef.current = true;

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation redirect
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone,
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        setLoading(false);
        isRegisteringRef.current = false;
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Create user profile (is_verified defaults to false)
        // Use upsert to handle cases where profile might already exist from trigger
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            phone: userData.phone,
            is_verified: false, // Explicitly set to false - requires admin approval
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          setLoading(false);
          isRegisteringRef.current = false;
          return { success: false, error: profileError.message };
        }

        // Upload documents if provided (for evaluators)
        if (documents && documents.length > 0 && userData.role === 'evaluator' && data.user) {
          console.log(`Uploading ${documents.length} documents for evaluator...`);
          const { uploadEvaluatorDocument } = await import('@/lib/storage');
          
          const uploadErrors: string[] = [];
          let successCount = 0;
          
          for (const document of documents) {
            console.log(`Uploading document: ${document.name}`);
            const result = await uploadEvaluatorDocument(document, data.user.id);
            if (!result.success) {
              console.error('Document upload error:', result.error);
              uploadErrors.push(`${document.name}: ${result.error}`);
            } else {
              successCount++;
              console.log(`Successfully uploaded: ${document.name}`);
            }
          }
          
          console.log(`Upload summary: ${successCount}/${documents.length} documents uploaded successfully`);
          if (uploadErrors.length > 0) {
            console.warn('Some documents failed to upload:', uploadErrors);
            // For now, continue with registration even if some documents fail
            // In production, you might want to handle this differently
          }
        }

        // DO NOT set user or auto-login - user needs approval first
        // Sign out the user immediately after registration
        await supabase.auth.signOut();
        
        setLoading(false);
        isRegisteringRef.current = false;
        return { success: true, needsApproval: true };
      }

      setLoading(false);
      isRegisteringRef.current = false;
      return { success: false, error: 'Registration failed - no user created' };
    } catch (error) {
      console.error('Registration error:', error);
      setLoading(false);
      isRegisteringRef.current = false;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user:', user?.email);
      setLoading(true);
      
      // Sign out from Supabase
      console.log('Signing out from Supabase');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      } else {
        console.log('Successfully signed out from Supabase');
      }
      
      // Clear user state immediately
      updateUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if there's an error
      updateUser(null);
    } finally {
      setLoading(false);
      console.log('Logout complete');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};