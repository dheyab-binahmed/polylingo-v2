import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

window.HTMLElement.prototype.scrollIntoView = jest.fn();

jest.mock("../services/api", () => ({
  getDmMessages: jest.fn((id) =>
    Promise.resolve({ messages: [{ id: 1, from: "alice", text: "hi" }] }),
  ),
  postDmMessage: jest.fn((id, text) =>
    Promise.resolve({ id: 2, text, created_at: new Date().toISOString() }),
  ),
}));

jest.mock("../services/socket", () => ({
  connectSocket: jest.fn(),
  disconnectSocket: jest.fn(),
  endCall: jest.fn(),
  onCallAnswered: jest.fn(() => jest.fn()),
  onCallEnded: jest.fn(() => jest.fn()),
  onCallIce: jest.fn(() => jest.fn()),
  onCallIncoming: jest.fn(() => jest.fn()),
  onDmMessage: jest.fn(() => jest.fn()),
  sendCallAnswer: jest.fn(),
  sendCallOffer: jest.fn(),
  sendDM: jest.fn(),
  sendIceCandidate: jest.fn(),
}));

const DMModal = require("../components/components/partners/DMModal").default;

test("loads messages on open and can send", async () => {
  const partner = { id: "u1", name: "Alice", initials: "AL", color: "#000" };
  render(<DMModal partner={partner} onClose={() => {}} />);
  await waitFor(() =>
    expect(screen.getByText(/Say hello to Alice!/)).toBeTruthy(),
  );
});
