import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "../src/features/auth/components/LoginForm";
import { RegisterForm } from "../src/features/auth/components/RegisterForm";
import { renderWithProviders, resetAuthStore } from "./test-utils";
import { useAuthStore } from "../src/store/auth-store";

const loginMock = vi.fn();
const registerMock = vi.fn();
const logoutMock = vi.fn();
const meMock = vi.fn();
const pingMock = vi.fn();

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("../src/features/auth/api", () => ({
  authApi: {
    login: (...args: any[]) => loginMock(...args),
    register: (...args: any[]) => registerMock(...args),
    logout: (...args: any[]) => logoutMock(...args),
    me: (...args: any[]) => meMock(...args),
    ping: (...args: any[]) => pingMock(...args),
  },
}));

describe("Auth forms", () => {
  beforeEach(() => {
    resetAuthStore();
    vi.clearAllMocks();
  });

  it("logs in successfully", async () => {
    loginMock.mockResolvedValue({
      token: "token-123",
      user: { id: 1, email: "user@example.com" },
    });

    const user = userEvent.setup();
    const { history } = renderWithProviders(<LoginForm />, { route: "/login" });

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalled();
    });

    const [variables] = loginMock.mock.calls[0];
    expect(variables).toMatchObject({
      email: "user@example.com",
      password: "password123",
    });

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe("token-123");
    });

    await waitFor(() => {
      expect(history.location.pathname).toBe("/board");
    });
  });

  it("shows validation errors for invalid login", async () => {
    loginMock.mockRejectedValue({
      response: { data: { message: "Invalid credentials" } },
    });

    const user = userEvent.setup();
    const { history } = renderWithProviders(<LoginForm />, { route: "/login" });

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalled();
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(history.location.pathname).toBe("/login");
  });

  it("registers a new user", async () => {
    registerMock.mockResolvedValue({
      token: "token-456",
      user: { id: 2, email: "new@example.com" },
    });

    const user = userEvent.setup();
    const { history } = renderWithProviders(<RegisterForm />, { route: "/register" });

    await user.type(screen.getByLabelText(/name/i), "Jane Doe");
    await user.type(screen.getByLabelText(/^email/i), "new@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalled();
    });

    const [variables] = registerMock.mock.calls[0];
    expect(variables).toMatchObject({
      name: "Jane Doe",
      email: "new@example.com",
      password: "password123",
    });

    expect(useAuthStore.getState().token).toBe("token-456");
    expect(history.location.pathname).toBe("/board");
  });
});
