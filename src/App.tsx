import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";

import { LoginForm } from "./features/auth/components/LoginForm";
import { RegisterForm } from "./features/auth/components/RegisterForm";
import { Board } from "./features/board/components/Board";
import { useAuthStore } from "./store/auth-store";
import { Button } from "./components/ui/button";
import { Toaster } from "sonner";
import { useLogout } from "./features/auth/hooks/useAuth";

const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 shadow-xl">
      {children}
    </div>
  </div>
);

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-background text-foreground">
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <span className="text-lg font-semibold">Monthly Roadmap</span>
      <LogoutButton />
    </header>
    <main className="flex flex-1 flex-col px-6 py-6">{children}</main>
  </div>
);

const LogoutButton = () => {
  const token = useAuthStore((state) => state.token);
  const { mutate, isPending } = useLogout();
  if (!token) return null;
  return (
    <Button variant="ghost" size="sm" onClick={() => mutate()} disabled={isPending}>
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
};

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { token, isHydrated } = useAuthStore((state) => ({
    token: state.token,
    isHydrated: state.isHydrated,
  }));

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RedirectIfAuthed = ({ children }: { children: React.ReactNode }) => {
  const { token, isHydrated } = useAuthStore((state) => ({
    token: state.token,
    isHydrated: state.isHydrated,
  }));

  if (!isHydrated) {
    return null;
  }

  if (token) {
    return <Navigate to="/board" replace />;
  }

  return <>{children}</>;
};

export const App = () => {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <AuthLayout>
                <div className="mb-6 space-y-2 text-center">
                  <h1 className="text-2xl font-semibold">Welcome back</h1>
                  <p className="text-sm text-muted-foreground">Sign in to access your roadmap.</p>
                </div>
                <LoginForm />
              </AuthLayout>
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <AuthLayout>
                <div className="mb-6 space-y-2 text-center">
                  <h1 className="text-2xl font-semibold">Create account</h1>
                  <p className="text-sm text-muted-foreground">Start tracking your plans.</p>
                </div>
                <RegisterForm />
              </AuthLayout>
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/board"
          element={
            <RequireAuth>
              <AppLayout>
                <Board />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
};

export default App;
