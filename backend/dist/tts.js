"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const promises_1 = __importDefault(require("fs/promises"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const uploadsDir = path_1.default.resolve(__dirname, '../../uploads');
const piperBin = path_1.default.resolve(__dirname, '../../bin/piper/piper.exe');
const piperModel = path_1.default.resolve(__dirname, '../../piper-voices/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx');
const piperConfig = path_1.default.resolve(__dirname, '../../piper-voices/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx.json');
promises_1.default.mkdir(uploadsDir, { recursive: true }).catch(() => { });
async function getFileSizeBytes(filePath) {
    const st = await promises_1.default.stat(filePath);
    return st.size;
}
router.post('/', async (req, res) => {
    const reqId = crypto_1.default.randomBytes(4).toString('hex');
    const t0 = Date.now();
    let outPath;
    try {
        const { text } = req.body || {};
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Falta el campo "text"' });
        }
        const cleanText = text.trim();
        if (!cleanText) {
            return res.status(400).json({ error: 'El campo "text" está vacío' });
        }
        const outId = crypto_1.default.randomUUID();
        outPath = path_1.default.join(uploadsDir, `${outId}.wav`);
        const args = ['--model', piperModel, '--config', piperConfig, '--output_file', outPath];
        console.log(`TTS[${reqId}] start`);
        console.log(`TTS[${reqId}] textChars=${cleanText.length}`);
        console.log(`TTS[${reqId}] piperBin=${piperBin}`);
        console.log(`TTS[${reqId}] model=${piperModel}`);
        console.log(`TTS[${reqId}] config=${piperConfig}`);
        console.log(`TTS[${reqId}] output=${outPath}`);
        console.log(`TTS[${reqId}] args=${args.join(' ')}`);
        const tPiper0 = Date.now();
        await new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(piperBin, args, { cwd: uploadsDir });
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
                if (code === 0)
                    resolve();
                else
                    reject(new Error(`piper salió con código ${code}`));
            });
        });
        const wavBytes = await getFileSizeBytes(outPath);
        console.log(`TTS[${reqId}] wavBytes=${wavBytes} (${(wavBytes / (1024 * 1024)).toFixed(2)} MB)`);
        const data = await promises_1.default.readFile(outPath);
        // limpiar wav temporal
        await promises_1.default.unlink(outPath).catch(() => { });
        const totalMs = Date.now() - t0;
        console.log(`TTS[${reqId}] done total=${totalMs}ms sendBytes=${data.length}`);
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', 'inline; filename="tts.wav"');
        return res.send(data);
    }
    catch (err) {
        const totalMs = Date.now() - t0;
        console.error(`TTS[${reqId}] FAIL total=${totalMs}ms`, err);
        if (outPath) {
            await promises_1.default.unlink(outPath).catch(() => { });
        }
        return res.status(500).json({
            error: 'Error interno en TTS',
            details: err?.message || String(err)
        });
    }
});
exports.default = router;
//# sourceMappingURL=tts.js.map