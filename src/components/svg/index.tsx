import type { ReactNode } from 'react';

export function BaseIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

export function FilterIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M7 12h10M10 17h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SortIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4v16M8 20l-4-4M8 20l4-4M16 20V4M16 4l-4 4M16 4l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AutomationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 2L5 13h6l-1 9 9-13h-6l1-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 8l1.2 2.8L16 12l-2.8 1.2L12 16l-1.2-2.8L8 12l2.8-1.2L12 8z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zM16 16l5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h4M12 12h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="7" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="17" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TableIcon() {
  return (
    <BaseIcon>
      <rect x="4" y="6" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 10h16M9 6v12" stroke="currentColor" strokeWidth="1.5" />
    </BaseIcon>
  );
}

export function BoardIcon() {
  return (
    <BaseIcon>
      <rect x="4" y="6" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 6v12M15 6v12" stroke="currentColor" strokeWidth="1.5" />
    </BaseIcon>
  );
}

export function TimelineIcon() {
  return (
    <BaseIcon>
      <rect x="5" y="7" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function CalendarIcon() {
  return (
    <BaseIcon>
      <rect x="5" y="6" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4v4M16 4v4M5 10h14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 13h2M12 13h2M8 16h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function ListIcon() {
  return (
    <BaseIcon>
      <path d="M8 7h11M8 12h11M8 17h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5 7h.01M5 12h.01M5 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function GalleryIcon() {
  return (
    <BaseIcon>
      <rect x="5" y="5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="14" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="14" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </BaseIcon>
  );
}

export function ChartIcon() {
  return (
    <BaseIcon>
      <path d="M12 4v8l6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
    </BaseIcon>
  );
}

export function FeedIcon() {
  return (
    <BaseIcon>
      <rect x="7" y="4" width="11" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7h10M5 11h10M5 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function MapIcon() {
  return (
    <BaseIcon>
      <path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.5" />
    </BaseIcon>
  );
}

export function DashboardIcon() {
  return (
    <BaseIcon>
      <rect x="5" y="5" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="5" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="14" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="14" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </BaseIcon>
  );
}

export function TextIcon() {
  return <span className="font-serif text-sm text-muted-soft">Aa</span>;
}

export function StatusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PersonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DateIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function SelectIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 10l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
