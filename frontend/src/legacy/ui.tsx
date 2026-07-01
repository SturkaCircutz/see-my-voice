"use client";

import { initials } from "./utils";

// Avatar initials keep profile UI deterministic unless the account has an uploaded image.
export function Avatar({ name, className, src }: { name: string; className: string; src?: string }) {
  if (src) {
    return <img className={className} src={src} alt={`${name} avatar`} />;
  }

  return (
    <span className={className} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

// Small score cells normalize numeric display in the practice grid.
export function Score({ label, value }: { label: string; value: number }) {
  const isGreen = label === "Clarity" || label === "Rhythm";

  return (
    <div className="border-r border-[var(--line)] px-1 pt-3 pb-2.5 text-center last:border-r-0">
      <strong className={`block text-[23px] font-extrabold leading-none min-[371px]:text-[27px] ${isGreen ? "text-[var(--green)]" : "text-[var(--amber)]"}`}>
        {Math.round(value)}
      </strong>
      <span className="mt-[7px] block text-[11px] text-[var(--muted)]">{label}</span>
    </div>
  );
}
