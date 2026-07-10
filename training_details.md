# Training Details

## What We Are Training

We are training a Mandarin PHONE-token CTC model. The selected pretrained model is jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn. The old hf-internal-testing/tiny-random-wav2vec2 model is only a very small model used for testing code, not high accuracy.

The post trained model learns this mapping:

```text
audio waveform -> Mandarin phone tokens
```

Example:

```text
你 ni2  -> I_n F_i T2
好 hao3 -> I_h F_ao T3
爱 ai4  -> F_ai T4
```

The target label design is the frozen Stage 3A phone-token format:

```text
<blank>
I_*     Mandarin initials
F_*     Mandarin finals
T1-T5   tones
```

The current vocabulary size is:

```text
67 = <blank> + frozen Mandarin phone tokens
```

## Where The Labels Come From

There are two manifest levels.

The source manifest is:

```text
data/phoneme_manifest.csv
```

It stores metadata such as:

```text
sample_id
text
audio_path
speaker_id
split
human_label
note
```

Example source row:

```text
aishell_BAC009S0002W0266
五月二十五日周一
data/external/aishell/wav/train/S0002/train/S0002/BAC009S0002W0266.wav
S0002
train
native
Imported from AISHELL-style Mandarin read speech.
```

Stage 3B generates the training dataset, it is locally stored since its not that legal to show publically:

```text
stage3b_dataset/dataset.csv
```

That file adds training labels:

```text
pinyin
syllable_tokens
phone_tokens
n_syllables
n_phone_tokens
```

Example generated row:

```text
target_text:
五月二十五日周一

pinyin:
wu3 yue4 er4 shi2 wu3 ri4 zhou1 yi1

phone_tokens:
I_w F_u T3 I_y F_ve T4 F_er T4 I_sh F_i_zh T2 I_w F_u T3 I_r F_i_zh T4 I_zh F_ou T1 I_y F_i T1
```

So yes: `stage3b_dataset/dataset.csv` is where training reads the `phone_tokens` target labels.

## Token Encoding

The trainer reads the `phone_tokens` string and converts it into numeric IDs.

Code:

```python
def encode_phone_tokens(phone_tokens: str, token_to_id: dict[str, int]) -> list[int]:
    tokens = [token for token in phone_tokens.split() if token]
    unknown = [token for token in tokens if token not in token_to_id]
    if unknown:
        raise ValueError(f"Unknown phone token(s): {', '.join(unknown)}")
    return [token_to_id[token] for token in tokens]
```

Example:

```text
I_w F_u T3 I_y F_ve T4
```

becomes integer label IDs:

```text
[id(I_w), id(F_u), id(T3), id(I_y), id(F_ve), id(T4)]
```

These IDs are the CTC targets.

## Model Architecture

We use Hugging Face's built-in CTC model architecture:

```python
AutoModelForCTC
```

We did not write a custom CTC head class.

The CTC head is the built-in Hugging Face layer:

```python
model.lm_head
```

The trainer configures the head size here:

```python
config = AutoConfig.from_pretrained(
    model_name,
    vocab_size=vocab_size,
    ctc_loss_reduction="mean",
    pad_token_id=0,
)
```

Then it loads the model here:

```python
model = AutoModelForCTC.from_pretrained(
    model_name,
    config=config,
    ignore_mismatched_sizes=True,
)
```

Important detail:

```text
ignore_mismatched_sizes=True
```

allows Hugging Face to replace or reinitialize the old output head when its size does not match our 67 phone labels.

So the accurate description is:

```text
We use Hugging Face's Wav2Vec2 CTC architecture.
We keep the audio encoder.
We resize/reinitialize the built-in CTC head for our 67 phone-token labels.
Then we fine-tune/post-train the model on audio -> phone_tokens.
```

It is not accurate to say we wrote a new custom head.

## Is This Post-Training?

Yes. More precisely, this is downstream fine-tuning/post-training.

The process is:

```text
load base audio model
configure CTC head for 67 phone labels
train on our Mandarin audio-label pairs
save updated checkpoint
```

The selected pretrained model for real training is:

```text
jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn
```

The old smoke test command used:

```text
hf-internal-testing/tiny-random-wav2vec2
```

That tiny model is useful for proving the pipeline works, but it is not a serious pretrained Mandarin model.

## Selected Pretrained Model

The tiny random model is only for testing the code path. The selected model for real training is:

```text
jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn
```

This is the best drop-in model for our current trainer:

```text
jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn
```

Why this is the best first real model:

```text
It works with AutoProcessor + AutoModelForCTC.
It is already fine-tuned for Chinese ASR.
It expects 16kHz audio, which matches our pipeline.
We can replace its character CTC head with our 67 phone-token head.
```

So the idea is:

```text
Chinese ASR Wav2Vec2 model
-> replace old CTC output head
-> resize/reinitialize head to 67 phone-token outputs
-> post-train on our audio -> phone_tokens labels
```

This is better than `hf-internal-testing/tiny-random-wav2vec2` because the encoder already knows useful speech features from a real Chinese ASR task.

Second choice:

```text
TencentGameMate/chinese-wav2vec2-base
```

Why:

```text
Chinese Wav2Vec2 pretrained on 10k hours WenetSpeech.
MIT license.
Better as a pure Chinese audio encoder.
But it is a pretraining checkpoint, not directly an ASR CTC checkpoint, so smoke-test loading before doing a long run.
```

## CTC Training

The model outputs frame-level logits:

```text
audio -> encoder -> CTC head -> logits over 67 labels per frame
```

CTC loss compares those frame-level predictions to the target phone-token IDs.

We do not need phone timestamps.

CTC learns the alignment automatically:

```text
many audio frames -> shorter phone-token sequence
```

Core training logic:

```python
logits = model(input_values=batch["input_values"]).logits
log_probs = F.log_softmax(logits, dim=-1).transpose(0, 1)

loss = F.ctc_loss(
    log_probs,
    batch["labels"],
    input_lengths,
    batch["label_lengths"],
    blank=0,
    zero_infinity=True,
)

loss.backward()
optimizer.step()
```

## Train, Eval, And Test

Train data updates the model weights.

Eval data is checked during training but does not update weights. It is a validation set used to monitor whether training is improving or overfitting.

Test data should be checked only after training is complete.

Simple example:

```text
train:
A.wav -> update weights
B.wav -> update weights

eval:
C.wav -> calculate loss only

test:
D.wav -> final score after training
```

If train loss goes down but eval loss goes up, the model is overfitting.

If both train and eval loss go down, training is probably useful.

## Important Training Arguments

`--dataset` points to the generated training CSV:

```text
stage3b_dataset/dataset.csv
```

`--base-model` is the starting speech model.

`--output-dir` is where the trained checkpoint and reports are saved.

`--batch-size` controls how many audio samples are used per training update. In this script it is also used for eval batching, but eval does not update weights.

`--max-train-samples` limits how many training examples are used.

`--max-eval-samples` limits how many held-out validation examples are used during eval checks. This keeps eval from becoming too slow.

`--max-phone-tokens` filters out examples with very long target labels. This is useful for early CPU training because the NTU learner recordings can have hundreds or over 1000 phone tokens.

`--max-audio-seconds` trims audio for training speed.

`--eval-every` controls how often validation loss is calculated.

`--early-stop-patience` stops training if validation loss stops improving.

## Current Training Command

Selected training command:

```bash
.venv/bin/python src/run_stage3d_train_phone_ctc.py \
  --dataset stage3b_dataset/dataset.csv \
  --base-model jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn \
  --output-dir models/mandarin_phone_ctc_xlsr_chinese \
  --max-train-samples 300 \
  --max-eval-samples 50 \
  --max-steps 1000 \
  --batch-size 1 \
  --learning-rate 0.0001 \
  --max-audio-seconds 6.0 \
  --max-phone-tokens 60 \
  --eval-every 25 \
  --early-stop-patience 6
```

With `--max-phone-tokens 60`, the long NTU val/test rows are filtered out. Eval falls back to held-out short AISHELL rows. The NTU test rows should be evaluated separately as a final test set.

These are the important selected parameters:

```text
base model:        jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn
output dir:        models/mandarin_phone_ctc_xlsr_chinese
train samples:     300
eval samples:      50
training steps:    1000
batch size:        1
learning rate:     0.0001
audio cap:         6.0 seconds
max phone tokens:  60
eval every:        25 steps
early stop:        6 eval checks without improvement
```

Use `batch-size 1` for this model first because it is much larger than the tiny random model. After it works, increase batch size only if the machine has enough memory.

## Files Used By The Selected Training Command

Code files:

```text
src/run_stage3d_train_phone_ctc.py
src/stage3a_labels.py
src/stage1_pronunciation.py
```

Input dataset file:

```text
stage3b_dataset/dataset.csv
```

Important columns used from `dataset.csv`:

```text
audio_path
audio_exists
split
phone_tokens
n_phone_tokens
sample_id
```

Audio files are loaded from the paths inside `dataset.csv`. With the selected parameters, the training run mainly uses AISHELL wav files like:

```text
data/external/aishell/wav/train/S0002/train/S0002/*.wav
data/external/aishell/wav/train/S0003/train/S0003/*.wav
```

The base model is downloaded or loaded from the Hugging Face cache:

```text
jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn
~/.cache/huggingface/hub/
```

Output files:

```text
models/mandarin_phone_ctc_xlsr_chinese/model.safetensors
models/mandarin_phone_ctc_xlsr_chinese/config.json
models/mandarin_phone_ctc_xlsr_chinese/loss_curve.png
models/mandarin_phone_ctc_xlsr_chinese/loss_history.csv
models/mandarin_phone_ctc_xlsr_chinese/training_report.json
models/mandarin_phone_ctc_xlsr_chinese/id_to_phone_token.json
models/mandarin_phone_ctc_xlsr_chinese/phone_token_to_id.json
models/mandarin_phone_ctc_xlsr_chinese/processor_config.json
models/mandarin_phone_ctc_xlsr_chinese/tokenizer_config.json
models/mandarin_phone_ctc_xlsr_chinese/vocab.json
```

## Training Outputs

The trainer writes outputs like:

```text
model.safetensors
config.json
loss_curve.png
loss_history.csv
training_report.json
id_to_phone_token.json
phone_token_to_id.json
processor_config.json
tokenizer_config.json
vocab.json
```

These are saved under the chosen output directory, for example:

```text
models/mandarin_phone_ctc_xlsr_chinese/
```

## Current Results From The Local Experiments

These results are from the old tiny random pipeline test, not from the selected `jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn` training run.

The non-overfit local run used:

```text
48 train rows
12 eval rows
0 train/eval overlap
```

It produced:

```text
initial eval loss: 126.9363
final eval loss:   76.3676
final train loss:  73.3502
```

A separate test-only evaluation on the actual NTU `split == test` rows produced:

```text
mean test loss:            101.8975
phone-token weighted loss: 92.1747
```

That test loss is higher because the test rows are long NTU learner recordings, while the training/eval run used shorter AISHELL native-speaker rows.
