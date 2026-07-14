# See My Voice

**See My Voice** is a **web-based Mandarin pronunciation practice app** that helps learners compare spoken audio with expected Mandarin sound targets.

The project includes a **GPU-trained Mandarin phone-token CTC model** that predicts **initials**, **finals**, and **tones** from speech audio. This matches the teaching flow of the app: instead of only checking whole Chinese characters, the model supports feedback at the sound level.

## **What The Model Learns**

The model is trained to convert speech into Mandarin pronunciation labels:

```text
audio -> Mandarin phone tokens
```

Example labels:

```text
你 ni2  -> I_n F_i T2
好 hao3 -> I_h F_ao T3
爱 ai4  -> F_ai T4
女 nv3  -> I_n F_v T3
是 shi4 -> I_sh F_i_zh T4
字 zi4  -> I_z F_i_z T4
儿 er2  -> F_er T2
```

This gives the app a useful path for pronunciation feedback:

```text
expected phones vs predicted phones
```

So the app can focus on **which sound changed**, such as an **initial**, **final**, or **tone**.

## **Latest Training Run**

The latest trained model artifact is:

```text
models/mandarin_phone_ctc_xlsr_chinese_gpu
```

**Training highlights:**

- **Base model:** `jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn`
- **Training device:** `cuda`
- **Training examples:** `300`
- **Validation examples:** `50`
- **Training steps:** `1000`
- **Phone vocabulary size:** `67`
- **Train/validation overlap:** `0`
- **Final training loss:** `1.5815`
- **Best validation loss:** `1.9028`
- **Best validation step:** `1000`
- **Validation loss reduction during the run:** **89.9%**

The run used a pretrained Chinese Wav2Vec2/XLS-R CTC model and adapted it to the app's **67 Mandarin phone-token labels**. On the local RTX 4060 GPU setup, the default training mode keeps the large acoustic encoder frozen and trains the **CTC output head** for the phone-token target space.

## **Training Loss Graph**

The loss curve below comes from the latest GPU run:

![Training loss curve](docs/assets/stage3d-phone-ctc-loss-curve.png)

**The graph shows strong learning behavior:** validation loss dropped from **18.8047** at the first evaluation to **1.9028** at step **1000**, while training loss ended at **1.5815**.

## **Why This Helps The Website**

The website can use the model output to support **sound-level Mandarin pronunciation feedback**:

- **Initial feedback:** detect changes like `I_n` vs `I_l`
- **Final feedback:** detect changes like `F_i` vs `F_ao`
- **Tone feedback:** compare `T1` through `T5`
- **Syllable feedback:** compare the full expected token sequence for each Mandarin syllable

This is useful because Mandarin pronunciation learning often focuses on one part of a syllable at a time. The phone-token design lets the app explain feedback in the same structure learners practice: **initial + final + tone**.

## **Training Pipeline**

The training pipeline includes:

- **Fixed 67-token Mandarin phone vocabulary**
- **Dataset manifest with audio paths, text, pinyin, and phone-token labels**
- **CTC loss training**
- **CUDA/GPU execution through PyTorch**
- **Validation loss tracking**
- **Early stopping support**
- **Saved model artifacts**
- **Saved loss history and loss graph**

The core training script is:

```text
src/run_stage3d_train_phone_ctc.py
```

The model files are kept out of Git because the trained tensor file is large. The generated model artifacts can be uploaded separately to Hugging Face or another model store.
