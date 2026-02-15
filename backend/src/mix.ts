import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { v4 } from 'uuid';

const router = Router();
const upload = multer({ dest: path.join(__dirname, '../uploads/') });

// Max 10 archivos de audio simultáneos para mezclar
router.post('/', upload.array('audio', 10), async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No se recibieron archivos de audio.' });
    }

    console.log(`[MIX] Recibidos ${files.length} archivos para mezclar.`);

    try {
        const outputFilename = `${v4()}_mix.mp3`;
        const outputPath = path.resolve(files[0]!.destination, outputFilename);

        // Construir comando ffmpeg
        // ffmpeg -i 1.webm -i 2.webm -filter_complex amix=inputs=2:duration=longest output.mp3
        const args = [];
        const inputsCount = files.length;

        // Inputs
        for (const file of files) {
            args.push('-i', file.path);
        }

        // Filter complex
        // amix=inputs=N:duration=longest:dropout_transition=2
        args.push('-filter_complex', `amix=inputs=${inputsCount}:duration=longest:dropout_transition=3`);

        // Output format
        args.push('-b:a', '192k'); // Bitrate decente
        args.push('-AC', '2');    // Stereo
        args.push(outputPath);

        console.log('[MIX] Ejecutando ffmpeg:', 'ffmpeg', args.join(' '));

        await runFfmpeg('ffmpeg', args);

        console.log('[MIX] Mezcla completada:', outputFilename);

        res.download(outputPath, 'conversacion_completa.mp3', (err) => {
            if (err) console.error('Error enviando archivo:', err);

            // Limpieza
            cleanupFiles([...files.map(f => f.path), outputPath]);
        });

    } catch (error: any) {
        console.error('[MIX] Error procesando mezcla:', error);
        res.status(500).json({ error: 'Error interno al mezclar audios.', details: error.message });
        cleanupFiles(files.map(f => f.path));
    }
});

function runFfmpeg(cmd: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args);

        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exited with code ${code}`));
        });

        child.on('error', (err) => reject(err));
    });
}

function cleanupFiles(paths: string[]) {
    for (const p of paths) {
        fs.unlink(p, () => { });
    }
}

export default router;
