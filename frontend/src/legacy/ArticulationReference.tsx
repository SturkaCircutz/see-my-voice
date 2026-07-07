"use client";

import React from "react";
import {
  type ArticulationUnit,
  articulationImageSources,
  missingArticulationImageUnits,
  mouthShapeClass,
  preciseArticulationUnits,
  splitArticulationImageSources,
  tonguePositionClass,
} from "./articulation";
import type { LegacySyllable } from "./types";

function ReferenceImage({
  alt,
  className,
  sources,
}: {
  alt: string;
  className: string;
  sources: string[];
}) {
  // Try alternate image formats if the first asset path is missing.
  const [sourceIndex, setSourceIndex] = React.useState(0);

  if (!sources[sourceIndex]) return null;

  return (
    <img
      className={className}
      src={sources[sourceIndex]}
      alt={alt}
      onError={() => setSourceIndex((current) => current + 1)}
    />
  );
}

function ArticulationPhotoCard({
  imageType,
  item,
  syllable,
}: {
  imageType: "mouth" | "tongue";
  item: ArticulationUnit;
  syllable: LegacySyllable;
}) {
  // Photo cards show mouth or tongue references for a pinyin unit.
  const title = imageType === "mouth" ? "Mouth Shape" : "Tongue Position";
  const fallbackSources = articulationImageSources(item.unit, imageType);
  const splitSources = splitArticulationImageSources(item.unit, imageType);
  const imageClass = imageType === "mouth" ? "block size-full object-contain" : "block size-full object-contain";
  const alt = `${syllable.character} ${item.kind} ${item.unit} ${title} reference image`;

  return (
    <figure className="m-0 grid min-w-0 gap-1">
      <div className="grid min-h-[156px] place-items-center overflow-visible rounded-[10px] border border-[rgba(222,216,205,0.9)] bg-[#fffaf4]">
        {splitSources.length ? (
          <div className="grid size-full grid-cols-[repeat(auto-fit,minmax(94px,1fr))] gap-1 p-1.5">
            {splitSources.map((source) => (
              <div className="grid min-h-[146px] place-items-center overflow-visible" key={source}>
                <ReferenceImage alt={alt} className={imageClass} sources={[source]} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[146px] place-items-center overflow-visible">
            <ReferenceImage alt={alt} className={imageClass} sources={fallbackSources} />
          </div>
        )}
      </div>
      <figcaption className="flex items-baseline justify-center gap-1 text-center text-[9px] leading-[1.15] whitespace-normal text-[var(--muted)]">
        <strong className="text-xs text-[var(--navy)]">{item.unit}</strong>
        <span>{item.kind} · {title}</span>
      </figcaption>
    </figure>
  );
}

function GeneratedMouthDiagram({ syllable }: { syllable: LegacySyllable }) {
  // Fallback mouth diagram keeps the detail screen useful without an asset.
  const shapeClass = mouthShapeClass(syllable);
  const roundClass = shapeClass === "shape-round" ? "w-[38px]" : "";
  const openHoleClass = shapeClass === "shape-open" ? "h-[34px] w-12" : "";
  const wideClass = shapeClass === "shape-wide" ? "w-16" : "";

  return (
    <div className="relative grid size-full place-items-center">
      <div className="relative h-[126px] w-[118px] rounded-[48%_48%_45%_45%] border-2 border-[#b98c5c] bg-[#ffe2c4]">
        <span className="absolute top-[31px] left-[31px] h-[7px] w-3 rounded-[50%] bg-[#262331]" />
        <span className="absolute top-[31px] right-[31px] h-[7px] w-3 rounded-[50%] bg-[#262331]" />
        <span className="absolute top-[50px] left-1/2 h-[18px] w-4 -translate-x-1/2 rounded-[50%] border-b-2 border-[#b98c5c]" />
        <span className={`absolute top-[77px] left-1/2 h-[18px] w-[52px] -translate-x-1/2 rounded-[50%] bg-[#df776b] ${roundClass} ${wideClass}`} />
        <span className={`absolute top-[84px] left-1/2 z-10 h-[23px] w-[46px] -translate-x-1/2 rounded-[50%] bg-[#43211d] ${roundClass} ${openHoleClass} ${wideClass}`} />
        <span className={`absolute top-[97px] left-1/2 h-[18px] w-[52px] -translate-x-1/2 rounded-[50%] bg-[#df776b] ${roundClass} ${wideClass}`} />
      </div>
      <span className="absolute right-2 bottom-2 grid min-w-[52px] rounded-[10px] bg-[rgba(255,254,250,0.88)] px-[7px] py-[5px] text-center text-[var(--navy)] shadow-[0_8px_18px_rgba(25,26,47,0.12)]">
        <strong className="font-(family-name:--serif) text-[25px] leading-none">{syllable.character}</strong>
        <span className="text-[10px] text-[var(--muted)]">{syllable.pinyin}</span>
      </span>
    </div>
  );
}

function GeneratedTongueDiagram({ syllable }: { syllable: LegacySyllable }) {
  // Fallback tongue diagram highlights the approximate articulation position.
  const positionClass = tonguePositionClass(syllable);
  const tongueClass = {
    "tongue-front": "-rotate-[10deg] translate-y-[-8px]",
    "tongue-palate": "-rotate-[18deg] translate-x-2.5 translate-y-[-16px]",
    "tongue-back": "rotate-[8deg] translate-x-[22px] translate-y-[-5px]",
    "tongue-curled": "h-8 -rotate-[27deg] translate-x-3 translate-y-[-12px]",
    "tongue-low": "",
  }[positionClass];
  const dotClass = {
    "tongue-front": "top-[42px] left-[47px]",
    "tongue-palate": "top-[33px] left-[71px]",
    "tongue-back": "top-[49px] left-24",
    "tongue-curled": "top-9 left-[66px]",
    "tongue-low": "top-[60px] left-[72px]",
  }[positionClass];

  return (
    <div className="relative h-[104px] w-36 overflow-hidden border-l border-[var(--line)] bg-[#fff5eb]">
      <span className="absolute top-5 left-[18px] h-[38px] w-[102px] rounded-[70%_70%_0_0] border-t-4 border-[#9d7555]" />
      <span className="absolute top-10 left-[22px] h-[11px] w-9 rounded-[2px_2px_8px_8px] bg-white" />
      <span className="absolute right-3 bottom-3.5 left-[22px] h-8 rounded-[0_0_70%_70%] border-b-[5px] border-[#9d7555]" />
      <span className={`absolute bottom-6 left-[31px] h-[27px] w-[78px] origin-[12px_20px] rounded-[70%_70%_45%_45%] bg-[#dd776d] ${tongueClass}`} />
      <span className={`absolute size-[11px] rounded-full border-2 border-white bg-[var(--red)] shadow-[0_0_0_3px_rgba(207,75,49,0.18)] ${dotClass}`} />
    </div>
  );
}

function MouthReference({ syllable, units }: { syllable: LegacySyllable; units: ArticulationUnit[] }) {
  // Use precise images when available, otherwise draw a generated diagram.
  if (!units.length) return <GeneratedMouthDiagram syllable={syllable} />;

  return (
    <div className="grid w-full grid-cols-2 gap-2 px-3 py-2.5">
      {units.map((item) => (
        <ArticulationPhotoCard imageType="mouth" item={item} syllable={syllable} key={`${item.kind}-${item.unit}`} />
      ))}
    </div>
  );
}

function TongueReference({ syllable, units }: { syllable: LegacySyllable; units: ArticulationUnit[] }) {
  if (!units.length) return <GeneratedTongueDiagram syllable={syllable} />;

  return (
    <div className="grid w-full grid-cols-1 gap-2 px-3 py-2.5">
      {units.map((item) => (
        <ArticulationPhotoCard imageType="tongue" item={item} syllable={syllable} key={`${item.kind}-${item.unit}`} />
      ))}
    </div>
  );
}

export function ArticulationReference({ syllable }: { syllable: LegacySyllable }) {
  // The detail panel combines visual references with text pronunciation cues.
  const units = preciseArticulationUnits(syllable);
  const missingUnits = missingArticulationImageUnits(syllable);
  const hasReference = units.length > 0;

  return (
    <section aria-labelledby="mouth-title">
      <p className="mt-3 mb-2 text-[11px] font-extrabold tracking-[0.08em] text-[var(--muted)] uppercase" id="mouth-title">
        Mouth Shape and Tongue Position
      </p>
      <div className="grid grid-cols-1 gap-2.5 overflow-visible rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-0 pt-0 pb-3">
        <div className="min-h-0 bg-[var(--surface)]">
          <p className="m-0 px-3 py-[11px] text-[11px] font-semibold text-[var(--muted)]">
            {hasReference ? "Reference Mouth Image" : "Auto Mouth Diagram"}
          </p>
          <div className="relative grid min-h-[226px] place-items-center overflow-visible bg-[#f7eddd] sm:min-h-[246px]">
            <MouthReference syllable={syllable} units={units} />
          </div>
          <p className="m-0 px-3 pt-2.5 pb-3 text-sm leading-[1.65] text-[var(--muted)]">{syllable.mouthCue}</p>
        </div>
        <div className="min-h-0 border-t border-[var(--line)] bg-[var(--surface)]">
          <p className="m-0 px-3 py-[11px] text-[11px] font-semibold text-[var(--muted)]">My Mirror</p>
          <div className="grid min-h-[260px] place-items-center bg-[#121212] p-4 text-center text-[11px] text-[#b9b6be] sm:min-h-[300px]" id="mirror-area">
            <span>
              <strong className="mb-[5px] block text-[13px] text-white">Waiting for Camera</strong>
              Allow the camera, then compare your lip and teeth position with the reference.
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 items-stretch gap-1 overflow-visible rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-0">
        <div>
          <p className="m-0 px-3 pt-[11px] pb-1 text-[11px] font-semibold text-[var(--muted)]">
            {hasReference ? "Reference Tongue Position Image" : "Auto Tongue Position Diagram"}
          </p>
          <p className="m-0 px-3 pt-2.5 pb-3 text-sm leading-[1.65] text-[var(--muted)]">{syllable.tongueCue}</p>
        </div>
        <div className="grid min-h-[104px] place-items-center overflow-visible bg-[#fffaf4]">
          <TongueReference syllable={syllable} units={units} />
        </div>
      </div>
      {missingUnits.length ? (
        <p className="rounded-2xl border border-[rgba(31,111,97,0.2)] bg-[var(--green-soft)] p-3 text-xs leading-[1.55] text-[var(--green)]">
          No precise mouth-shape or tongue-position image is available yet for {missingUnits.map((item) => `${item.kind} ${item.unit}`).join(", ")}. Use the teaching video and text cue above.
        </p>
      ) : null}
    </section>
  );
}
