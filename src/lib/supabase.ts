import { createClient } from '@supabase/supabase-js';
import type { Database } from './database-types';

// For Lovable's native Supabase integration, environment variables are injected differently
// Using window.location.origin as fallback for development
const supabaseUrl = 'https://iczdqwtiqiyhjwllexbb.supabase.co'; // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljemRxd3RpcWl5aGp3bGxleGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDg2MTMsImV4cCI6MjA3MzMyNDYxM30.oEZEFxKMHErHN6uK3ijd2svsXdTLnB7zOdqrsUPqpKQ'; // Replace with your Supabase anon key

// Create a placeholder client that will be replaced when you add your Supabase credentials
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Auth helpers
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};
