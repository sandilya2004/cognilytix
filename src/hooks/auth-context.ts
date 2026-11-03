import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "user";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<boolean>;
}

// Keep context identity outside the provider's hot-reloaded component module.
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);