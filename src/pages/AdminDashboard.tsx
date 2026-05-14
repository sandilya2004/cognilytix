import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, Users, Shield, LogOut, Moon, Sun, BarChart3, Search, Trash2,
  AlertTriangle, LayoutDashboard, Inbox, Activity, Settings as SettingsIcon,
  Check, X, KeyRound, UserMinus, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

interface PendingRequest {
  id: string;
  email: string;
  display_name: string | null;
  request_type: "user" | "admin";
  status: "pending" | "approved" | "rejected";
  message: string | null;
  created_at: string;
}

const INACTIVE_DAYS = 60;
const LOW_DAYS = 30;

type Section = "overview" | "users" | "requests" | "activity" | "settings";

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function activityStatus(iso: string | null): { label: string; tone: "active" | "low" | "inactive" } {
  const d = daysSince(iso);
  if (d === null) return { label: "Never", tone: "inactive" };
  if (d < LOW_DAYS) return { label: d <= 1 ? "Today" : `${d}d ago`, tone: "active" };
  if (d < INACTIVE_DAYS) return { label: `${d}d ago`, tone: "low" };
  return { label: `${d}d ago`, tone: "inactive" };
}

const NAV_ITEMS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "requests", label: "Requests", icon: Inbox },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [demotingId, setDemotingId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetting, setResetting] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("cognilytix_dark") === "true");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("cognilytix_dark", String(darkMode));
  }, [darkMode]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [usersRes, reqsRes] = await Promise.all([
        supabase.functions.invoke("admin-list-users"),
        supabase.from("pending_requests").select("*").order("created_at", { ascending: false }),
      ]);
      if (usersRes.error) throw usersRes.error;
      setUsers((usersRes.data?.users ?? []) as UserRow[]);
      if (!reqsRes.error) setRequests((reqsRes.data ?? []) as PendingRequest[]);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    setDeletingId(u.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", { body: { user_id: u.user_id } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Delete failed");
      setUsers(prev => prev.filter(x => x.user_id !== u.user_id));
      toast.success(`Removed ${u.display_name ?? u.email}. Email notification queued.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemoveAdmin = async (u: UserRow) => {
    setDemotingId(u.user_id);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", u.user_id)
        .eq("role", "admin");
      if (error) throw error;
      // Insert user role to ensure they retain access as a regular user
      await supabase.from("user_roles").insert({ user_id: u.user_id, role: "user" }).select();
      setUsers(prev => prev.map(x => x.user_id === u.user_id ? { ...x, role: "user" } : x));
      toast.success(`Removed admin access from ${u.display_name ?? u.email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove admin");
    } finally {
      setDemotingId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (resetPwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: resetTarget.user_id, new_password: resetPwd },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Reset failed");
      toast.success(`Password updated for ${resetTarget.display_name ?? resetTarget.email}`);
      setResetTarget(null);
      setResetPwd("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handleRequestAction = async (req: PendingRequest, action: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("pending_requests")
        .update({ status: action, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq("id", req.id);
      if (error) throw error;
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: action } : r));
      toast.success(`Request ${action}`);
    } catch {
      toast.error("Action failed");
    }
  };

  const handleRequestDelete = async (req: PendingRequest) => {
    try {
      const { error } = await supabase.from("pending_requests").delete().eq("id", req.id);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== req.id));
      toast.success("Request removed");
    } catch {
      toast.error("Delete failed");
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

  const counts = useMemo(() => {
    const userCount = users.filter(u => u.role === "user").length;
    const adminCount = users.filter(u => u.role === "admin").length;
    let active = 0, inactive = 0;
    for (const u of users) {
      const t = activityStatus(u.last_sign_in_at).tone;
      if (t === "active") active++;
      if (t === "inactive") inactive++;
    }
    const pending = requests.filter(r => r.status === "pending").length;
    return { userCount, adminCount, active, inactive, pending };
  }, [users, requests]);

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* SIDEBAR */}
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col sticky top-0 h-screen">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm font-bold leading-none">Cognilytix</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Admin Console</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = section === item.id;
            const showBadge = item.id === "requests" && counts.pending > 0;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {showBadge && (
                  <Badge className="h-5 min-w-5 text-[10px] px-1.5">{counts.pending}</Badge>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <div className="px-3 py-2 text-xs">
            <p className="font-medium text-foreground truncate">{user?.email}</p>
            <Badge variant="secondary" className="mt-1 text-[9px]"><Shield className="mr-1 h-2.5 w-2.5" /> Admin</Badge>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {darkMode ? "Light mode" : "Dark mode"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-red-600 hover:text-red-700" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground capitalize">{section === "overview" ? "Dashboard" : section}</h1>
            <p className="text-xs text-muted-foreground">
              {section === "overview" && "Platform overview at a glance"}
              {section === "users" && "Manage all platform accounts"}
              {section === "requests" && "Approve or reject access requests"}
              {section === "activity" && "Track user engagement"}
              {section === "settings" && "Admin tools and credentials"}
            </p>
          </div>
          {section === "users" && (
            <div className="relative w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          )}
        </header>

        <div className="p-6 space-y-6">
          {/* OVERVIEW */}
          {section === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard label="Total Users" value={counts.userCount} icon={Users} accent="from-indigo-500 to-purple-500" />
                <KpiCard label="Total Admins" value={counts.adminCount} icon={Shield} accent="from-emerald-500 to-teal-500" />
                <KpiCard label="Active Users" value={counts.active} icon={Activity} accent="from-sky-500 to-blue-500" />
                <KpiCard label="Inactive Users" value={counts.inactive} icon={AlertTriangle} accent="from-amber-500 to-orange-500" />
                <KpiCard label="Pending Requests" value={counts.pending} icon={Inbox} accent="from-rose-500 to-pink-500" highlight={counts.pending > 0} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Most recently active accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <UserTable
                    users={[...users].sort((a, b) => {
                      const aT = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
                      const bT = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
                      return bT - aT;
                    }).slice(0, 5)}
                    loading={loading}
                    selfId={user?.id}
                    deletingId={deletingId}
                    demotingId={demotingId}
                    onDelete={handleDelete}
                    onRemoveAdmin={handleRemoveAdmin}
                    onResetPwd={(u) => { setResetTarget(u); setResetPwd(""); }}
                    compact
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* USERS */}
          {section === "users" && (
            <Card>
              <CardHeader>
                <CardTitle>All Accounts</CardTitle>
                <CardDescription>Highlighted rows show inactive accounts ({INACTIVE_DAYS}+ days).</CardDescription>
              </CardHeader>
              <CardContent>
                <UserTable
                  users={filtered}
                  loading={loading}
                  selfId={user?.id}
                  deletingId={deletingId}
                  demotingId={demotingId}
                  onDelete={handleDelete}
                  onRemoveAdmin={handleRemoveAdmin}
                  onResetPwd={(u) => { setResetTarget(u); setResetPwd(""); }}
                />
              </CardContent>
            </Card>
          )}

          {/* REQUESTS */}
          {section === "requests" && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>Approve or reject new user / admin access requests.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : requests.length === 0 ? (
                  <div className="py-12 text-center">
                    <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No pending requests</p>
                    <p className="text-xs text-muted-foreground mt-1">New access requests will appear here for review.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.display_name ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{r.email}</TableCell>
                          <TableCell>
                            <Badge variant={r.request_type === "admin" ? "default" : "secondary"}>{r.request_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              r.status === "approved" ? "border-green-500/40 text-green-600 dark:text-green-400" :
                              r.status === "rejected" ? "border-red-500/40 text-red-600 dark:text-red-400" :
                              "border-amber-500/40 text-amber-600 dark:text-amber-400"
                            }>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right space-x-1">
                            {r.status === "pending" && (
                              <>
                                <Button size="sm" variant="ghost" className="h-8 text-green-600 hover:text-green-700 hover:bg-green-500/10" onClick={() => handleRequestAction(r, "approved")}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10" onClick={() => handleRequestAction(r, "rejected")}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-8 text-red-600 hover:text-red-700 hover:bg-red-500/10" onClick={() => handleRequestDelete(r)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* ACTIVITY */}
          {section === "activity" && (
            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>Status indicators: 🟢 Active &lt;{LOW_DAYS}d • 🟡 Low Activity • 🔴 Inactive {INACTIVE_DAYS}+ days</CardDescription>
              </CardHeader>
              <CardContent>
                <UserTable
                  users={users}
                  loading={loading}
                  selfId={user?.id}
                  deletingId={deletingId}
                  demotingId={demotingId}
                  onDelete={handleDelete}
                  onRemoveAdmin={handleRemoveAdmin}
                  onResetPwd={(u) => { setResetTarget(u); setResetPwd(""); }}
                />
              </CardContent>
            </Card>
          )}

          {/* SETTINGS */}
          {section === "settings" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Admin Password Management</CardTitle>
                  <CardDescription>Reset passwords for any admin or user account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Use the <KeyRound className="inline h-3 w-3" /> icon next to any account in the Users tab to reset their password.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSection("users")}>
                    Go to Users
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Future Enhancements</CardTitle>
                  <CardDescription>Planned admin capabilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Drag-and-drop user organization</li>
                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Pending-request workflow improvements</li>
                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Automated email notifications</li>
                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Sidebar expansion system</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-medium">{resetTarget?.display_name ?? resetTarget?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-pwd">New password</Label>
            <Input id="new-pwd" type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetTarget(null)} disabled={resetting}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetting || resetPwd.length < 6}>
              {resetting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent, highlight }: {
  label: string; value: number | string; icon: typeof Users; accent: string; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-rose-500/40" : ""}>
      <CardContent className="p-4">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${accent} text-white mb-3`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function UserTable({
  users, loading, selfId, deletingId, demotingId, onDelete, onRemoveAdmin, onResetPwd, compact,
}: {
  users: UserRow[];
  loading: boolean;
  selfId?: string;
  deletingId: string | null;
  demotingId: string | null;
  onDelete: (u: UserRow) => void;
  onRemoveAdmin: (u: UserRow) => void;
  onResetPwd: (u: UserRow) => void;
  compact?: boolean;
}) {
  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (users.length === 0) return <div className="py-8 text-center text-sm text-muted-foreground">No accounts to display.</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Last Active</TableHead>
          <TableHead>Status</TableHead>
          {!compact && <TableHead>Joined</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(u => {
          const act = activityStatus(u.last_sign_in_at);
          const isSelf = u.user_id === selfId;
          const rowBg = act.tone === "inactive" ? "bg-red-500/5" : act.tone === "low" ? "bg-amber-500/5" : "";
          return (
            <TableRow key={u.user_id} className={rowBg}>
              <TableCell className="font-medium">
                {u.display_name ?? "—"}
                {isSelf && <Badge variant="outline" className="ml-2 text-[9px]">you</Badge>}
              </TableCell>
              <TableCell className="font-mono text-xs">{u.email}</TableCell>
              <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{act.label}</TableCell>
              <TableCell>
                {act.tone === "active" && <Badge variant="outline" className="border-green-500/40 text-green-600 dark:text-green-400">🟢 Active</Badge>}
                {act.tone === "low" && <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">🟡 Low Activity</Badge>}
                {act.tone === "inactive" && <Badge variant="outline" className="border-red-500/40 text-red-600 dark:text-red-400">🔴 Inactive</Badge>}
              </TableCell>
              {!compact && <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Reset password" onClick={() => onResetPwd(u)} disabled={isSelf}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  {u.role === "admin" && !isSelf && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-500/10" title="Remove admin access" disabled={demotingId === u.user_id}>
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {u.display_name ?? u.email} will lose admin privileges but keep their account as a regular user.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRemoveAdmin(u)}>Remove Admin</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-500/10" disabled={isSelf || deletingId === u.user_id} title={isSelf ? "Cannot delete yourself" : "Delete user"}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {u.display_name ?? u.email}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the account, profile, role, and revokes portal access. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => onDelete(u)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}