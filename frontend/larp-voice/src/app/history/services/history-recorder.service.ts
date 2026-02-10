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
}
