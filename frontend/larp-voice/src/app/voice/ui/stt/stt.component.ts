import { Component, OnDestroy, ChangeDetectorRef, Inject, Renderer2, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TopNavBarComponent } from '../../../components/layout/topNavBar/top-nav-bar.component';
import { RightDrawerComponent } from '../../../components/layout/rightDrawer/right-drawer.component';
import { ProfilePanelComponent } from '../../../components/layout/panels/profile/profile.component';
import { SettingsPanelComponent } from '../../../components/layout/panels/settings/settings.component';

import { VOICE_ENGINE } from '../../contracts/voice-engine.token';
import { VoiceEngine } from '../../contracts/voice-engine';
import { SessionStateService } from '../../../shared/storage/session-state.service';
import { HistoryRecorderService } from '../../../history/services/history-recorder.service';

type DrawerMode = 'none' | 'profile' | 'settings';

@Component({
  selector: 'app-stt',
  standalone: true,
  imports: [
    CommonModule,
    TopNavBarComponent,
    RightDrawerComponent,
    ProfilePanelComponent,
    SettingsPanelComponent,
  ],
  templateUrl: './stt.component.html',
  styleUrls: ['./stt.component.css'],
})
export class SttComponent implements OnDestroy {
  private historyRecorder = inject(HistoryRecorderService);
  private recordingStartedAt = 0;

  // Drawer
  mode: DrawerMode = 'none';

  // STT state
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
    private session: SessionStateService,
    private router: Router,
    private r2: Renderer2
  ) {
    this.transcribedText = this.session.getString('stt.lastText', '');
  }

  // --- Topbar actions (drawer) ---
  openProfile() {
    this.mode = this.mode === 'profile' ? 'none' : 'profile';
    this.syncScrollLock();
  }

  openSettings() {
    this.mode = this.mode === 'settings' ? 'none' : 'settings';
    this.syncScrollLock();
  }

  closeDrawer() {
    this.mode = 'none';
    this.syncScrollLock();
  }

  get drawerOpen() {
    return this.mode !== 'none';
  }

  get drawerTitle() {
    return this.mode === 'profile'
      ? 'Perfil'
      : this.mode === 'settings'
        ? 'Configuración'
        : '';
  }

  // --- Page navigation ---
  back() {
    this.router.navigateByUrl('/');
  }

  async startRecording(): Promise<void> {
    this.clearSttUi();
    if (this.isRecording) return;
    this.recordingStartedAt = Date.now();

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
      this.session.setString('stt.lastText', this.transcribedText);
      this.sttStatus = '';
      this.cdr.detectChanges();

      // Guardar en historial (solo si hay texto real)
      if (text) {
        void this.historyRecorder.recordStt({
          audioBlob: blob,
          transcribedText: text,
          recordingStartedAt: this.recordingStartedAt,
        });
      }
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
    this.unlockScroll();
  }

  // --- Scroll lock helpers ---
  private syncScrollLock() {
    if (this.drawerOpen) this.lockScroll();
    else this.unlockScroll();
  }

  private lockScroll() {
    this.r2.setStyle(document.body, 'overflow', 'hidden');
  }

  private unlockScroll() {
    this.r2.removeStyle(document.body, 'overflow');
  }
}
