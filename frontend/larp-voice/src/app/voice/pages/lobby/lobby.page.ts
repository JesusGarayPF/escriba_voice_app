import { Component, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { AudioCaptureService } from '../../services/audio-capture.service';
import { DiarizationService } from '../../services/diarization.service';
import { TopNavBarComponent } from '../../../components/layout/topNavBar/top-nav-bar.component';
import { RightDrawerComponent } from '../../../components/layout/rightDrawer/right-drawer.component';
import { ProfilePanelComponent } from '../../../components/layout/panels/profile/profile.component';
import { SettingsPanelComponent } from '../../../components/layout/panels/settings/settings.component';

type DrawerMode = 'none' | 'profile' | 'settings';

@Component({
    selector: 'app-lobby-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TopNavBarComponent,
        RightDrawerComponent,
        ProfilePanelComponent,
        SettingsPanelComponent
    ],
    templateUrl: './lobby.page.html',
    styleUrl: './lobby.page.css',
})
export class LobbyPage implements OnDestroy {
    session = inject(SessionService);
    audio = inject(AudioCaptureService);
    diarization = inject(DiarizationService);
    private router = inject(Router);

    @ViewChild('joinInput') joinInput?: ElementRef<HTMLInputElement>;

    // Estado local para UI
    mode: DrawerMode = 'none';
    joinCode = '';
    myNick = 'Refugio';
    isJoining = false;
    isProcessing = false;
    showSuccessModal = false;
    transcriptionPrompt = ''; // Contexto para Whisper

    get drawerOpen() { return this.mode !== 'none'; }
    get drawerTitle() { return this.mode === 'profile' ? 'Perfil' : 'Configuración'; }

    constructor() {
        // Nombre random por defecto
        this.myNick = 'User-' + Math.floor(Math.random() * 1000);
    }

    ngOnDestroy(): void {
        // Al salir del lobby, desconectar? 
        // Depende del UX deseado. Por ahora, desconectamos al salir para evitar leaks.
        this.session.disconnect();
    }

    async createSession() {
        try {
            await this.session.createSession();
        } catch (e) {
            alert('Error creando sesión: ' + e);
        }
    }

    async joinSession() {
        if (!this.joinCode || this.joinCode.length !== 6) return;
        this.isJoining = true;
        try {
            await this.session.joinSession(this.joinCode, this.myNick);
        } catch (e) {
            alert('Error uniéndose: ' + e);
        } finally {
            this.isJoining = false;
        }
    }

    async copyCode() {
        const code = this.session.sessionId();
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            // TODO: Feedback visual sutil (toast/tooltip)
            console.log('Código copiado');
        } catch (e) {
            console.error('Error copiando:', e);
        }
    }

    async pasteCode() {
        console.log('Intento de pegar código...');
        this.joinInput?.nativeElement.focus();
        await this.readClipboardIntoCode();
    }

    /** Auto-paste al hacer focus en el input si está vacío */
    async onCodeInputFocus() {
        if (this.joinCode.length === 0) {
            await this.readClipboardIntoCode();
        }
    }

    private async readClipboardIntoCode() {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                const cleaned = text.trim().substring(0, 6).toUpperCase();
                if (cleaned.length === 6) {
                    this.joinCode = cleaned;
                }
            }
        } catch (e) {
            console.warn('Permiso de portapapeles denegado o error:', e);
        }
    }

    async toggleRecording() {
        if (!this.session.isHost()) return;

        if (this.audio.isRecording()) {
            this.session.stopRecordingForAll();
        } else {
            await this.session.startRecordingForAll();
        }
    }

    async finishAndProcess() {
        if (!this.session.isHost() || this.audio.isRecording()) return;

        this.isProcessing = true;
        try {
            const success = await this.diarization.processSessionAndSave(this.transcriptionPrompt);
            if (success) {
                this.showSuccessModal = true;
            } else {
                alert('No se pudo procesar: no hay audio grabado.');
            }
        } catch (e) {
            console.error(e);
            alert('Error procesando sesión: ' + e);
        } finally {
            this.isProcessing = false;
        }
    }

    triggerFileUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                this.processFile(file);
            }
        };
        input.click();
    }

    async processFile(file: File) {
        this.isProcessing = true;
        try {
            console.log('Procesando archivo importado:', file.name);
            const success = await this.diarization.processFileAndSave(file, this.transcriptionPrompt);
            if (success) {
                this.showSuccessModal = true;
            } else {
                alert('No se pudo procesar el archivo.');
            }
        } catch (e) {
            console.error(e);
            alert('Error procesando archivo: ' + e);
        } finally {
            this.isProcessing = false;
        }
    }

    goToHistory() {
        this.router.navigate(['/history'], { queryParams: { tab: 'diarization' } });
    }

    leave() {
        this.session.disconnect();
        this.joinCode = '';
    }

    back() {
        this.router.navigateByUrl('/');
    }

    // --- Drawer ---
    openProfile() { this.mode = this.mode === 'profile' ? 'none' : 'profile'; }
    openSettings() { this.mode = this.mode === 'settings' ? 'none' : 'settings'; }
    closeDrawer() { this.mode = 'none'; }
}
