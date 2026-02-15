import { Injectable, inject } from '@angular/core';
import { SessionService } from '../services/session.service';
import { HistoryRecorderService } from '../../history/services/history-recorder.service';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

interface WhisperSegment {
    text: string;
    timestamps?: { from: string; to: string };
    offsets?: { from: number; to: number };
}

interface WhisperJson {
    text?: string;
    segments?: { start: number; end: number; text: string }[];
    transcription?: WhisperSegment[];
    [key: string]: any;
}

interface ProcessedSegment {
    speaker: string;
    startMs: number;
    endMs: number;
    text: string;
}

@Injectable({ providedIn: 'root' })
export class DiarizationService {
    private readonly baseUrl = 'http://localhost:3000';
    private session = inject(SessionService);
    private recorder = inject(HistoryRecorderService);
    private http = inject(HttpClient);

    async processSessionAndSave(prompt: string = ''): Promise<boolean> {
        const recordings = this.session.getAllRecordedBlobs();
        if (recordings.length === 0) {
            console.warn('No hay grabaciones para procesar');
            return false;
        }
        return this.processBlobsAndSave(recordings, prompt);
    }

    async processFileAndSave(file: File, prompt: string = ''): Promise<boolean> {
        // Simular structura de grabación
        const recordings = [{
            name: 'Archivo Importado',
            blobs: [file as Blob]
        }];
        return this.processBlobsAndSave(recordings, prompt);
    }

    private async processBlobsAndSave(recordings: { name: string, blobs: Blob[] }[], prompt: string): Promise<boolean> {
        const segments: ProcessedSegment[] = [];
        const speakerNames: string[] = [];
        const audioBlobs = new Map<string, Blob>();

        // 2. Procesar cada canal
        for (const rec of recordings) {
            speakerNames.push(rec.name);
            const fullBlob = new Blob(rec.blobs, { type: 'audio/webm' });
            // Nota: Si viene un MP3/WAV, el Blob type será ese, pero Whisper backend lo maneja via ffmpeg 
            // siempre y cuando el backend acepte el mime type o ffmpeg lo detecte.
            // Para asegurar, pasaremos el blob tal cual.
            audioBlobs.set(rec.name, fullBlob);

            try {
                const json = await this.transcribeWithSegments(fullBlob, prompt);

                if (json.segments) {
                    json.segments.forEach(seg => {
                        segments.push({
                            speaker: rec.name,
                            startMs: seg.start * 1000,
                            endMs: seg.end * 1000,
                            text: seg.text.trim()
                        });
                    });
                } else if (json.transcription) {
                    json.transcription.forEach(item => {
                        let start = 0;
                        let end = 0;
                        if (item.offsets) {
                            start = item.offsets.from;
                            end = item.offsets.to;
                        } else if (item.timestamps) {
                            start = this.parseTime(item.timestamps.from);
                            end = this.parseTime(item.timestamps.to);
                        }
                        segments.push({
                            speaker: rec.name,
                            startMs: start,
                            endMs: end,
                            text: item.text.trim()
                        });
                    });
                } else {
                    console.warn(`[Diarization] ${rec.name}: JSON desconocido`, json);
                }
            } catch (e) {
                console.error(`Error transcribiendo canal de ${rec.name}:`, e);
            }
        }

        // 3. Ordenar, Fusionar y Corregir
        if (segments.length > 0) {
            segments.sort((a, b) => a.startMs - b.startMs);

            // Fusión inteligente
            const mergedSegments = this.smartMergeSegments(segments);

            const lastSeg = segments[segments.length - 1];
            const durationMs = lastSeg ? lastSeg.endMs : 0;

            const combinedText = mergedSegments
                .map(s => {
                    // Corrección ortográfica contextual
                    let finalText = s.text;
                    if (prompt) {
                        finalText = this.applyKeywordCorrection(finalText, prompt);
                    }
                    return `${s.speaker}: ${finalText}`;
                })
                .join('\n\n');

            await this.recorder.recordDiarization({
                combinedText,
                startTime: Date.now() - durationMs,
                durationMs,
                speakers: speakerNames,
                audioBlobs: audioBlobs
            });
            console.log('Diarización guardada con éxito.');
            return true;
        }

        console.warn('No se obtuvieron segmentos válidos.');
        return false;
    }

    private parseTime(timeStr: string): number {
        // Formato esperado: "HH:MM:SS,mmm" o "00:00:07,920"
        if (!timeStr) return 0;
        try {
            // Reemplazar coma por punto por si acaso
            const cleanStr = timeStr.replace(',', '.');
            const [hms, msPart] = cleanStr.includes('.') ? cleanStr.split('.') : [cleanStr, '0'];
            const parts = hms.split(':').map(Number);
            let h = 0, m = 0, s = 0;

            if (parts.length === 3) { [h, m, s] = parts; }
            else if (parts.length === 2) { [m, s] = parts; }
            else if (parts.length === 1) { [s] = parts; }

            // msPart puede ser "920" o "7" (decimas). Whisper suele padding a 3 digitos pero aseguremos.
            // Si es "920" -> 920ms. Si es "500" -> 500ms.
            const ms = parseInt(msPart.substring(0, 3).padEnd(3, '0'));
            // Ojo: whisper.cpp output es "920", es literal ms. 
            // Si viene "07,920", msPart es "920". parseInt("920") = 920. Correcto.

            return (h * 3600 + m * 60 + s) * 1000 + (parseInt(msPart) || 0);
        } catch {
            return 0;
        }
    }

    private async transcribeWithSegments(blob: Blob, prompt: string): Promise<WhisperJson> {
        const formData = new FormData();
        formData.append('audio', blob);
        if (prompt) {
            formData.append('prompt', prompt);
        }

        console.log(`[Diarization] Enviando blob de ${blob.size} bytes a STT...`);
        // Usar responseType 'json' es default en HttpClient
        const result = await lastValueFrom(
            this.http.post<WhisperJson>(`${this.baseUrl}/stt?segments=true`, formData)
        );
        console.log('[Diarization] Respuesta STT recibida');
        return result;
    }

    private formatTime(ms: number): string {
        const date = new Date(ms);
        return date.toISOString().substr(11, 8); // HH:MM:SS simple
    }

    private formatDuration(ms: number): string {
        const sec = Math.floor(ms / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}m ${s}s`;
    }

    private smartMergeSegments(segments: ProcessedSegment[]): ProcessedSegment[] {
        if (segments.length === 0) return [];

        const merged: ProcessedSegment[] = [];
        let current = { ...segments[0] };

        for (let i = 1; i < segments.length; i++) {
            const next = segments[i];
            const silenceGap = next.startMs - current.endMs;

            if (next.speaker === current.speaker && silenceGap < 3000) {
                current.endMs = next.endMs;
                const sep = current.text.match(/[.!?]$/) ? ' ' : ' ';
                current.text += sep + next.text;
            } else {
                merged.push(current);
                current = { ...next };
            }
        }
        merged.push(current);
        return merged;
    }

    private applyKeywordCorrection(text: string, prompt: string): string {
        if (!prompt || !text) return text;

        const keywords = prompt.split(/[,;\n]+/).map(k => k.trim()).filter(k => k.length > 3);
        if (keywords.length === 0) return text;

        const words = text.split(/\s+/);

        const correctedWords = words.map(word => {
            const cleanWord = word.replace(/[.,!?;:()"]/g, '');
            if (cleanWord.length < 3) return word;

            for (const key of keywords) {
                if (Math.abs(cleanWord.length - key.length) > 2) continue;

                const dist = this.levenshteinDistance(cleanWord.toLowerCase(), key.toLowerCase());
                const maxLength = Math.max(cleanWord.length, key.length);
                const similarity = 1 - (dist / maxLength);

                if (similarity >= 0.8 || (dist <= 1 && maxLength >= 4)) {
                    // Reconstruir preservando puntuacion a derecha/izquierda si es simple
                    if (word === cleanWord) return key;
                    return word.replace(cleanWord, key);
                }
            }
            return word;
        });

        return correctedWords.join(' ');
    }

    private levenshteinDistance(a: string, b: string): number {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }
}
