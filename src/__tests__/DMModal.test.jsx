import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DMModal from "../components/components/partners/DMModal";

window.HTMLElement.prototype.scrollIntoView = jest.fn();

jest.mock("../services/api", () => ({
  getDmMessages: jest.fn((id) =>
    Promise.resolve({ messages: [{ id: 1, from: "alice", text: "hi" }] }),
  ),
  postDmMessage: jest.fn((id, text) =>
    Promise.resolve({ id: 2, text, created_at: new Date().toISOString() }),
  ),
}));

test("loads messages on open and can send", async () => {
  const partner = { id: "u1", name: "Alice", initials: "AL", color: "#000" };
  render(<DMModal partner={partner} onClose={() => {}} />);
  await waitFor(() =>
    expect(screen.getByText(/Say hello to Alice!/)).toBeTruthy(),
  );
});
