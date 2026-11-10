import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LockKeyhole } from "lucide-react";
import { LearnovaMark } from "@/components/LearnovaMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Learnova" },
      { name: "description", content: "Choose a new password for your Learnova account." },
      { property: "og:title", content: "Reset password — Learnova" },
      { property: "og:description", content: "Choose a new password for your Learnova account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryLinkValid, setRecoveryLinkValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    setRecoveryLinkValid(new URLSearchParams(hash).get("type") === "recovery");
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmPassword") || "");
    if (password.length < 6) {
      toast.error("Please use a password with at least 6 characters.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Those passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Your password has been updated.");
      await navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="glass w-full max-w-md rounded-3xl p-6 shadow-soft">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <LearnovaMark className="h-10 w-10" />
          <span className="text-xl font-bold">Learnova</span>
        </Link>
        {recoveryLinkValid === false ? (
          <div className="text-center">
            <LockKeyhole className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-bold">Reset link expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">Request a new password reset link to continue.</p>
            <Link to="/auth" className="mt-5 inline-flex">
              <Button className="rounded-full">Back to sign in</Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Choose a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use at least 6 characters.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={6} required disabled={recoveryLinkValid !== true || loading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required disabled={recoveryLinkValid !== true || loading} />
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={recoveryLinkValid !== true || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}