import { Router } from 'express';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import crypto from 'crypto';

const router = Router();

const uploadsDir = path.resolve(__dirname, '../../uploads');

const piperBin = path.resolve(__dirname, '../../bin/piper/piper.exe');
const piperModel = path.resolve(__dirname, '../../piper-voices/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx');
const piperConfig = path.resolve(__dirname, '../../piper-voices/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx.json');

fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});

async function getFileSizeBytes(filePath: string): Promise<number> {
  const st = await fs.stat(filePath);
  return st.size;
}

router.post('/', async (req, res) => {
  const reqId = crypto.randomBytes(4).toString('hex');
  const t0 = Date.now();

  let outPath: string | undefined;

  try {
    const { text } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Falta el campo "text"' });
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return res.status(400).json({ error: 'El campo "text" está vacío' });
    }

    const outId = crypto.randomUUID();
    outPath = path.join(uploadsDir, `${outId}.wav`);

    const args = ['--model', piperModel, '--config', piperConfig, '--output_file', outPath];

    console.log(`TTS[${reqId}] start`);
    console.log(`TTS[${reqId}] textChars=${cleanText.length}`);
    console.log(`TTS[${reqId}] piperBin=${piperBin}`);
    console.log(`TTS[${reqId}] model=${piperModel}`);
    console.log(`TTS[${reqId}] config=${piperConfig}`);
    console.log(`TTS[${reqId}] output=${outPath}`);
    console.log(`TTS[${reqId}] args=${args.join(' ')}`);

    const tPiper0 = Date.now();

    await new Promise<void>((resolve, reject) => {
      const child = spawn(piperBin, args, { cwd: uploadsDir });

      child.stdout.on('data', d => console.log(`TTS[${reqId}] [piper stdout]`, d.toString()));
      child.stderr.on('data', d => console.error(`TTS[${reqId}] [piper stderr]`, d.toString()));

      child.on('error', err => {
        console.error(`TTS[${reqId}] spawn error`, err);
        reject(err);
      });

      child.stdin.write(cleanText);
      child.stdin.end();

      child.on('exit', code => {
        const ms = Date.now() - tPiper0;
        console.log(`TTS[${reqId}] piperExit code=${code} piperMs=${ms}ms`);
        if (code === 0) resolve();
        else reject(new Error(`piper salió con código ${code}`));
      });
    });

    const wavBytes = await getFileSizeBytes(outPath);
    console.log(`TTS[${reqId}] wavBytes=${wavBytes} (${(wavBytes / (1024 * 1024)).toFixed(2)} MB)`);

    const data = await fs.readFile(outPath);

    // limpiar wav temporal
    await fs.unlink(outPath).catch(() => {});

    const totalMs = Date.now() - t0;
    console.log(`TTS[${reqId}] done total=${totalMs}ms sendBytes=${data.length}`);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', 'inline; filename="tts.wav"');
    return res.send(data);
  } catch (err: any) {
    const totalMs = Date.now() - t0;
    console.error(`TTS[${reqId}] FAIL total=${totalMs}ms`, err);

    if (outPath) {
      await fs.unlink(outPath).catch(() => {});
    }

    return res.status(500).json({
      error: 'Error interno en TTS',
      details: err?.message || String(err)
    });
  }
});

export default router;
