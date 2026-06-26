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
cd /home/SturkaCircutz/see-my-voice/web
./start.sh
```

打开：

```text
http://127.0.0.1:4173
```

外部访问：

```text
http://seemyvoice.ddns.net:4173
```

公网访问需要同时满足：

```text
seemyvoice.ddns.net -> 当前公网 IPv4
TCP 4173 -> 运行本服务的电脑局域网 IP:4173
```

直接打开 `http://seemyvoice.ddns.net` 会走端口 `80`。如果要省略 `:4173`，需要把公网 TCP `80` 转发到本服务端口，或让服务运行在 `80` 端口。

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
