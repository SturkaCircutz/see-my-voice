import Link from "next/link";

const codeBlockClass =
  "overflow-x-auto rounded-lg border border-[rgba(53,84,110,0.16)] bg-[#191a2f] px-3 py-2.5 text-xs leading-6 text-white";
const sectionClass =
  "grid gap-3 rounded-lg border border-[rgba(53,84,110,0.12)] bg-white p-4 shadow-[0_14px_36px_rgba(31,38,65,0.08)]";

export default function ModelPage() {
  return (
    <main className="min-h-screen bg-[#ece8df] px-4 py-6 text-[#263547]">
      <div className="mx-auto grid max-w-4xl gap-4">
        <header className="grid gap-2 rounded-lg bg-[#191a2f] px-5 py-6 text-white">
          <Link className="text-xs font-extrabold text-[rgba(255,255,255,0.68)]" href="/">
            Back to See My Voice
          </Link>
          <h1 className="m-0 text-3xl font-black tracking-normal text-[#cf4b31]">
            Model Options
          </h1>
          <p className="m-0 max-w-2xl text-sm font-bold leading-7 text-[rgba(255,255,255,0.72)]">
            The public Vercel app can run with a hosted free ASR fallback. Users who want the
            project-trained phone-token model can deploy that model service and connect its API URL.
          </p>
        </header>

        <section className={sectionClass}>
          <span className="text-xs font-black uppercase text-[#209a78]">Default Vercel Mode</span>
          <h2 className="m-0 text-xl font-black">Hosted free ASR fallback</h2>
          <p className="m-0 text-sm leading-7 text-[#647181]">
            This mode uses a hosted speech-recognition model instead of running the 1.26 GB See My
            Voice model. It keeps the website usable on Vercel, but it only checks what text was
            heard. It does not produce initial, final, or tone phone-token labels.
          </p>
          <div className={codeBlockClass}>
            <pre className="m-0">{`HF_INFERENCE_TOKEN=<your-hugging-face-token>
HF_ASR_MODEL_ID=jonatasgrosman/wav2vec2-large-xlsr-53-chinese-zh-cn`}</pre>
          </div>
          <p className="m-0 text-sm leading-7 text-[#647181]">
            Add those variables to the backend Vercel project, then redeploy the backend.
          </p>
        </section>

        <section className={sectionClass}>
          <span className="text-xs font-black uppercase text-[#cf4b31]">Optional Trained Model</span>
          <h2 className="m-0 text-xl font-black">Use the See My Voice phone-token model</h2>
          <p className="m-0 text-sm leading-7 text-[#647181]">
            Want sound-level feedback from our trained model? Deploy the model service yourself,
            then point the backend to the service URL.
          </p>
          <div className={codeBlockClass}>
            <pre className="m-0">{`cd /home/jiawen/see-my-voice
source .venv/bin/activate
python tools/deploy_hf_pronunciation_api.py`}</pre>
          </div>
          <p className="m-0 text-sm leading-7 text-[#647181]">
            If Hugging Face blocks Docker Spaces on your account, run the model locally and expose
            it with a tunnel while you need it.
          </p>
          <div className={codeBlockClass}>
            <pre className="m-0">{`SEE_MY_VOICE_PHONE_CTC_MODEL_DIR=models/mandarin_phone_ctc_xlsr_chinese_gpu \\
PORT=7860 \\
python web/server.py

cloudflared tunnel --url http://localhost:7860`}</pre>
          </div>
          <p className="m-0 text-sm leading-7 text-[#647181]">
            Then set this on the backend Vercel project and redeploy:
          </p>
          <div className={codeBlockClass}>
            <pre className="m-0">{`PRONUNCIATION_API_URL=https://<your-pronunciation-service>`}</pre>
          </div>
          <a
            className="text-sm font-black text-[#209a78]"
            href="https://huggingface.co/sturka/see-my-voice-mandarin-phone-ctc"
            rel="noreferrer"
            target="_blank"
          >
            View the uploaded trained model on Hugging Face
          </a>
        </section>
      </div>
    </main>
  );
}
