"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    label: "Home",
  },
  {
    href: "/agents",
    label: "Agents",
  },
  {
    href: "/projects",
    label: "Projects",
  },
  {
    href: "/tasks",
    label: "Tasks",
  },
  {
    href: "/chat",
    label: 'Chat'
  },
  {
    href: "/arya",
    label: 'Arya'
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-border bg-surface text-foreground md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:w-64 md:overflow-y-auto">
      <div className="flex h-full flex-col gap-4 px-4 py-4">
        <div className="px-2">
          <div className="text-lg font-semibold tracking-wide text-foreground">
            Workspace
          </div>

          <p className="mt-1 text-sm text-muted">
            AI Powered
          </p>
        </div>

        <div className="border-t border-border" />

        <nav aria-label="Main navigation" className="flex gap-2 md:flex-col">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-glow-strong"
                    : "border-transparent text-muted hover:border-primary hover:bg-primary-soft hover:text-primary hover:shadow-glow"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
