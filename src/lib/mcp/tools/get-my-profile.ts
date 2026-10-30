import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in user's Cognilytix profile (display name, email and role).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId() ?? "";
    const [{ data: profile, error }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("display_name, created_at").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (error) throw new ToolError("Could not load your profile.");
    const result = {
      display_name: profile?.display_name ?? null,
      email: ctx.getUserEmail() ?? null,
      roles: (roles ?? []).map((r) => String(r.role)),
      member_since: profile?.created_at ?? null,
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: { profile: result } };
  },
});
