/**
 * Auth Service
 *
 * Wraps Supabase auth methods with typed results and consistent error handling.
 * All methods return { data, error } — never throw.
 */

import { supabase } from "../lib/supabaseClient";
import type { Session, User, AuthError } from "@supabase/supabase-js";

export interface AuthResult<T = null> {
  data: T;
  error: AuthError | Error | null;
}

// ─── Sign Up ────────────────────────────────────────────────────────────────

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data: { user: data.user, session: data.session }, error };
}

// ─── Sign In ────────────────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data: { user: data.user, session: data.session }, error };
}

// ─── Sign Out ───────────────────────────────────────────────────────────────

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return { data: null, error };
}

// ─── Get Current Session ────────────────────────────────────────────────────

export async function getSession(): Promise<AuthResult<Session | null>> {
  const { data, error } = await supabase.auth.getSession();
  return { data: data.session, error };
}

// ─── Get Current User ───────────────────────────────────────────────────────

export async function getUser(): Promise<AuthResult<User | null>> {
  const { data, error } = await supabase.auth.getUser();
  return { data: data.user, error };
}

// ─── Auth State Listener ─────────────────────────────────────────────────────
// Returns an unsubscribe function — call it on component unmount.

export function onAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session);
    }
  );
  return () => listener.subscription.unsubscribe();
}

// ─── Password Reset ──────────────────────────────────────────────────────────

export async function sendPasswordReset(
  email: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { data: null, error };
}
