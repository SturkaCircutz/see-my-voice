# See My Voice

See My Voice is a Mandarin pronunciation practice app.

The app lets a learner record speech, compare it with the expected Mandarin sounds, and get practice feedback. The project also includes a trained phone-token CTC model that is **starting to learn Mandarin initials, finals, and tones from audio**.

## Current Model Status

Latest model:

```text
models/mandarin_phone_ctc_xlsr_chinese_gpu
```

> **Bottom line:** the model is learning, but **it is not ready to be trusted as a final pronunciation judge yet**.

Training summary:

- Base model: `jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn`
- Training examples: `300`
- Validation examples: `50`
- Training steps: `1000`
- **Best validation loss: `1.9028`**
- **Final training loss: `1.5815`**
- Train/validation overlap: `0`

Held-out test result:

- Test examples: `2` long NTU learner recordings
- **Mean test loss: `2.3613`**
- **Phone-token weighted test loss: `2.3719`**
- **Greedy phone-token error rate: about `70%`**
- Exact phone-token matches: `0`

**Lower loss is good.** The loss improved a lot compared with the old tiny test model, but **the decoded phone tokens are still often wrong, especially tones**. Use this model as a **research prototype**, not as a production scorer.

## Training Loss Picture

This is the loss curve from the latest trained model:

![Training loss curve](docs/assets/stage3d-phone-ctc-loss-curve.png)

**The curve shows that loss dropped quickly at the start**, then kept improving slowly through the end of the run.
