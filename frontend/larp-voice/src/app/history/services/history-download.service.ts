import { Injectable, inject } from '@angular/core';
import { HISTORY_STORE } from '../contracts/history-store.token';
import { HistoryItemModel } from '../models/history-item.model';

@Injectable({ providedIn: 'root' })
export class HistoryDownloadService {
    private store = inject(HISTORY_STORE);

    /**
     * Descarga el contenido de un item del historial.
     * @returns true si tuvo éxito, false si no había contenido o falló.
     */
    async download(item: HistoryItemModel): Promise<boolean> {
        try {
            const audioId = item.audioId ?? item.id;
            const blob = await this.store.getAudio(audioId);

            if (blob && blob.size > 0) {
                const ext = this.getExtension(item.mimeType);
                const baseName = item.name?.trim() || this.getTextPreview(item) || 'audio';
                const filename = this.sanitizeFilename(baseName) + '.' + ext;
                this.triggerDownload(blob, filename);
                return true;
            }

            const text = item.outputText ?? item.inputText;
            if (text && text.trim()) {
                const baseName = item.name?.trim() || text.slice(0, 30) || 'texto';
                const filename = this.sanitizeFilename(baseName) + '.txt';
                this.triggerDownload(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename);
                return true;
            }

            return false;
        } catch (e) {
            console.error('[HistoryDownloadService] Error descargando:', e);
            return false;
        }
    }

    /**
     * Comparte el contenido usando Web Share API o fallback a clipboard.
     * @returns 'shared' | 'copied' | 'nothing'
     */
    async share(item: HistoryItemModel): Promise<'shared' | 'copied' | 'nothing'> {
        try {
            const audioId = item.audioId ?? item.id;
            const blob = await this.store.getAudio(audioId);
            const text = item.outputText ?? item.inputText ?? '';
            const title = item.name?.trim() || this.getTextPreview(item) || 'Escriba';

            // Intentar Web Share API (solo si está disponible)
            if (typeof navigator.share === 'function') {
                const shareData: ShareData = { title };

                // Solo añadir archivo si canShare lo confirma
                if (blob && blob.size > 0) {
                    const ext = this.getExtension(item.mimeType);
                    const file = new File([blob], `audio.${ext}`, { type: blob.type || 'audio/webm' });

                    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
                        shareData.files = [file];
                    }
                }

                if (text.trim()) {
                    shareData.text = text;
                }

                // Solo compartir si hay algo que compartir
                if (shareData.files?.length || shareData.text) {
                    await navigator.share(shareData);
                    return 'shared';
                }
            }

            // Fallback: copiar texto al portapapeles
            if (text.trim() && typeof navigator.clipboard?.writeText === 'function') {
                await navigator.clipboard.writeText(text);
                return 'copied';
            }

            return 'nothing';
        } catch (e) {
            // Usuario canceló (AbortError) - no es un error real
            if (e instanceof Error && e.name === 'AbortError') {
                return 'nothing';
            }
            console.error('[HistoryDownloadService] Error compartiendo:', e);
            return 'nothing';
        }
    }

    private getTextPreview(item: HistoryItemModel): string {
        const src = (item.outputText ?? item.inputText ?? '').trim();
        return src.slice(0, 30);
    }

    private getExtension(mimeType?: string): string {
        if (!mimeType) return 'webm';
        if (mimeType.includes('wav')) return 'wav';
        if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
        if (mimeType.includes('ogg')) return 'ogg';
        if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
        return 'webm';
    }

    private sanitizeFilename(name: string): string {
        // Elimina caracteres prohibidos en Windows/Mac/Linux
        return name
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 50) || 'archivo';
    }

    private triggerDownload(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Pequeño delay para asegurar que el navegador procese la descarga
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
