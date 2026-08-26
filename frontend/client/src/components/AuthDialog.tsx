import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login, register, isLoggingIn, isRegistering } = useAuth();

  const isPending = isLoggingIn || isRegistering;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
  };

  const switchTab = (newTab: "login" | "register") => {
    setTab(newTab);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (tab === "login") {
        await login({ email, password });
      } else {
        await register({ email, name, password });
      }
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {tab === "login" ? "Welcome back" : "Create your account"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex border-b border-border mb-4">
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors border-b-2 ${tab === "login" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => switchTab("login")}
            data-testid="tab-login"
          >
            Log In
          </button>
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors border-b-2 ${tab === "register" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => switchTab("register")}
            data-testid="tab-register"
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <div className="space-y-2">
              <Label htmlFor="auth-name">Name</Label>
              <Input
                id="auth-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="input-name"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              placeholder={tab === "register" ? "At least 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={tab === "register" ? 6 : undefined}
              data-testid="input-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" data-testid="text-auth-error">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending} data-testid="button-auth-submit">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tab === "login" ? "Log In" : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-2">
          {tab === "login" ? (
            <>Don't have an account?{" "}
              <button className="text-primary underline-offset-4 hover:underline" onClick={() => switchTab("register")} data-testid="link-switch-register">
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button className="text-primary underline-offset-4 hover:underline" onClick={() => switchTab("login")} data-testid="link-switch-login">
                Log in
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
