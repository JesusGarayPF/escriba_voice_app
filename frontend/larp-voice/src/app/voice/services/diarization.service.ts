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

    async processSessionAndSave(): Promise<boolean> {
        const recordings = this.session.getAllRecordedBlobs();
        if (recordings.length === 0) {
            console.warn('No hay grabaciones para procesar');
            return false;
        }

        const segments: ProcessedSegment[] = [];
        const speakerNames: string[] = [];

        // 2. Procesar cada canal
        for (const rec of recordings) {
            speakerNames.push(rec.name);
            const fullBlob = new Blob(rec.blobs, { type: 'audio/webm' });

            try {
                const json = await this.transcribeWithSegments(fullBlob);

                // Estrategia 1: Formato 'segments' (Whisper original / openai)
                if (json.segments) {
                    json.segments.forEach(seg => {
                        segments.push({
                            speaker: rec.name,
                            startMs: seg.start * 1000,
                            endMs: seg.end * 1000,
                            text: seg.text.trim()
                        });
                    });
                }
                // Estrategia 2: Formato 'transcription' (whisper.cpp -oj)
                else if (json.transcription) {
                    json.transcription.forEach(item => {
                        // Offsets puede no venir, usamos timestamps
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

        // 3. Ordenar y guardar
        if (segments.length > 0) {
            segments.sort((a, b) => a.startMs - b.startMs);

            const lastSeg = segments[segments.length - 1];
            const durationMs = lastSeg ? lastSeg.endMs : 0;

            const combinedText = segments
                .map(s => `[${this.formatTime(s.startMs)}] ${s.speaker}: ${s.text}`)
                .join('\n');

            await this.recorder.recordDiarization({
                combinedText,
                startTime: Date.now() - durationMs, // Estimado
                durationMs,
                speakers: speakerNames
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

    private async transcribeWithSegments(blob: Blob): Promise<WhisperJson> {
        const formData = new FormData();
        formData.append('audio', blob);

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
}
