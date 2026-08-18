"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
    >
      {pending ? "Saindo..." : "Sair"}
    </button>
  );
}
