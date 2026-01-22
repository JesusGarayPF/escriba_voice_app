import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import crypto from 'crypto';

const router = Router();

const uploadsDir = path.resolve(__dirname, '../../uploads');

const whisperBin = path.resolve(__dirname, '../../bin/whisper/whisper-cli.exe');
const whisperModel = path.resolve(__dirname, '../../models/whisper/ggml-base.bin');

const ffmpegBin = 'ffmpeg';

fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({ storage });

function run(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });

    child.stdout.on('data', d => console.log(`[${path.basename(cmd)} stdout]`, d.toString()));
    child.stderr.on('data', d => console.error(`[${path.basename(cmd)} stderr]`, d.toString()));

    child.on('error', err => reject(err));
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${cmd} salió con código ${code}`))));
  });
}

async function getFileSizeBytes(filePath: string): Promise<number> {
  const st = await fs.stat(filePath);
  return st.size;
}

// Extrae la duración (segundos) del wav convertido usando ffprobe si existe; si no, lo omitimos.
async function tryGetDurationSeconds(wavPath: string): Promise<number | null> {
  // Intentamos usar ffprobe (suele venir con ffmpeg en PATH)
  const ffprobe = 'ffprobe';
  return new Promise((resolve) => {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      wavPath
    ];

    const child = spawn(ffprobe, args, { cwd: uploadsDir });
    let out = '';
    child.stdout.on('data', d => (out += d.toString()));
    child.on('exit', code => {
      if (code !== 0) return resolve(null);
      const v = Number.parseFloat(out.trim());
      resolve(Number.isFinite(v) ? v : null);
    });
    child.on('error', () => resolve(null));
  });
}

router.post('/', upload.single('audio'), async (req, res) => {
  const reqId = crypto.randomBytes(4).toString('hex');

  let inputPath: string | undefined;
  let wavPath: string | undefined;
  let txtPath: string | undefined;

  const t0 = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha recibido ningún archivo' });
    }

    inputPath = req.file.path;
    const inputExt = path.extname(inputPath);
    const baseName = path.basename(inputPath, inputExt);

    wavPath = path.join(uploadsDir, `${baseName}_16k.wav`);
    const txtBase = path.join(uploadsDir, `${baseName}_out`);
    txtPath = `${txtBase}.txt`;

    const inputBytes = await getFileSizeBytes(inputPath);

    console.log(`STT[${reqId}] start`);
    console.log(`STT[${reqId}] inputPath=${inputPath}`);
    console.log(`STT[${reqId}] inputBytes=${inputBytes} (${(inputBytes / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`STT[${reqId}] whisperBin=${whisperBin}`);
    console.log(`STT[${reqId}] whisperModel=${whisperModel}`);
    console.log(`STT[${reqId}] uploadsDir=${uploadsDir}`);

    // 1) Convertir a WAV 16k mono PCM
    const ffmpegArgs = ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wavPath];
    const tFfmpeg0 = Date.now();
    console.log(`STT[${reqId}] ffmpeg ${ffmpegArgs.join(' ')}`);
    await run(ffmpegBin, ffmpegArgs, uploadsDir);
    const tFfmpegMs = Date.now() - tFfmpeg0;

    const wavBytes = await getFileSizeBytes(wavPath);
    const wavDur = await tryGetDurationSeconds(wavPath);

    console.log(`STT[${reqId}] ffmpegDone=${tFfmpegMs}ms wavBytes=${wavBytes} (${(wavBytes / (1024 * 1024)).toFixed(2)} MB)` + (wavDur ? ` wavDuration=${wavDur.toFixed(2)}s` : ''));

    // 2) Whisper sobre WAV convertido
    const whisperArgs = [
      '-m', whisperModel,
      '-f', wavPath,
      '-l', 'es',
      '-otxt',
      '-of', txtBase
    ];
    const tWhisper0 = Date.now();
    console.log(`STT[${reqId}] whisper ${whisperArgs.join(' ')}`);
    await run(whisperBin, whisperArgs, uploadsDir);
    const tWhisperMs = Date.now() - tWhisper0;

    // Leer TXT
    const tRead0 = Date.now();
    const text = (await fs.readFile(txtPath, 'utf8')).trim();
    const tReadMs = Date.now() - tRead0;

    const totalMs = Date.now() - t0;

    console.log(`STT[${reqId}] whisperDone=${tWhisperMs}ms readTxt=${tReadMs}ms total=${totalMs}ms textChars=${text.length}`);

    // responder primero
    res.json({ text });

    // limpiar después (no bloqueante)
    fs.unlink(inputPath).catch(() => {});
    fs.unlink(wavPath).catch(() => {});
    fs.unlink(txtPath).catch(() => {});
  } catch (err: any) {
    const totalMs = Date.now() - t0;
    console.error(`STT[${reqId}] FAIL total=${totalMs}ms`, err);

    if (inputPath) await fs.unlink(inputPath).catch(() => {});
    if (wavPath) await fs.unlink(wavPath).catch(() => {});
    if (txtPath) await fs.unlink(txtPath).catch(() => {});

    return res.status(500).json({
      error: 'Error interno en STT',
      details: err?.message || String(err)
    });
  }
});

export default router;
