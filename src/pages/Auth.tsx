import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { Brain, Mail, Lock, User as UserIcon, Shield, Loader2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ADMIN_DOMAIN = "admin.cognilytix.local";

const adminSchema = z.object({
  userId: z
    .string()
    .trim()
    .min(2, "User ID is required")
    .max(100)
    .regex(/^[A-Za-z][A-Za-z0-9._-]*@\d+$/, "Format: name@1234"),
  password: z.string().min(6, "Password must be at least 6 characters").max(200),
});

const userSignupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

const userLoginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password is required").max(200),
});

function userIdToEmail(userId: string) {
  const sanitized = userId.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${sanitized}@${ADMIN_DOMAIN}`;
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role, loading: authLoading } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("cognilytix_dark") === "true");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("cognilytix_dark", String(darkMode));
  }, [darkMode]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && session && role) {
      const from = (location.state as { from?: string } | null)?.from;
      if (role === "admin") navigate("/admin", { replace: true });
      else navigate(from && from !== "/auth" ? from : "/dashboard", { replace: true });
    }
  }, [session, role, authLoading, navigate, location.state]);

  // ── Admin state ──
  const [adminUserId, setAdminUserId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // ── User state ──
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userError, setUserError] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    const parsed = adminSchema.safeParse({ userId: adminUserId, password: adminPassword });
    if (!parsed.success) {
      setAdminError(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setAdminLoading(true);
    try {
      const internalEmail = userIdToEmail(parsed.data.userId);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: parsed.data.password,
      });
      if (error || !data.session) {
        setAdminError("Invalid Admin credentials");
        return;
      }
      // Verify admin role
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        await supabase.auth.signOut();
        setAdminError("This account does not have admin access.");
        return;
      }
      toast.success("Welcome, Admin");
      navigate("/admin", { replace: true });
    } catch (err) {
      setAdminError("Invalid Admin credentials");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUserSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    const parsed = userSignupSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setUserError(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setUserLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: parsed.data.name, name: parsed.data.name },
        },
      });
      if (error) {
        setUserError(error.message);
        return;
      }
      if (data.session) {
        toast.success("Account created — welcome!");
        navigate("/dashboard", { replace: true });
      } else {
        toast.success("Account created! You can now sign in.");
        setMode("login");
      }
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setUserLoading(false);
    }
  };

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    const parsed = userLoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setUserError(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }
    setUserLoading(true);
    try {
      // Block users from signing in via the reserved admin domain on the User tab
      if (parsed.data.email.endsWith(`@${ADMIN_DOMAIN}`)) {
        setUserError("Please use the Admin tab for admin accounts.");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) {
        setUserError("Invalid email or password");
        return;
      }
      toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setUserError("Login failed");
    } finally {
      setUserLoading(false);
    }
  };

  const handleGoogle = async () => {
    setUserError("");
    setUserLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        setUserError("Google sign-in failed");
        setUserLoading(false);
        return;
      }
      if (result.redirected) return;
      // Tokens already set
      navigate("/dashboard", { replace: true });
    } catch {
      setUserError("Google sign-in failed");
      setUserLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setUserError("Enter your email above first");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Cognilytix AI</span>
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </nav>

      <div className="container flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">Welcome to Cognilytix</CardTitle>
            <CardDescription>Sign in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user">
                  <UserIcon className="mr-2 h-4 w-4" /> User
                </TabsTrigger>
                <TabsTrigger value="admin">
                  <Shield className="mr-2 h-4 w-4" /> Admin
                </TabsTrigger>
              </TabsList>

              {/* USER TAB */}
              <TabsContent value="user" className="mt-6 space-y-4">
                <div className="flex gap-1 rounded-md bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setUserError(""); }}
                    className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition ${mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setUserError(""); }}
                    className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition ${mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                  >
                    Sign Up
                  </button>
                </div>

                <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={userLoading}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or with email</span>
                  </div>
                </div>

                <form onSubmit={mode === "signup" ? handleUserSignup : handleUserLogin} className="space-y-3">
                  {mode === "signup" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="pl-9" autoComplete="name" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9" autoComplete="email" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} className="pl-9" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                    </div>
                    {mode === "login" && (
                      <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>

                  {userError && (
                    <Alert variant="destructive"><AlertDescription>{userError}</AlertDescription></Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={userLoading}>
                    {userLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === "signup" ? "Create account" : "Login"}
                  </Button>
                </form>
              </TabsContent>

              {/* ADMIN TAB */}
              <TabsContent value="admin" className="mt-6 space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Admin accounts are pre-created. Use your assigned User ID (format: <span className="font-mono">name@1234</span>).
                  </AlertDescription>
                </Alert>
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-id">User ID</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="admin-id" value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} placeholder="alex@4823" className="pl-9 font-mono" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-pass">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="admin-pass" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="pl-9" autoComplete="current-password" />
                    </div>
                  </div>
                  {adminError && (
                    <Alert variant="destructive"><AlertDescription>{adminError}</AlertDescription></Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={adminLoading}>
                    {adminLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login as Admin
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}