# Stage 3B Phoneme Training Data

This directory stores the committed metadata for building the Mandarin phoneme
training manifest. Audio files are intentionally not committed.

## Files

- `mandarin_phone_inventory.json`: frozen Stage 3A phone-token vocabulary.
- `phoneme_manifest.csv`: current training manifest seed. This should contain
  only rows that are intended to become trainable samples.
- `phoneme_manifest_report.json`: validation report for the current manifest.
- `phoneme_collection_plan.csv`: 500-slot prototype recording plan.
- `phoneme_collection_plan_report.json`: balance summary for the collection plan.

## Collection Workflow

1. Record each row from `phoneme_collection_plan.csv`.
2. Save the audio at the row's `audio_filename`, for example:

   ```text
   data/audio/proto_0001.wav
   ```

3. Use 16 kHz mono WAV when possible. Other supported extensions are `.m4a`,
   `.aac`, `.mp3`, `.caf`, `.flac`, and `.webm`.
4. Import completed audio rows into the manifest:

   ```bash
   .venv/bin/python src/run_stage3b_import_collected_audio.py
   ```

5. Validate before training:

   ```bash
   .venv/bin/python src/run_stage3b_validate_manifest.py \
     --manifest data/phoneme_manifest.csv \
     --require-audio
   ```

6. Build the Stage 3B dataset:

   ```bash
   .venv/bin/python src/run_stage3b_build_dataset.py
   ```

## Data Targets

- Prototype: 500-1,000 recordings
- Useful model: 5,000-20,000 recordings
- Stronger model: 50,000+ recordings

The prototype plan has 500 slots, 50 speakers, and speaker-safe train/val/test
splits. It includes both good/native-style recordings and targeted learner
mistake recordings.

## Optional Native Speech Bootstrap

AISHELL-style Mandarin read speech can be imported as native/good examples
after the corpus is downloaded and extracted locally. To download a small
speaker-level subset automatically:

```bash
.venv/bin/python src/run_stage3b_import_aishell.py \
  --download-subset \
  --n-speaker-archives 1 \
  --limit 500
```

The expected extracted layout is:

```text
data/external/aishell/transcript/aishell_transcript_v0.8.txt
data/external/aishell/wav/train/*/*.wav
data/external/aishell/wav/dev/*/*.wav
data/external/aishell/wav/test/*/*.wav
```

Native read speech does not replace learner-mistake recordings. The phoneme
model still needs targeted tone, initial, final, timing, and unclear examples
for useful pronunciation feedback.

## Optional Learner Speech Bootstrap

The public NTU Speech Corpus for L2 Mandarin page exposes downloadable learner
audio links. A small subset can be downloaded/imported with:

```bash
.venv/bin/python src/run_stage3b_import_ntu_l2.py --limit 50
```

Those rows are marked as coarse learner/phoneme-issue examples because the
simple page link list does not provide per-file transcript alignment. Before
using them for final CTC training, manually correct the `text` field in
`data/phoneme_manifest.csv` so each row matches the actual spoken sentence.

## Tested Public-Data Prototype Bootstrap

For a local prototype manifest with 500 real audio files:

```bash
.venv/bin/python src/run_stage3b_build_public_prototype_manifest.py
```

This builds `data/phoneme_manifest.csv` from:

- 450 AISHELL native Mandarin rows
- 50 NTU L2 Mandarin learner rows

Then build the Stage 3B dataset:

```bash
.venv/bin/python src/run_stage3b_build_dataset.py
```

The downloaded corpora are stored under `data/external/` and are not committed
to Git.
