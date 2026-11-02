import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus, Loader2, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { customerStorySchema, type CustomerStory } from "@/lib/customer-stories";

export default function CustomerStories() {
  const [open, setOpen] = useState(false);
  const [stories, setStories] = useState<CustomerStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState({ name: "", email: "", description: "", suggestions: "" });
  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    setLoadError(false);
    const { data, error: readError } = await supabase.rpc("list_customer_stories", { _offset: offset });
    if (readError) setLoadError(true);
    else {
      setStories(current => offset === 0 ? data ?? [] : [...current, ...(data ?? [])]);
      setMore((data?.length ?? 0) === 12);
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const parsed = customerStorySchema.safeParse(fields);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your details."); return; }
    setBusy(true);
    const { error: submitError } = await supabase.rpc("submit_customer_story", {
      _name: parsed.data.name, _email: parsed.data.email,
      _description: parsed.data.description, _suggestions: parsed.data.suggestions || null,
    });
    setBusy(false);
    if (submitError) {
      setError(submitError.message.includes("wait a minute") ? "Please wait a minute before submitting another comment." : "Your comment could not be saved. Please try again.");
      return;
    }
    setFields({ name: "", email: "", description: "", suggestions: "" });
    setOpen(false);
    setMessage("Thank you! Your comment has been added to Customer Stories.");
    await load();
  }

  return (
    <div className="mt-12 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-foreground">Customer Stories</h2>
        <Button variant="outline" onClick={() => { setError(""); setOpen(true); }}>
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Comment
        </Button>
      </div>
      {message && <p role="status" className="mt-4 text-sm text-primary">{message}</p>}
      {loadError ? <div role="alert" className="mt-6 text-sm text-muted-foreground">Customer stories could not be loaded. <Button variant="link" onClick={() => void load()}>Try again</Button></div>
        : !loading && stories.length === 0 && <p className="mt-6 text-muted-foreground">No customer stories yet.</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {stories.map(story => (
          <article key={story.id} className="min-w-0 rounded-lg border border-border bg-card p-6">
            <Quote className="mb-3 h-5 w-5 text-primary" />
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">{story.description}</p>
            {story.suggestions && <div className="mt-4 border-t border-border pt-3"><h3 className="text-xs font-semibold text-muted-foreground">Suggestions</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{story.suggestions}</p></div>}
            <p className="mt-4 break-words font-semibold text-foreground">{story.name}</p>
            <time dateTime={story.created_at} className="text-xs text-muted-foreground">{new Date(story.created_at).toLocaleDateString()}</time>
          </article>
        ))}
      </div>
      {loading && <p role="status" className="mt-4 text-sm text-muted-foreground">Loading customer stories…</p>}
      {more && <Button variant="outline" className="mt-6" disabled={loading} onClick={() => void load(stories.length)}>More stories</Button>}
      <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto">
          <DialogHeader><DialogTitle>Leave a comment</DialogTitle><DialogDescription>Your name, description and suggestions will be public in Customer Stories. Your email stays private. Commenting is optional.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="comment-name">Name *</Label><Input id="comment-name" autoComplete="name" required maxLength={100} value={fields.name} onChange={e => setFields({ ...fields, name: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="comment-email">Email *</Label><Input id="comment-email" type="email" autoComplete="email" required maxLength={254} value={fields.email} onChange={e => setFields({ ...fields, email: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="comment-description">Description *</Label><Textarea id="comment-description" required maxLength={2000} rows={4} value={fields.description} onChange={e => setFields({ ...fields, description: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="comment-suggestions">Suggestions (optional)</Label><Textarea id="comment-suggestions" maxLength={1000} rows={3} value={fields.suggestions} onChange={e => setFields({ ...fields, suggestions: e.target.value })} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit comment</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}