import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_shared_reports",
  title: "List my shared reports",
  description: "List the reports the signed-in user has shared, newest first (title, permission, expiry, link path).",
  inputSchema: { limit: z.number().int().min(1).max(100).optional().describe("Maximum reports to return (default 25).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("shared_reports")
      .select("id, title, permission, expires_at, created_at, password_hash")
      .eq("owner_id", ctx.getUserId() ?? "")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (error) throw new ToolError("Could not load your reports.");
    const reports = (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      permission: r.permission,
      password_protected: Boolean(r.password_hash),
      expires_at: r.expires_at,
      created_at: r.created_at,
      link_path: `/report/${r.id}`,
    }));
    return { content: [{ type: "text", text: JSON.stringify(reports) }], structuredContent: { reports } };
  },
});
