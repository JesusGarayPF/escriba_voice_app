import {
  Component,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { VOICE_ENGINE } from '../../contracts/voice-engine.token';
import { VoiceEngine } from '../../contracts/voice-engine';

@Component({
  selector: 'app-tts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tts.component.html',
  styleUrls: ['./tts.component.css'],
})
export class TtsComponent implements OnDestroy {
  /** Texto a sintetizar (puede venir de STT o ser escrito a mano) */
  @Input() text = '';

  ttsStatus = '';
  ttsError = '';
  ttsAudioUrl: string | null = null;

  constructor(
    @Inject(VOICE_ENGINE) private engine: VoiceEngine,
    private cdr: ChangeDetectorRef
  ) {}

  async speakText(): Promise<void> {
    this.ttsError = '';
    this.ttsStatus = '';

    const value = this.text.trim();
    if (!value) {
      this.ttsError = 'Escribe algún texto primero.';
      this.cdr.detectChanges();
      return;
    }

    try {
      // limpiar audio previo
      if (this.ttsAudioUrl) {
        URL.revokeObjectURL(this.ttsAudioUrl);
        this.ttsAudioUrl = null;
      }

      this.ttsStatus = 'Generando audio...';
      this.cdr.detectChanges();

      const blob = await this.engine.tts(value);

      this.ttsAudioUrl = URL.createObjectURL(blob);
      this.ttsStatus = '';
      this.cdr.detectChanges();
    } catch (e) {
      console.error(e);
      this.ttsError = 'Error al generar el audio.';
      this.ttsStatus = '';
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    if (this.ttsAudioUrl) {
      URL.revokeObjectURL(this.ttsAudioUrl);
    }
  }
}
