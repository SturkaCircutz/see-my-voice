# 声见 · See My Voice

这是一个本地运行的中文发音练习原型。用户可以输入想练的中文句子，浏览器实时录音，然后后端调用 FunASR Mandarin ASR 和现有声调/节奏分析代码，返回可懂度、拼音、音节反馈和练习建议。

## 当前能力

- 自定义练习文本
- 浏览器麦克风实时录音
- 本地 Python 后端分析录音
- FunASR Paraformer 判断系统是否听懂
- 拼音、声调、音节卡片和嘴型/舌位提示
- 保留进步追踪界面原型

## 运行

```bash
cd /Users/chloe/Downloads/my-voice
./start.sh
```

然后打开：

```text
http://127.0.0.1:4173
```

第一次分析时 FunASR 可能需要加载模型，会比较慢。后续录音会快一些。

## 测试

```bash
node --test tests/state.test.js
```

## 技术说明

前端不直接运行 FunASR。浏览器负责录音和展示，`server.py` 负责调用 `/Users/chloe/Library/CloudStorage/OneDrive-BowdoinCollege/Desktop/see-my-voice` 里的 Stage 2B 分析逻辑。
