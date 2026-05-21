import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => jest.fn(),
  }),
  { virtual: true },
);

const MemoryRouter = ({ children }) => <>{children}</>;

jest.mock(
  "../context/AuthContext",
  () => ({
    AuthProvider: ({ children }) => children,
    useAuth: () => ({ user: { id: "u1" } }),
  }),
  { virtual: true },
);

jest.mock(
  "../services/api",
  () => ({
    fetchFriends: jest.fn(() => Promise.resolve([])),
    fetchFriendRequests: jest.fn(() =>
      Promise.resolve({ incoming: [], outgoing: [] }),
    ),
    searchUsers: jest.fn((q) =>
      Promise.resolve({
        users: [{ id: "u1", name: "Alice", email: "alice@example.com" }],
      }),
    ),
    sendFriendRequest: jest.fn(() => Promise.resolve({ id: "fr1" })),
  }),
  { virtual: true },
);

const { AuthProvider } = require("../context/AuthContext");
const FriendsPage = require("../pages/Community/FriendsPage").default;

test("renders friends page shell", async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <FriendsPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(
    screen.getByPlaceholderText(/Search users by name or email/i),
  ).toBeTruthy();
  expect(screen.getByText(/Send Request/i)).toBeTruthy();
});
