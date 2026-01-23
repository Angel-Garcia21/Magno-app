
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';
import { Session } from '@supabase/supabase-js';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signIn: (email: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, name: string, role: 'owner' | 'tenant' | 'admin') => Promise<{ error: any }>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchUserProfile(session.user.id, session.user.email!);
            else setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchUserProfile(session.user.id, session.user.email!);
            else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (userId: string, email: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                // Fallback user object if profile missing
                setUser({ id: userId, email, name: email.split('@')[0], role: 'guest' });
            } else if (data) {
                // Map ALL profile fields to User object
                setUser({
                    id: data.id,
                    email: data.email,
                    name: data.full_name || email.split('@')[0], // Fallback to email username if no full_name
                    role: data.role,
                    propertyId: data.property_id,
                    propertyCode: data.property_code,
                    depositDay: data.deposit_day,
                    monthlyAmount: data.monthly_amount,
                    contractEndDate: data.contract_end_date,
                    contractStartDate: data.contract_start_date,
                    propertyTitle: data.property_title,
                    propertyAddress: data.property_address,
                    linkedName: data.linked_name,
                    phoneContact: data.phone_contact,
                    vouchers: data.vouchers || []
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signUp = async (email: string, password: string, name: string, role: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: role,
                },
            },
        });

        // Profile creation is now handled by the database trigger 'on_auth_user_created'
        return { error };
    };

    const signOut = async () => {
        if (!supabase) return;
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Sign out error:', err);
        } finally {
            // Force local cleanup regardless of network result
            setUser(null);
            setSession(null);
            localStorage.clear();
            sessionStorage.clear();
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
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
