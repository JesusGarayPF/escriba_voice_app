import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HistoryRecorderService } from './history-recorder.service';
import { HistoryItemModel } from '../models/history-item.model';
import { lastValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HistoryDownloadService {
    private http = inject(HttpClient);
    private recorder = inject(HistoryRecorderService);

    private readonly baseUrl = 'http://localhost:3000';

    async downloadMixedAudio(item: HistoryItemModel) {
        if (!item.participantAudioIds) {
            console.warn('Este item no tiene audios de participantes');
            return;
        }

        const audioIds = Object.values(item.participantAudioIds);
        if (audioIds.length === 0) return;

        try {
            // 1. Recuperar blobs de IndexedDB
            const blobs: Blob[] = [];
            for (const id of audioIds) {
                const audio = await this.recorder.getAudio(id);
                if (audio && audio.blob) {
                    blobs.push(audio.blob);
                }
            }

            if (blobs.length === 0) {
                alert('No se encontraron los archivos de audio originales en el dispositivo.');
                return;
            }

            // 2. Si solo hay uno, descargar directo
            if (blobs.length === 1) {
                this.downloadBlob(blobs[0], `audio_${item.name}.webm`);
                return;
            }

            // 3. Si hay varios, enviar a /mix
            const formData = new FormData();
            blobs.forEach((blob, index) => {
                formData.append('audio', blob, `track_${index}.webm`);
            });

            console.log(`Enviando ${blobs.length} pistas para mezclar...`);

            const response = await lastValueFrom(
                this.http.post(`${this.baseUrl}/mix`, formData, {
                    responseType: 'blob'
                })
            );

            // 4. Descargar resultado
            this.downloadBlob(response, `conversacion_${item.name}.mp3`);

        } catch (e) {
            console.error('Error descargando audio mezclado:', e);
            alert('Error generando la mezcla de audio.');
        }
    }

    async downloadAudio(item: HistoryItemModel): Promise<boolean> {
        if (item.category === 'diarization') {
            await this.downloadMixedAudio(item);
            return true;
        }
        if (item.audioId) {
            const audio = await this.recorder.getAudio(item.audioId);
            if (audio) {
                this.downloadBlob(audio.blob, `audio_${item.name}.${audio.mimeType.split('/')[1] || 'webm'}`);
                return true;
            }
        }
        return false;
    }

    async downloadText(item: HistoryItemModel): Promise<boolean> {
        const content = item.outputText || item.inputText;
        if (content) {
            const blob = new Blob([content], { type: 'text/plain' });
            this.downloadBlob(blob, `${item.name}.txt`);
            return true;
        }
        return false;
    }

    /**
     * Intenta compartir usando Web Share API.
     * Returns 'shared' si el navegador lo soporta y el usuario compartió,
     * 'unsupported' si no se soporta (caller debe mostrar modal fallback),
     * 'error' si no hay contenido.
     */
    async share(item: HistoryItemModel): Promise<'shared' | 'unsupported' | 'error'> {
        const text = item.outputText || item.inputText;
        if (!text) return 'error';

        // Intentar Web Share API nativa
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.name || 'Escriba',
                    text,
                });
                return 'shared';
            } catch (e: any) {
                // User cancelled share dialog
                if (e?.name === 'AbortError') return 'shared';
                // Share API failed, fallback
                return 'unsupported';
            }
        }

        // No soportada → caller muestra modal propio
        return 'unsupported';
    }

    /** Obtener el texto compartible de un item */
    getShareText(item: HistoryItemModel): string {
        return item.outputText || item.inputText || '';
    }

    /** Obtener audio blob URL para reproducción */
    async getAudioUrl(item: HistoryItemModel): Promise<string | null> {
        if (item.audioId) {
            const audio = await this.recorder.getAudio(item.audioId);
            if (audio) {
                return URL.createObjectURL(audio.blob);
            }
        }
        return null;
    }

    downloadBlob(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
