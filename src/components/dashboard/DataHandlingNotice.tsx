import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function DataHandlingNotice() {
  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground space-y-2" aria-label="How your data is handled">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" /> How your data is handled
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Storage:</strong> your file is read in this browser. Saved projects stay in this browser only. Shared reports are stored in your account.</li>
        <li><strong>AI processing:</strong> AI features send column names, summary figures, a few sample rows and your questions to an AI provider — not the whole file.</li>
        <li><strong>Retention:</strong> browser data stays until you delete it; shared reports stay until you delete them.</li>
        <li><strong>Deletion:</strong> use Reset to clear the current file, delete projects on the Projects page, and delete shared reports on the Reports page.</li>
      </ul>
      <p>
        Details: <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> ·{" "}
        <Link to="/terms" className="text-primary underline">Terms of Service</Link>
      </p>
    </div>
  );
}
