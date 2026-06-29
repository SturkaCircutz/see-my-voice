from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


INDEX_PATH = Path("tools/pronunciation_missing_bilibili_index.json")
SOURCE_DIR = Path("web/assets/pronunciation-clips/bilibili-source")
OUTPUT_DIR = Path("web/assets/pronunciation-clips")
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"


NOTES_BY_UNIT = {
    "ei": "Glide from e to i, narrowing the mouth shape gradually while keeping the sound connected.",
    "ao": "Glide from a to o: open first, then round naturally.",
    "ou": "Glide from o to u, rounding the lips gradually and keeping the ending compact.",
    "iu": "Pronounced like iou: start with i, then transition through ou with a smooth glide.",
    "iao": "Start with high i, open into a, then finish toward o.",
    "ui": "Pronounced like uei: start with rounded u, then glide toward ei.",
    "uai": "Start with rounded u, open into a, then close toward i.",
    "ie": "Glide quickly from i to e while relaxing the mouth corners.",
    "uo": "Start with rounded u, then open into o. Useful for syllables such as wo, guo, and duo.",
    "ua": "Start with rounded u, then open quickly into a.",
    "ve": "Keep the tongue and lip shape of ü, then glide toward e. Used in yue, jue, que, and xue.",
    "an": "Start with a, then touch the tongue tip to the upper gum ridge for the front nasal n.",
    "en": "Start with e, then touch the tongue tip to the upper gum ridge for the front nasal n.",
    "ian": "Start with i, transition into an, and complete the front nasal ending.",
    "uan": "Start with u, transition into an, and keep the rounded onset clear.",
    "van": "Start with ü, then transition into an. Used in yuan, juan, quan, and xuan.",
    "in": "Start with i, then touch the tongue tip to the upper gum ridge for the front nasal n.",
    "un": "Pronounced like uen: start with rounded u, then finish with the front nasal n.",
    "vn": "Start with ü, then finish with the front nasal n. Used in yun, jun, qun, and xun.",
    "ang": "Start with a, then raise the tongue root into the back nasal ng.",
    "eng": "Start with e, then raise the tongue root into the back nasal ng.",
    "iang": "Start with i, transition into ang, and complete the back nasal ending.",
    "ing": "Start with i, then raise the tongue root into the back nasal ng.",
    "ong": "Round the lips for o, then finish with the back nasal ng while keeping the back of the mouth stable.",
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def find_source_file(page: int) -> Path:
    matches = sorted(SOURCE_DIR.glob(f"{page:02d}-*.mp4"))
    if not matches:
        raise FileNotFoundError(f"No downloaded source mp4 found for page {page} in {SOURCE_DIR}")
    if len(matches) > 1:
        exact = [path for path in matches if path.stem.endswith(tuple(NOTES_BY_UNIT))]
        return exact[0] if exact else matches[0]
    return matches[0]


def main() -> int:
    index = load_json(INDEX_PATH)
    manifest = load_json(MANIFEST_PATH)
    manifest.setdefault("sources", {})
    manifest["sources"]["bilibiliSupplement"] = {
        "page": index["sourcePage"],
        "title": index["title"],
        "bvid": index["bvid"],
        "aid": index["aid"],
        "importedAt": datetime.now(timezone.utc).isoformat(),
        "note": "User confirmed they have permission to download and use these local teaching clips.",
    }

    final_clips = manifest.setdefault("clips", {}).setdefault("final", {})
    imported = []
    for item in index["pagesForMissingFinals"]:
        unit = item["unit"]
        source_path = find_source_file(int(item["page"]))
        output_path = OUTPUT_DIR / f"final-{unit}.mp4"
        shutil.copy2(source_path, output_path)
        final_clips[unit] = {
            "unit": unit,
            "type": "final",
            "title": f"Final {unit} Pronunciation Demo",
            "notes": NOTES_BY_UNIT.get(unit, f"Watch the demo and practice final {unit} with clear mouth movement and ending."),
            "url": f"./assets/pronunciation-clips/final-{unit}.mp4",
            "source": {
                "kind": "bilibili",
                "bvid": index["bvid"],
                "page": item["page"],
                "cid": item["cid"],
                "title": item["title"],
                "localFile": str(source_path).replace("\\", "/"),
            },
        }
        imported.append(unit)

    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat()
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(imported)} final clips: {', '.join(imported)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
