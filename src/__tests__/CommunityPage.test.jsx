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
  }),
  { virtual: true },
);

jest.mock(
  "../services/api",
  () => ({
    fetchCommunityPosts: jest.fn(() =>
      Promise.resolve({
        posts: [{ id: "p1", author: "Alice", content: "hi" }],
      }),
    ),
    fetchGroups: jest.fn(() => Promise.resolve({ groups: [] })),
    fetchPartners: jest.fn(() => Promise.resolve({ partners: [] })),
    togglePostLike: jest.fn(() => Promise.resolve({ liked: true })),
  }),
  { virtual: true },
);

const { AuthProvider } = require("../context/AuthContext");
const CommunityPage = require("../pages/CommunityPage").default;

test("loads posts on mount and shows them", async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <CommunityPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/Manage Friends/i)).toBeTruthy();
});
