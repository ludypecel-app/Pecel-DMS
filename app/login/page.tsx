"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sprout, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);

    if (result?.error) {
      setError("Email atau password salah.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <div className="w-full max-w-[400px] space-y-6 rounded-lg border border-border bg-surface-raised p-10 shadow-md">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-white">
            <Sprout size={20} />
          </div>
          <div className="space-y-1.5">
            <h1 className="h1 !text-[20px]">Pecel DMS</h1>
            <p className="body-sm text-ink-muted">Masuk untuk melanjutkan</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-ink">Email</span>
            <input
              type="email"
              required
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-ink">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
            </div>
          </label>
          <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
            {submitting ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
