import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function SignOutConfirmation({ open, onCancel, onContinue }: { open: boolean; onCancel: () => void; onContinue: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const proceed = async () => {
    setSaving(true);
    setError("");
    try { await onContinue(); }
    catch { setError("Your reports could not be saved. You are still signed in. Please try again."); }
    finally { setSaving(false); }
  };
  return <AlertDialog open={open} onOpenChange={value => { if (!value && !saving) { setError(""); onCancel(); } }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Save reports and sign out?</AlertDialogTitle>
        <AlertDialogDescription>Continue to save your reports to your account and sign out. Your saved work will be restored when you sign in to the same account again.</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter>
        <Button variant="outline" disabled={saving} onClick={() => { setError(""); onCancel(); }}>Cancel</Button>
        <Button disabled={saving} onClick={proceed}>{saving ? "Saving reports…" : "Continue"}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}