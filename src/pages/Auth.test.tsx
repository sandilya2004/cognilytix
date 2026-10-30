import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Auth from "./Auth";

const auth = vi.hoisted(() => ({
  signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: {} } }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ session: null, role: null, loading: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("auth entry navigation", () => {
  it("uses registration for the homepage signup destination", async () => {
    render(<MemoryRouter initialEntries={["/auth?mode=signup"]}><Auth /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Navigation Test" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "navigation@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password-only" } });
    const form = screen.getByLabelText("Email").closest("form");
    if (!form) throw new Error("Missing auth form");
    fireEvent.submit(form);
    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith({
      email: "navigation@example.invalid",
      password: "test-password-only",
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: "Navigation Test", name: "Navigation Test" },
      },
    }));
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("preserves login for the existing auth destination", async () => {
    render(<MemoryRouter initialEntries={["/auth"]}><Auth /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "navigation@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password-only" } });
    const form = screen.getByLabelText("Email").closest("form");
    if (!form) throw new Error("Missing auth form");
    fireEvent.submit(form);
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "navigation@example.invalid", password: "test-password-only",
    }));
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});