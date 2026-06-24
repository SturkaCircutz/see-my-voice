from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import tomllib
from pathlib import Path


CONFIG_PATH = Path.home() / ".codex" / "imagegen.local.toml"
OUTPUT_DIR = Path("web/assets/articulation/_generated-samples")

MISSING_UNITS = [
    "i_z",
    "i_zh",
    "ia",
    "ian",
    "iang",
    "iao",
    "iong",
    "ua",
    "uai",
    "uan",
    "uang",
    "ueng",
    "uo",
    "van",
]

UNIT_SPECS = {
    "i_z": {
        "display": "-i after z/c/s",
        "mouth": "neutral to slightly spread lips with a narrow horizontal opening; teeth may be close but not clenched; do not show rounded lips.",
        "tongue": "apical front vowel: tongue tip very close to the upper teeth ridge, front tongue high and nearly flat, a narrow central channel for friction; not the ordinary high-front i tongue body.",
        "refs": ["z", "c", "s", "i"],
    },
    "i_zh": {
        "display": "-i after zh/ch/sh/r",
        "mouth": "neutral lips with a small relaxed opening; lips are not rounded and not widely spread.",
        "tongue": "retroflex apical vowel: tongue tip curls upward and slightly backward toward the hard palate, tongue body relaxed, not a flat front i posture.",
        "refs": ["zh", "ch", "sh", "r"],
    },
    "ia": {
        "display": "ia",
        "mouth": "starts from a narrow i-like spread shape and opens clearly toward a, represented as a moderately open front mouth shape rather than rounded lips.",
        "tongue": "transition from high-front i to low-front a; tongue begins high/front and lowers forward, final posture open and low-front.",
        "refs": ["i", "a"],
    },
    "ian": {
        "display": "ian",
        "mouth": "i-like spread opening moving toward a modest open a/e shape, then a small closing for n; no lip rounding.",
        "tongue": "high-front i onset, lowers toward a/e, then tongue tip contacts the upper alveolar ridge for final n.",
        "refs": ["i", "an", "in"],
    },
    "iang": {
        "display": "iang",
        "mouth": "i-like spread opening moving to a wider open a shape; no lip rounding.",
        "tongue": "high-front i onset, lowers for a, then tongue root raises toward the soft palate for final ng.",
        "refs": ["i", "ang", "ing"],
    },
    "iao": {
        "display": "iao",
        "mouth": "i-like spread onset, opens to a, then rounds slightly toward o; show a moderately open mouth with visible rounding beginning.",
        "tongue": "high-front i onset, lowers to open a, then moves back slightly for o; do not make it a simple u/o back vowel.",
        "refs": ["i", "ao"],
    },
    "iong": {
        "display": "iong",
        "mouth": "front high rounded onset similar to yu/ü, then rounded o-like ending; lips are rounded but not as protruded as pure u.",
        "tongue": "front high tongue posture with lip rounding, then backs/lowers slightly and finishes with tongue root raised for ng.",
        "refs": ["v", "ong", "ing"],
    },
    "ua": {
        "display": "ua",
        "mouth": "starts with strongly rounded u lips and opens quickly toward wide a; show a rounded-to-open representative shape.",
        "tongue": "high-back u onset followed by lowering to low-open a; tongue moves from back/high to lower central/open.",
        "refs": ["u", "a"],
    },
    "uai": {
        "display": "uai",
        "mouth": "rounded u onset, opens to a, then narrows toward i; show open shape with a slight final narrowing, not pure round.",
        "tongue": "high-back u onset, lowers to a, then moves forward/high toward i; a clear back-to-front glide.",
        "refs": ["u", "ai"],
    },
    "uan": {
        "display": "uan",
        "mouth": "rounded u onset opening toward an, then closing slightly for n; lips start rounded but final shape is not fully round.",
        "tongue": "high-back u onset, lowers toward a, then tongue tip contacts the upper alveolar ridge for n.",
        "refs": ["u", "an", "un"],
    },
    "uang": {
        "display": "uang",
        "mouth": "rounded u onset opening to a broad a shape; keep a trace of initial rounding but final is open.",
        "tongue": "high-back u onset, lowers to a, then tongue root raises to the soft palate for ng.",
        "refs": ["u", "ang"],
    },
    "ueng": {
        "display": "ueng",
        "mouth": "rounded u onset moving toward a more relaxed e/eng opening; rounded at the beginning, less protruded at the end.",
        "tongue": "high-back rounded u onset, relaxes toward mid-back e, then tongue root raises for final ng.",
        "refs": ["u", "eng", "un"],
    },
    "uo": {
        "display": "uo",
        "mouth": "rounded u onset opening slightly toward o; an oval rounded opening, not flat-wide like i/e and not wide-open like a.",
        "tongue": "high-back rounded u posture lowering slightly toward mid-back o; tongue body stays in the back half of the mouth.",
        "refs": ["u", "o", "ou", "ao"],
    },
    "van": {
        "display": "üan",
        "mouth": "rounded ü/yü onset with front tongue posture, then opens toward an; lips are rounded at onset but not pure u-back.",
        "tongue": "high-front ü onset with lip rounding, lowers toward a/e, then tongue tip contacts the upper alveolar ridge for n.",
        "refs": ["v", "an", "vn"],
    },
}


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"Missing config: {CONFIG_PATH}")
    config = tomllib.loads(CONFIG_PATH.read_text(encoding="utf-8-sig"))
    missing = [key for key in ("base_url", "model", "api_key") if not config.get(key)]
    if missing:
        raise ValueError(f"Missing config value(s): {', '.join(missing)}")
    return config


def data_url_for(path: Path) -> str:
    mime_type = mimetypes.guess_type(path.name)[0] or "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def write_image_result(result, output_path: Path) -> None:
    item = result.data[0]
    image_b64 = getattr(item, "b64_json", None)
    image_url = getattr(item, "url", None)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if image_b64:
        output_path.write_bytes(base64.b64decode(image_b64))
        return
    if image_url:
        import urllib.request

        with urllib.request.urlopen(image_url, timeout=180) as response:
            output_path.write_bytes(response.read())
        return
    raise RuntimeError("Image API returned no b64_json or url.")


def request_image(config: dict, prompt: str, output_path: Path, references: list[Path]) -> None:
    from openai import OpenAI

    client = OpenAI(api_key=str(config["api_key"]), base_url=str(config["base_url"]).rstrip("/"))
    kwargs = {
        "model": str(config["model"]),
        "prompt": prompt,
        "size": "1024x1024",
        "quality": "medium",
        "n": 1,
    }
    if references:
        handles = [path.open("rb") for path in references]
        try:
            result = client.images.edit(image=handles, **kwargs)
        finally:
            for handle in handles:
                handle.close()
    else:
        result = client.images.generate(**kwargs)
    write_image_result(result, output_path)


def unit_spec(unit: str) -> dict:
    return UNIT_SPECS.get(
        unit,
        {
            "display": unit,
            "mouth": f"show the representative Mandarin pinyin mouth shape for {unit}.",
            "tongue": f"show the representative Mandarin pinyin tongue position for {unit}.",
            "refs": [],
        },
    )


def build_mouth_prompt(unit: str) -> str:
    spec = unit_spec(unit)
    return f"""
Use case: scientific-educational
Asset type: Chinese pinyin pronunciation mouth-shape reference image
Primary request: Create one mouth-shape reference image for Mandarin pinyin final "{spec["display"]}".
Input images: Use the attached existing mouth-shape images only as strict style, crop, background, line-weight, color, and layout references.
Style/medium: match the existing project assets: single isolated mouth/lip diagram, clean raster educational chart, pale neutral background, no face, no nose, no arrows, no decoration, no labels.
Composition/framing: square image, centered single front-face mouth/lower-nose illustration with the same blue circular crop and padding as the reference images; show the target final "{unit}" as one static representative mouth shape, not a sequence.
Color palette: match references exactly: soft beige/cream background, muted red lips, subtle dark inner mouth, minimal shading.
Text: no text, no letters, no watermark.
Correctness constraints: for "{unit}", {spec["mouth"]}
Style constraints: keep the result visually consistent with attached reference mouth assets, including simple black line art, muted red lips, pale skin-tone fill, and the blue circular crop.
Avoid: arrows, multiple panels, text, labels, photorealism, watermark, clutter, teeth detail overload.
""".strip()


def build_tongue_prompt(unit: str) -> str:
    spec = unit_spec(unit)
    return f"""
Use case: scientific-educational
Asset type: Chinese pinyin pronunciation tongue-position reference image
Primary request: Create one tongue-position side-cutaway reference image for Mandarin pinyin final "{spec["display"]}".
Input images: Use the attached existing tongue-position images only as strict style, crop, background, line-weight, color, and layout references.
Style/medium: match the existing project assets: circular side-profile oral cavity cutaway, pale beige background, simple black outlines, muted pink tongue, cream palate/teeth areas, clean educational chart style.
Composition/framing: square image, centered circular side-view mouth cross-section, same scale and padding as the reference tongue assets; no labels or arrows.
Correctness constraints: for "{unit}", {spec["tongue"]}
Text: no text, no letters, no watermark.
Avoid: labels, Chinese characters, English text, arrows, multiple panels, photorealism, watermark, clutter, front-tongue posture, teeth detail overload.
""".strip()


def reference_path(unit: str, kind: str) -> Path | None:
    for extension in ("png", "jpeg", "jpg", "webp"):
        path = Path(f"web/assets/articulation/{unit}/{kind}.{extension}")
        if path.exists():
            return path
    return None


def references_for(unit: str, kind: str) -> list[Path]:
    candidates = list(unit_spec(unit).get("refs", []))
    if kind == "mouth":
        candidates.extend(["u", "i", "a", "o", "an", "eng"])
    else:
        candidates.extend(["u", "i", "a", "o", "an", "eng", "zh"])
    references: list[Path] = []
    for candidate in candidates:
        path = reference_path(candidate, kind)
        if path and path not in references:
            references.append(path)
        if len(references) >= 5:
            break
    return references


def generate_one(config: dict, unit: str, kind: str, output_path: Path, no_reference: bool) -> None:
    prompt = build_tongue_prompt(unit) if kind == "tongue" else build_mouth_prompt(unit)
    references = [] if no_reference else references_for(unit, kind)
    request_image(config, prompt, output_path, references)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate one pronunciation image sample via local aggregate API config.")
    parser.add_argument("--unit", default="uo")
    parser.add_argument("--kind", choices=["mouth", "tongue"], default="mouth")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--no-reference", action="store_true")
    parser.add_argument("--batch-missing", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    config = load_config()
    if args.batch_missing:
        for unit in MISSING_UNITS:
            for kind in ("mouth", "tongue"):
                output_path = OUTPUT_DIR / unit / f"{kind}.png"
                if output_path.exists() and not args.force:
                    print(f"Skipped existing {output_path}")
                    continue
                generate_one(config, unit, kind, output_path, args.no_reference)
                print(f"Wrote {output_path}")
    else:
        output_path = args.out or (OUTPUT_DIR / args.unit / f"{args.kind}.png")
        generate_one(config, args.unit, args.kind, output_path, args.no_reference)
        print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
