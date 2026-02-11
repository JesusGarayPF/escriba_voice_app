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
  async recordDiarization(params: {
    combinedText: string;
    startTime: number;
    durationMs: number;
    speakers: string[]; // Lista de nombres de participantes
  }): Promise<string | null> {
    if (!params.combinedText.trim()) return null;

    try {
      const id = crypto.randomUUID();
      const item: HistoryItemModel = {
        id,
        category: 'diarization',
        createdAt: params.startTime,
        name: `Conversación (${params.speakers.length} personas)`, // Nombre sugerido
        durationMs: params.durationMs,
        sizeBytes: 0, // Por ahora no guardamos el audio combinado (costoso de generar en frontend)
        outputText: params.combinedText,
        // audioId: null, // Sin audio combinado por ahora
        mimeType: 'text/plain',
      };

      // TODO: En el futuro, podríamos generar un ZIP con los audios o mezclarlos
      // Por ahora, solo guardamos el texto transcrito.

      await this.store.upsertItem(item);
      return id;
    } catch (e) {
      console.error('[HistoryRecorderService] Error guardando Diarización:', e);
      return null;
    }
  }
}
