import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignOutConfirmation from "./SignOutConfirmation";

describe("sign-out decisions", () => {
  it("Cancel keeps the user signed in without saving", () => {
    const cancel = vi.fn(); const proceed = vi.fn();
    render(<SignOutConfirmation open onCancel={cancel} onContinue={proceed} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(proceed).not.toHaveBeenCalled();
  });
  it("Continue runs saving and reports a failure without closing", async () => {
    const cancel = vi.fn(); const proceed = vi.fn().mockRejectedValue(new Error("offline"));
    render(<SignOutConfirmation open onCancel={cancel} onContinue={proceed} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(proceed).toHaveBeenCalledOnce());
    await screen.findByRole("alert");
    expect(cancel).not.toHaveBeenCalled();
  });
});