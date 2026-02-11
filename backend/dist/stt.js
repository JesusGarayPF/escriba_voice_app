"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const child_process_1 = require("child_process");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const uploadsDir = path_1.default.resolve(__dirname, '../../uploads');
const whisperBin = path_1.default.resolve(__dirname, '../../bin/whisper/whisper-cli.exe');
const whisperModel = path_1.default.resolve(__dirname, '../../models/whisper/ggml-base.bin');
const ffmpegBin = 'ffmpeg';
promises_1.default.mkdir(uploadsDir, { recursive: true }).catch(() => { });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const id = crypto_1.default.randomBytes(8).toString('hex');
        const ext = path_1.default.extname(file.originalname) || '.webm';
        cb(null, `${id}${ext}`);
    }
});
const upload = (0, multer_1.default)({ storage });
function run(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(cmd, args, { cwd });
        child.stdout.on('data', d => console.log(`[${path_1.default.basename(cmd)} stdout]`, d.toString()));
        child.stderr.on('data', d => console.error(`[${path_1.default.basename(cmd)} stderr]`, d.toString()));
        child.on('error', err => reject(err));
        child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${cmd} salió con código ${code}`))));
    });
}
async function getFileSizeBytes(filePath) {
    const st = await promises_1.default.stat(filePath);
    return st.size;
}
// Extrae la duración (segundos) del wav convertido usando ffprobe si existe; si no, lo omitimos.
async function tryGetDurationSeconds(wavPath) {
    // Intentamos usar ffprobe (suele venir con ffmpeg en PATH)
    const ffprobe = 'ffprobe';
    return new Promise((resolve) => {
        const args = [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            wavPath
        ];
        const child = (0, child_process_1.spawn)(ffprobe, args, { cwd: uploadsDir });
        let out = '';
        child.stdout.on('data', d => (out += d.toString()));
        child.on('exit', code => {
            if (code !== 0)
                return resolve(null);
            const v = Number.parseFloat(out.trim());
            resolve(Number.isFinite(v) ? v : null);
        });
        child.on('error', () => resolve(null));
    });
}
router.post('/', upload.single('audio'), async (req, res) => {
    const reqId = crypto_1.default.randomBytes(4).toString('hex');
    let inputPath;
    let wavPath;
    let txtBase;
    let outPath;
    const t0 = Date.now();
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha recibido ningún archivo' });
        }
        inputPath = req.file.path;
        const inputExt = path_1.default.extname(inputPath);
        const baseName = path_1.default.basename(inputPath, inputExt);
        wavPath = path_1.default.join(uploadsDir, `${baseName}_16k.wav`);
        txtBase = path_1.default.join(uploadsDir, `${baseName}_out`);
        // Determinar formato de salida
        const outputJson = req.query.segments === 'true';
        const outputExt = outputJson ? '.json' : '.txt';
        outPath = `${txtBase}${outputExt}`;
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
            outputJson ? '-oj' : '-otxt',
            '-of', txtBase
        ];
        const tWhisper0 = Date.now();
        console.log(`STT[${reqId}] whisper ${whisperArgs.join(' ')}`);
        await run(whisperBin, whisperArgs, uploadsDir);
        const tWhisperMs = Date.now() - tWhisper0;
        // Leer Resultado
        const tRead0 = Date.now();
        const rawContent = (await promises_1.default.readFile(outPath, 'utf8')).trim();
        const tReadMs = Date.now() - tRead0;
        const totalMs = Date.now() - t0;
        // Preparar respuesta
        let responseData;
        let textLength = 0;
        if (outputJson) {
            try {
                const json = JSON.parse(rawContent);
                responseData = { ...json, _raw: true }; // Devolver todo el JSON
                // Intentar extraer texto completo para logs
                textLength = JSON.stringify(json).length;
            }
            catch (e) {
                console.error(`STT[${reqId}] Error parsing JSON`, e);
                // Fallback
                responseData = { text: '', error: 'JSON parse error', raw: rawContent };
            }
        }
        else {
            responseData = { text: rawContent };
            textLength = rawContent.length;
        }
        console.log(`STT[${reqId}] whisperDone=${tWhisperMs}ms read=${tReadMs}ms total=${totalMs}ms len=${textLength}`);
        // responder primero
        res.json(responseData);
        // limpiar después (no bloqueante)
        promises_1.default.unlink(inputPath).catch(() => { });
        promises_1.default.unlink(wavPath).catch(() => { });
        promises_1.default.unlink(outPath).catch(() => { });
    }
    catch (err) {
        const totalMs = Date.now() - t0;
        console.error(`STT[${reqId}] FAIL total=${totalMs}ms`, err);
        if (inputPath)
            await promises_1.default.unlink(inputPath).catch(() => { });
        if (wavPath)
            await promises_1.default.unlink(wavPath).catch(() => { });
        // Intentar limpiar ambos por si acaso
        if (txtBase) {
            await promises_1.default.unlink(`${txtBase}.txt`).catch(() => { });
            await promises_1.default.unlink(`${txtBase}.json`).catch(() => { });
        }
        return res.status(500).json({
            error: 'Error interno en STT',
            details: err?.message || String(err)
        });
    }
});
exports.default = router;
//# sourceMappingURL=stt.js.map