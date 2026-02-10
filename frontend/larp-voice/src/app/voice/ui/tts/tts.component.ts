import {
  Component,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  Input,
  Renderer2,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-tts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TopNavBarComponent,
    RightDrawerComponent,
    ProfilePanelComponent,
    SettingsPanelComponent,
  ],
  templateUrl: './tts.component.html',
  styleUrls: ['./tts.component.css'],
})
export class TtsComponent implements OnDestroy, OnChanges {
  private historyRecorder = inject(HistoryRecorderService);

  // Drawer
  mode: DrawerMode = 'none';

  /** Texto a sintetizar (puede venir de STT o ser escrito a mano) */
  @Input() text = '';

  ttsStatus = '';
  ttsError = '';
  ttsAudioUrl: string | null = null;

  constructor(
    @Inject(VOICE_ENGINE) private engine: VoiceEngine,
    private cdr: ChangeDetectorRef,
    public session: SessionStateService,
    private router: Router,
    private r2: Renderer2
  ) {
    const saved = this.session.getString('tts.lastText', '');
    if (!this.text) this.text = saved;
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

      // Guardar en historial
      void this.historyRecorder.recordTts({
        inputText: value,
        audioBlob: blob,
      });
    } catch (e) {
      console.error(e);
      this.ttsError = 'Error al generar el audio.';
      this.ttsStatus = '';
      this.cdr.detectChanges();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text']) {
      const incoming = (changes['text'].currentValue ?? '').toString();
      if (incoming.trim()) this.session.setString('tts.lastText', incoming);
    }
  }

  ngOnDestroy(): void {
    if (this.ttsAudioUrl) URL.revokeObjectURL(this.ttsAudioUrl);
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
