import { beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ upsert: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ upsert: api.upsert, select: () => ({ eq: () => ({ maybeSingle: api.maybeSingle }) }) }) } }));
import { applyWorkspace, clearWorkspace, collectWorkspace, getWorkspaceDraft, registerWorkspaceCapture, restoreWorkspace, saveThenSignOut, saveWorkspace, setWorkspaceDraft } from "./workspace";

beforeEach(() => { localStorage.clear(); clearWorkspace(); vi.clearAllMocks(); api.upsert.mockResolvedValue({ error: null }); });
describe("account report persistence", () => {
  it("saves current report results before signing out", async () => {
    applyWorkspace("account-a", null);
    registerWorkspaceCapture(() => setWorkspaceDraft({ fileName: "Sales.csv", report: { story: "Revenue increased", predictions: ["Sales forecast 120"] } }));
    const logout = vi.fn();
    await saveThenSignOut(() => saveWorkspace("account-a"), logout);
    expect(api.upsert.mock.calls[0][0].snapshot.draft.report.predictions).toEqual(["Sales forecast 120"]);
    expect(api.upsert.mock.invocationCallOrder[0]).toBeLessThan(logout.mock.invocationCallOrder[0]);
  });
  it("does not sign out if reports cannot be saved", async () => {
    const logout = vi.fn();
    await expect(saveThenSignOut(async () => { throw new Error("offline"); }, logout)).rejects.toThrow("offline");
    expect(logout).not.toHaveBeenCalled();
  });
  it("restores saved reports for the same account from the cloud", async () => {
    api.maybeSingle.mockResolvedValue({ data: { snapshot: { version: 1, entries: { cognilytix_projects: '[{"id":"report-a"}]' }, draft: { fileName: "Sales.csv", report: { story: "Saved narrative" } } } }, error: null });
    await restoreWorkspace("account-a");
    expect(getWorkspaceDraft()?.report).toEqual({ story: "Saved narrative" });
    expect(localStorage.getItem("cognilytix_projects")).toBe('[{"id":"report-a"}]');
  });
  it("does not expose one account's browser reports to another account", async () => {
    applyWorkspace("account-a", { version: 1, entries: { cognilytix_project_private: "secret" }, draft: { fileName: "Private.csv" } });
    applyWorkspace("account-b", null);
    expect(getWorkspaceDraft()).toBeUndefined();
    expect(collectWorkspace().entries).toEqual({});
    await expect(saveWorkspace("account-a")).rejects.toThrow("not finished loading");
  });
  it("never saves authentication tokens or unrelated browser settings", () => {
    localStorage.setItem("sb-auth-token", "private-token");
    localStorage.setItem("cognilytix_dark", "true");
    localStorage.setItem("cognilytix_projects", "[]");
    expect(collectWorkspace().entries).toEqual({ cognilytix_projects: "[]" });
  });
});