import { Component, OnDestroy, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VOICE_ENGINE } from '../../contracts/voice-engine.token';
import { VoiceEngine } from '../../contracts/voice-engine';
import { SessionStateService } from '../../../shared/storage/session-state.service';


@Component({
  selector: 'app-stt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stt.component.html',
  styleUrls: ['./stt.component.css'],
})
export class SttComponent implements OnDestroy {
  isRecording = false;

  transcribedText = '';
  sttStatus = '';
  sttError = '';

  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor(
    @Inject(VOICE_ENGINE) private engine: VoiceEngine,
    private cdr: ChangeDetectorRef,
    private session: SessionStateService
  ) {
    this.transcribedText = this.session.getString('stt.lastText', '');
  }

  async startRecording(): Promise<void> {
    this.clearSttUi();
    if (this.isRecording) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recorder = new MediaRecorder(this.stream);
      this.chunks = [];

      this.recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
      };

      this.recorder.onstop = async () => {
        const blob = new Blob(this.chunks, {
          type: this.recorder?.mimeType || 'audio/webm',
        });

        await this.runStt(blob);
        this.cleanupStream();
      };

      this.recorder.start();
      this.isRecording = true;
      this.sttStatus = 'Grabando...';
      this.cdr.detectChanges();
    } catch (e) {
      console.error(e);
      this.sttError = 'No se pudo acceder al micrófono.';
      this.cdr.detectChanges();
    }
  }

  stopRecording(): void {
    if (!this.recorder || !this.isRecording) return;
    this.isRecording = false;
    this.sttStatus = 'Procesando...';
    this.cdr.detectChanges();
    this.recorder.stop();
  }

  private async runStt(blob: Blob): Promise<void> {
    this.sttError = '';
    this.sttStatus = 'Transcribiendo...';
    this.transcribedText = '';
    this.cdr.detectChanges();

    try {
      const result = await this.engine.stt(blob);
      const text = (result?.text ?? '').trim();

      this.transcribedText = text || '(vacío)';
      this.session.setString('stt.lastText', this.transcribedText); // ✅ AQUÍ
      this.sttStatus = '';
      this.cdr.detectChanges();
    } catch (e) {
      console.error(e);
      this.sttError = 'Error al transcribir audio.';
      this.sttStatus = '';
      this.cdr.detectChanges();
    }
  }

  private clearSttUi(): void {
    this.transcribedText = '';
    this.sttStatus = '';
    this.sttError = '';
    this.cdr.detectChanges();
  }

  private cleanupStream(): void {
    if (!this.stream) return;
    for (const t of this.stream.getTracks()) t.stop();
    this.stream = null;
    this.recorder = null;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.cleanupStream();
  }
}
