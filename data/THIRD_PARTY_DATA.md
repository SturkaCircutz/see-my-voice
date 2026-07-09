# Third-Party Training Data

This project can build a local Stage 3B prototype manifest from third-party
Mandarin speech datasets. The raw audio is intentionally kept out of Git.

## AISHELL-1

- Source: OpenSLR SLR33 and Hugging Face `AISHELL/AISHELL-1`
- Use in this project: native Mandarin read-speech rows
- License status checked: Apache License 2.0
- Local path when downloaded: `data/external/aishell/`

Citation from the AISHELL dataset card:

```bibtex
@inproceedings{aishell_2017,
  title={AIShell-1: An Open-Source Mandarin Speech Corpus and A Speech Recognition Baseline},
  author={Hui Bu, Jiayu Du, Xingyu Na, Bengu Wu, Hao Zheng},
  booktitle={Oriental COCOSDA 2017},
  pages={Submitted},
  year={2017}
}
```

## NTU Speech Corpus for L2 Mandarin

- Source: Te-Hsin Liu Mandarin Learners Speech Bank
- Use in this project: non-native learner Mandarin reading rows
- Local path when downloaded: `data/external/ntu_l2_mandarin/`

The source page states that participant consent was obtained for publication of
the spoken data, but the page does not present an explicit open-source license
or redistribution license. For that reason, the importer downloads the audio
from the source page for local research use, but this repository does not commit
or redistribute the raw NTU audio files.

## Rebuild Locally

```bash
.venv/bin/python src/run_stage3b_build_public_prototype_manifest.py
```

That command downloads the local audio under `data/external/`, writes
`data/phoneme_manifest.csv`, and validates the manifest with local audio
presence.
