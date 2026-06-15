# 安装与运行

## 环境要求

- Python 3
- 现代浏览器：Chrome、Edge 或 Safari 新版本
- 已安装 `see-my-voice` 项目依赖：`funasr`、`pypinyin`、`numpy`、`scipy`、`soundfile`、`av` 等

后端默认会读取：

```text
/Users/chloe/Library/CloudStorage/OneDrive-BowdoinCollege/Desktop/see-my-voice
```

如果你的项目路径不同，可以启动前设置：

```bash
export SEE_MY_VOICE_DIR=/path/to/see-my-voice
```

## 启动

```bash
cd /Users/chloe/Downloads/my-voice
./start.sh
```

打开：

```text
http://127.0.0.1:4173
```

## 使用

1. 在主练习页输入想练习的中文句子。
2. 点击“开始录音”。
3. 对着麦克风说出句子。
4. 再次点击按钮结束录音。
5. 等待 FunASR 和声调/节奏模块返回结果。

## 常见问题

- 浏览器没有麦克风权限：在地址栏或系统设置中允许浏览器使用麦克风。
- 第一次分析很慢：模型首次加载需要时间，属于正常情况。
- 端口被占用：使用 `PORT=8080 ./start.sh`，然后打开 `http://127.0.0.1:8080`。
- webm 解码失败：建议安装 ffmpeg；如果没有 ffmpeg，后端会尝试用现有 PyAV 音频读取逻辑处理。
