import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, Trash2, ExternalLink, Copy, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Row {
  id: string;
  title: string;
  permission: string;
  created_at: string;
  expires_at: string | null;
  password_hash: string | null;
}

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shared_reports")
      .select("id,title,permission,created_at,expires_at,password_hash")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const del = async (id: string) => {
    if (!confirm("Delete this shared report? The link will stop working.")) return;
    const { error } = await supabase.from("shared_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/report/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold">Report History</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Shared Reports</h1>
          <p className="text-sm text-muted-foreground">Every report you've shared via secure link.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-60" />
              <p>No shared reports yet.</p>
              <Button className="mt-4" variant="hero" size="sm" onClick={() => navigate("/dashboard")}>
                Go to dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => {
              const expired = r.expires_at && new Date(r.expires_at) < new Date();
              return (
                <Card key={r.id} className={expired ? "opacity-60" : ""}>
                  <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{r.title}</p>
                        <Badge variant="outline" className="text-[10px] uppercase">{r.permission}</Badge>
                        {r.password_hash && <Badge variant="secondary" className="text-[10px]">Password</Badge>}
                        {expired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(r.created_at).toLocaleString()}
                        {r.expires_at && ` · Expires ${new Date(r.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => copyLink(r.id)}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(`/report/${r.id}`, "_blank")}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => del(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}