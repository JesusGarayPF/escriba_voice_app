import { Injectable, inject } from '@angular/core';
import { HISTORY_STORE } from '../contracts/history-store.token';
import { HistoryItemModel } from '../models/history-item.model';

@Injectable({ providedIn: 'root' })
export class HistoryRecorderService {
  private store = inject(HISTORY_STORE);

  /**
   * Guarda un resultado STT en el historial.
   * @returns El ID del item guardado, o null si falló.
   */
  async recordStt(params: {
    audioBlob: Blob;
    transcribedText: string;
    recordingStartedAt: number;
  }): Promise<string | null> {
    // Validación: no guardar si el texto está vacío
    if (!params.transcribedText.trim()) return null;
    // Validación: no guardar si el blob está vacío
    if (!params.audioBlob || params.audioBlob.size === 0) return null;

    try {
      const id = crypto.randomUUID();
      const now = Date.now();
      const item: HistoryItemModel = {
        id,
        category: 'stt',
        createdAt: params.recordingStartedAt,
        name: '',
        durationMs: Math.max(0, now - params.recordingStartedAt),
        sizeBytes: params.audioBlob.size,
        outputText: params.transcribedText,
        audioId: id,
        mimeType: params.audioBlob.type || 'audio/webm',
      };
      await this.store.upsertItem(item);
      await this.store.putAudio(id, params.audioBlob, item.mimeType);
      return id;
    } catch (e) {
      console.error('[HistoryRecorderService] Error guardando STT:', e);
      return null;
    }
  }

  /**
   * Guarda un resultado TTS en el historial.
   * @returns El ID del item guardado, o null si falló.
   */
  async recordTts(params: {
    inputText: string;
    audioBlob: Blob;
  }): Promise<string | null> {
    // Validación: no guardar si el texto está vacío
    if (!params.inputText.trim()) return null;
    // Validación: no guardar si el blob está vacío
    if (!params.audioBlob || params.audioBlob.size === 0) return null;

    try {
      const id = crypto.randomUUID();
      const item: HistoryItemModel = {
        id,
        category: 'tts',
        createdAt: Date.now(),
        name: '',
        durationMs: null,
        sizeBytes: params.audioBlob.size,
        inputText: params.inputText,
        audioId: id,
        mimeType: params.audioBlob.type || 'audio/wav',
      };
      await this.store.upsertItem(item);
      await this.store.putAudio(id, params.audioBlob, item.mimeType);
      return id;
    } catch (e) {
      console.error('[HistoryRecorderService] Error guardando TTS:', e);
      return null;
    }
  }

  /**
   * Guarda un resultado de diarización (conversación) en el historial.
   */
  /**
   * Guarda un resultado de diarización (conversación) en el historial.
   */
  async recordDiarization(params: {
    combinedText: string;
    startTime: number;
    durationMs: number;
    speakers: string[]; // Lista de nombres de participantes
    audioBlobs?: Map<string, Blob>; // Mapa Nombre -> Blob
  }): Promise<string | null> {
    if (!params.combinedText.trim()) return null;

    try {
      const id = crypto.randomUUID();
      const participantAudioIds: Record<string, string> = {};

      // Guardar audios individuales si existen
      if (params.audioBlobs) {
        for (const [speaker, blob] of params.audioBlobs.entries()) {
          const audioId = crypto.randomUUID();
          await this.store.putAudio(audioId, blob, blob.type || 'audio/webm');
          participantAudioIds[speaker] = audioId;
        }
      }

      const item: HistoryItemModel = {
        id,
        category: 'diarization',
        createdAt: params.startTime,
        name: `Conversación (${params.speakers.length} personas)`, // Nombre sugerido
        durationMs: params.durationMs,
        sizeBytes: 0, // Tamaño recalculable o suma
        outputText: params.combinedText,
        // audioId: null, // Sin audio combinado único
        mimeType: 'text/plain',
        participantAudioIds: Object.keys(participantAudioIds).length > 0 ? participantAudioIds : undefined
      };

      await this.store.upsertItem(item);
      return id;
    } catch (e) {
      console.error('[HistoryRecorderService] Error guardando Diarización:', e);
      return null;
    }
  }
  async getAudio(id: string): Promise<{ blob: Blob; mimeType: string } | null> {
    try {
      const blob = await this.store.getAudio(id);
      if (!blob) return null;
      return { blob, mimeType: blob.type };
    } catch (e) {
      console.error('[HistoryRecorderService] Error recuperando audio:', e);
      return null;
    }
  }
}
