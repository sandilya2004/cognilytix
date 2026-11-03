import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import SignOutConfirmation from "@/components/SignOutConfirmation";
import { clearWorkspace, restoreWorkspace, saveWorkspace, saveThenSignOut } from "@/lib/workspace";
import { clearReportStore } from "@/lib/report-store";
import { Button } from "@/components/ui/button";

export type AppRole = "admin" | "user";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingSignOut = useRef<((result: boolean) => void) | null>(null);
  const currentUser = useRef<string | null>(null);
  const preparing = useRef<Promise<void> | null>(null);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        currentUser.current = null;
        clearWorkspace();
        clearReportStore();
        setRole(null);
        setLoading(false);
      } else {
        if (currentUser.current !== newSession.user.id) setLoading(true);
        // Defer DB call to avoid deadlock inside listener
        setTimeout(() => fetchRole(newSession.user.id), 0);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchRole(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    if (currentUser.current === userId) return preparing.current;
    currentUser.current = userId;
    setRestoreError(false);
    const prepare = async () => {
    try {
      clearReportStore();
      await restoreWorkspace(userId);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (currentUser.current !== userId) return;
      setRole((data?.role as AppRole) ?? "user");
    } catch {
      if (currentUser.current !== userId) return;
      setRestoreError(true);
    } finally {
      if (currentUser.current === userId) setLoading(false);
    }
    };
    preparing.current = prepare();
    return preparing.current;
  };

  const signOut = () => new Promise<boolean>(resolve => {
    if (pendingSignOut.current) { resolve(false); return; }
    pendingSignOut.current = resolve;
    setConfirmOpen(true);
  });
  const finishConfirmation = (result: boolean) => {
    setConfirmOpen(false);
    pendingSignOut.current?.(result);
    pendingSignOut.current = null;
  };
  const confirmSignOut = async () => {
    if (!session) return finishConfirmation(true);
    await saveThenSignOut(() => saveWorkspace(session.user.id), async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    });
    clearWorkspace();
    clearReportStore();
    setSession(null);
    setRole(null);
    finishConfirmation(true);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, signOut }}>
      {restoreError && session ? <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6"><p role="alert">Your saved reports could not be loaded. Please retry before continuing.</p><Button onClick={() => { currentUser.current = null; setLoading(true); void fetchRole(session.user.id); }}>Retry loading reports</Button></div> : children}
      <SignOutConfirmation open={confirmOpen} onCancel={() => finishConfirmation(false)} onContinue={confirmSignOut} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}