import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioCaptureService {
    private mediaRecorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;

    // Estado
    isRecording = signal<boolean>(false);
    error = signal<string | null>(null);

    // Callback para emitir chunks
    private onDataCallback: ((blob: Blob) => void) | null = null;

    constructor() { }

    async startRecording(onData: (blob: Blob) => void): Promise<void> {
        if (this.isRecording()) return;
        this.error.set(null);
        this.onDataCallback = onData;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Intentar usar opus/webm para mejor compresión
            const options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn('audio/webm;codecs=opus no soportado, usando default');
                this.mediaRecorder = new MediaRecorder(this.stream); // browser defaults
            } else {
                this.mediaRecorder = new MediaRecorder(this.stream, options);
            }

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.onDataCallback?.(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.cleanup();
            };

            // Enviar chunks cada 2 segundos
            this.mediaRecorder.start(2000);
            this.isRecording.set(true);

        } catch (e) {
            console.error('Error iniciando grabación:', e);
            this.error.set('No se pudo acceder al micrófono');
            this.cleanup();
            throw e;
        }
    }

    stopRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.isRecording.set(false);
    }

    private cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.onDataCallback = null;
    }
}
