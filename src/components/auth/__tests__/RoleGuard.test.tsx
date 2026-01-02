/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { UserRole } from "@/generated/prisma";
import RoleGuard from "../RoleGuard";

// Simple test component
const TestComponent = () => <div>Protected Content</div>;

// Mock the modules before tests
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams("param=value"),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// Tests
describe("RoleGuard", () => {
  // Test the loading state
  it("shows loading state when session is loading", () => {
    // Mock the session as loading
    require("next-auth/react").useSession.mockReturnValue({
      data: null,
      status: "loading",
      update: jest.fn(),
    });

    const { getByText } = render(
      <RoleGuard requiredRole={UserRole.institution}>
        <TestComponent />
      </RoleGuard>
    );

    expect(getByText("Verifying permissions...")).toBeInTheDocument();
  });

  it("redirects to login when user is not authenticated", () => {
    // Mock the session as unauthenticated
    require("next-auth/react").useSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: jest.fn(),
    });

    const mockPush = jest.fn();
    require("next/navigation").useRouter = () => ({
      push: mockPush,
      replace: jest.fn(),
    });

    render(
      <RoleGuard requiredRole={UserRole.institution}>
        <TestComponent />
      </RoleGuard>
    );

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/login"));
  });

  it("renders children when user has the required role", () => {
    // Mock the session as authenticated with the required role
    require("next-auth/react").useSession.mockReturnValue({
      data: {
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          role: UserRole.institution,
        },
        expires: "2025-01-01T00:00:00.000Z",
      },
      status: "authenticated",
      update: jest.fn(),
    });

    const { getByText } = render(
      <RoleGuard requiredRole={UserRole.institution}>
        <TestComponent />
      </RoleGuard>
    );

    expect(getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects when user has insufficient permissions", () => {
    // Mock the session as authenticated but with insufficient role
    require("next-auth/react").useSession.mockReturnValue({
      data: {
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          role: UserRole.institution, // Lower role
        },
        expires: "2025-01-01T00:00:00.000Z",
      },
      status: "authenticated",
      update: jest.fn(),
    });

    const mockPush = jest.fn();
    require("next/navigation").useRouter = () => ({
      push: mockPush,
      replace: jest.fn(),
    });

    render(
      <RoleGuard requiredRole={UserRole.admin}>
        {" "}
        {/* Higher role requirement */}
        <TestComponent />
      </RoleGuard>
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/unauthorized")
    );
  });
});
