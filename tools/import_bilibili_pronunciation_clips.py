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
    "ei": "从 e 滑向 i，口型由半开逐渐收窄，声音保持连贯。",
    "ao": "从 a 滑向 o，先打开口腔，再自然收圆。",
    "ou": "从 o 滑向 u，双唇逐渐收圆，结尾不要拖散。",
    "iu": "实际读作 iou，先发 i，再过渡到 ou，注意中间滑动。",
    "iao": "先做 i 的高舌位，再打开到 a，最后收到 o。",
    "ui": "实际读作 uei，先圆唇发 u，再滑向 ei。",
    "uai": "先圆唇发 u，再打开到 a，最后收向 i。",
    "ie": "从 i 快速滑向 e，嘴角放松展开。",
    "uo": "先圆唇发 u，再打开到 o，适合“我/锅/多”等音节。",
    "ua": "先圆唇发 u，再迅速打开到 a。",
    "ve": "保持 ü 的舌位和圆唇，再滑向 e，用于 yue、jue、que、xue 等音节。",
    "an": "先发 a，再舌尖抵上齿龈收成前鼻音 n。",
    "en": "先发 e，再舌尖抵上齿龈收成前鼻音 n。",
    "ian": "先发 i，再过渡到 an，结尾前鼻音要收住。",
    "uan": "先发 u，再过渡到 an，圆唇起音要清楚。",
    "van": "先发 ü，再过渡到 an，用于 yuan、juan、quan、xuan 等音节。",
    "in": "先发 i，再舌尖抵上齿龈收成前鼻音 n。",
    "un": "实际读作 uen，先圆唇起音，再收成前鼻音 n。",
    "vn": "先发 ü，再收成前鼻音 n，用于 yun、jun、qun、xun 等音节。",
    "ang": "先发 a，再舌根抬起收成后鼻音 ng。",
    "eng": "先发 e，再舌根抬起收成后鼻音 ng。",
    "iang": "先发 i，再过渡到 ang，后鼻音要完整。",
    "ing": "先发 i，再舌根抬起收成后鼻音 ng。",
    "ong": "圆唇发 o，再收成后鼻音 ng，口腔后部保持稳定。",
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
            "title": f"韵母 {unit} 发音示范",
            "notes": NOTES_BY_UNIT.get(unit, f"跟随示范练习韵母 {unit} 的口型和收音。"),
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
