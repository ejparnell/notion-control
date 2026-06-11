import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col gap-4 bg-transparent p-4 text-foreground md:flex-row md:gap-6 md:p-6">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
