type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]) {
  // Small class combiner avoids pulling a dependency for conditional strings.
  return classes.filter(Boolean).join(" ");
}

// Shared layout classes keep the legacy screens visually consistent.
export const screenClass = "min-h-full bg-[var(--paper)]";
export const contentBaseClass =
  "grid px-4 pt-4 pb-6 max-[370px]:px-3 lg:mx-auto lg:w-full lg:max-w-[980px] lg:px-8 lg:pt-6 lg:pb-8 xl:max-w-[1040px] xl:px-10";
export const contentClass = cn(contentBaseClass, "gap-4 lg:gap-5");

export const appHeaderBaseClass =
  "relative bg-[linear-gradient(135deg,var(--navy)_0%,#20213a_58%,#151628_100%)] px-[22px] pt-8 pb-5 text-white shadow-[0_22px_54px_rgba(25,26,47,0.16)] before:absolute before:top-[15px] before:left-1/2 before:h-2 before:w-[92px] before:-translate-x-1/2 before:rounded-full before:bg-[#090a12] before:content-[''] lg:px-8 lg:pt-7 lg:pb-7 lg:before:hidden xl:px-10";
export const appHeaderClass = cn(appHeaderBaseClass, "min-h-[144px] lg:min-h-[160px]");
export const statusRowClass = "mb-4 flex items-center justify-between text-xs font-bold tracking-[0.025em] text-[rgba(255,255,255,0.78)] lg:mb-5";
export const brandRowClass = "flex items-center justify-between";
export const brandClass = "m-0 text-2xl font-semibold tracking-normal text-white lg:text-[32px]";
export const brandAccentClass = "font-(family-name:--serif) text-[var(--red)]";

export const sectionLabelClass = "m-0 mb-2 text-xs font-extrabold tracking-[0.055em] text-[var(--muted)]";
export const panelClass = "rounded-[16px] border border-[rgba(53,84,110,0.1)] bg-[var(--surface)] p-4 shadow-[0_14px_40px_rgba(25,26,47,0.06)] lg:p-5";
export const panelFrameClass = "rounded-[16px] border border-[rgba(53,84,110,0.1)] bg-[var(--surface)] shadow-[0_14px_40px_rgba(25,26,47,0.06)] lg:p-1";
export const modelKickerClass = "text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--green)]";
export const statusPillClass = "self-start rounded-full bg-[var(--green-soft)] px-[9px] py-[5px] text-[10px] font-bold text-[var(--green)]";
export const warnStatusPillClass = "self-start rounded-full bg-[var(--amber-soft)] px-[9px] py-[5px] text-[10px] font-bold text-[#a96600]";
export const focusStatusPillClass = "self-start rounded-full bg-[var(--red-soft)] px-[9px] py-[5px] text-[10px] font-bold text-[var(--red)]";
export const modelSummaryClass = "mt-[-3px] mb-0 rounded-xl bg-[#f2efe8] px-[13px] py-[11px] text-xs leading-[1.55] text-[#6e6a73]";
export const modelSummaryErrorClass = "mt-[-3px] mb-0 rounded-xl bg-[var(--red-soft)] px-[13px] py-[11px] text-xs leading-[1.55] text-[var(--red)]";
export const modelCardClass = "grid grid-cols-[1fr_auto] items-center gap-3 rounded-[15px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-[13px]";
export const modelCardLabelClass = "block text-[11px] leading-[1.45] text-[var(--muted)]";
export const modelCardTitleClass = "my-[3px] block text-[15px]";
export const diagnosisCardClass = cn(panelClass, "grid gap-[7px]");
export const diagnosisTitleClass = "text-sm";
export const diagnosisCopyClass = "m-0 text-[11px] leading-[1.55] text-[var(--muted)]";
export const practiceItemListClass = "mt-2 flex flex-wrap gap-1.5";
export const practiceItemPillClass = "rounded-full bg-[var(--green-soft)] px-2 py-[5px] text-[11px] font-black text-[var(--green)]";
export const toastClass =
  "pointer-events-none absolute right-[18px] bottom-[calc(96px+env(safe-area-inset-bottom))] left-[18px] z-[8] translate-y-2 rounded-xl bg-[rgba(25,26,47,0.94)] px-3.5 py-3 text-xs leading-[1.45] text-white opacity-0 transition-[opacity,transform] duration-[180ms] lg:right-8 lg:bottom-8 lg:left-auto lg:w-[360px]";
export const toastVisibleClass = "translate-y-0 opacity-100";

export function syllableStatusPillClass(level: string) {
  // Status colors follow the same good/warn/focus levels as scores.
  if (level === "focus") return focusStatusPillClass;
  if (level === "warn") return warnStatusPillClass;
  return statusPillClass;
}
