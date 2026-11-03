import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface WorkspaceSnapshot {
  version: 1;
  entries: Record<string, string>;
  draft?: Record<string, unknown>;
}

const OWNER = "cognilytix_workspace_owner";
let readyOwner: string | null = null;
let draft: Record<string, unknown> | undefined;
let capture: (() => void) | undefined;
const isWorkspaceKey = (key: string) => key === "cognilytix_projects" || key === "cognilytix_folders" || key.startsWith("cognilytix_project_");

export function clearWorkspace() {
  Object.keys(localStorage).filter(isWorkspaceKey).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem(OWNER);
  readyOwner = null;
  draft = undefined;
  capture = undefined;
}

export function setWorkspaceDraft(value: Record<string, unknown> | undefined) { draft = value; }
export function getWorkspaceDraft() { return draft; }
export function registerWorkspaceCapture(fn: () => void) {
  capture = fn;
  return () => { if (capture === fn) capture = undefined; };
}

export function collectWorkspace(): WorkspaceSnapshot {
  capture?.();
  const entries: Record<string, string> = {};
  Object.keys(localStorage).filter(isWorkspaceKey).forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  });
  return { version: 1, entries, draft };
}

export function applyWorkspace(userId: string, snapshot: WorkspaceSnapshot | null) {
  clearWorkspace();
  if (snapshot?.version === 1) {
    Object.entries(snapshot.entries ?? {}).forEach(([key, value]) => {
      if (isWorkspaceKey(key) && typeof value === "string") localStorage.setItem(key, value);
    });
    draft = snapshot.draft;
  }
  localStorage.setItem(OWNER, userId);
  readyOwner = userId;
}

export async function restoreWorkspace(userId: string) {
  if (readyOwner === userId) return;
  const { data, error } = await supabase.from("account_workspaces").select("snapshot").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  applyWorkspace(userId, data?.snapshot as unknown as WorkspaceSnapshot | null);
}

export async function saveWorkspace(userId: string) {
  if (readyOwner !== userId || localStorage.getItem(OWNER) !== userId) throw new Error("Your saved reports have not finished loading. Please try again.");
  const snapshot = collectWorkspace();
  const { error } = await supabase.from("account_workspaces").upsert({ user_id: userId, snapshot: JSON.parse(JSON.stringify(snapshot)) as Json, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function saveThenSignOut(save: () => Promise<void>, logout: () => Promise<void>) {
  await save();
  await logout();
}