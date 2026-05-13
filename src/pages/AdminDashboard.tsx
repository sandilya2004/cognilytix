import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Users, Shield, LogOut, Moon, Sun, BarChart3, Search, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UserRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  role: "admin" | "user";
  last_sign_in_at: string | null;
}

const INACTIVE_DAYS = 60;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function activityLabel(iso: string | null) {
  const d = daysSince(iso);
  if (d === null) return { label: "Never", inactive: true, fresh: false };
  if (d <= 1) return { label: "Today", inactive: false, fresh: true };
  if (d < 7) return { label: `${d}d ago`, inactive: false, fresh: true };
  if (d < 30) return { label: `${d}d ago`, inactive: false, fresh: false };
  if (d < INACTIVE_DAYS) return { label: `${d}d ago`, inactive: false, fresh: false };
  return { label: `${d}d ago`, inactive: true, fresh: false };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("cognilytix_dark") === "true");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("cognilytix_dark", String(darkMode));
  }, [darkMode]);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-users");
      if (error) throw error;
      setUsers((data?.users ?? []) as UserRow[]);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    setDeletingId(u.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: u.user_id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Delete failed");
      setUsers(prev => prev.filter(x => x.user_id !== u.user_id));
      toast.success(`Removed ${u.display_name ?? u.email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const userCount = users.filter(u => u.role === "user").length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const inactiveCount = users.filter(u => activityLabel(u.last_sign_in_at).inactive).length;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Cognilytix Admin</span>
            <Badge variant="secondary" className="ml-2"><Shield className="mr-1 h-3 w-3" /> Admin</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:block">{user?.email}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, monitor activity, and remove inactive accounts.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{userCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{adminCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{users.length}</div></CardContent>
          </Card>
          <Card className={inactiveCount > 0 ? "border-amber-500/40" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Inactive ({INACTIVE_DAYS}d+)</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${inactiveCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{inactiveCount}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>All Accounts</CardTitle>
                <CardDescription>Users registered on the platform. Highlighted rows are inactive for {INACTIVE_DAYS}+ days.</CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {users.length === 0 ? "No accounts yet." : "No accounts match your search."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email / ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const act = activityLabel(u.last_sign_in_at);
                    const isSelf = u.user_id === user?.id;
                    return (
                      <TableRow key={u.user_id} className={act.inactive ? "bg-amber-500/5" : ""}>
                        <TableCell className="font-medium">
                          {u.display_name ?? "—"}
                          {isSelf && <Badge variant="outline" className="ml-2 text-[9px]">you</Badge>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{act.label}</TableCell>
                        <TableCell>
                          {act.inactive ? (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="mr-1 h-3 w-3" />Inactive
                            </Badge>
                          ) : act.fresh ? (
                            <Badge variant="outline" className="border-green-500/40 text-green-600 dark:text-green-400">● Active</Badge>
                          ) : (
                            <Badge variant="outline">Idle</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                disabled={isSelf || deletingId === u.user_id}
                                title={isSelf ? "You cannot delete yourself" : "Delete user"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {u.display_name ?? u.email}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes the account, profile, and role. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDelete(u)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
