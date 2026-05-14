import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Brain } from "lucide-react";

export default function ProtectedRoute({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: AppRole;
}) {
  const { session, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Brain className="h-5 w-5 animate-pulse text-primary" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requireRole && role !== requireRole) {
    return <Navigate to={role === "admin" ? "/admin-dashboard" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}