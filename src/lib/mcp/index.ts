import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyReports from "./tools/list-my-reports";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "insight-spark",
  title: "Insight Spark",
  version: "0.1.0",
  instructions:
    "Tools for Cognilytix AI. Read the signed-in user's profile and the analytics reports they have shared. Uploaded datasets and dashboards stay in the user's browser and are not available here.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyReports],
});
