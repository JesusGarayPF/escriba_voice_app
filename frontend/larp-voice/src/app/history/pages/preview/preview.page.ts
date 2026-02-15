import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { TopNavBarComponent } from '../../../components/layout/topNavBar/top-nav-bar.component';
import { RightDrawerComponent } from '../../../components/layout/rightDrawer/right-drawer.component';
import { ProfilePanelComponent } from '../../../components/layout/panels/profile/profile.component';
import { SettingsPanelComponent } from '../../../components/layout/panels/settings/settings.component';
import { ShareModalComponent } from '../../../components/shared/shareModal/share-modal.component';

import { HISTORY_STORE } from '../../contracts/history-store.token';
import { HistoryItemModel } from '../../models/history-item.model';
import { HistoryDownloadService } from '../../services/history-download.service';

type DrawerMode = 'none' | 'profile' | 'settings';

@Component({
    selector: 'app-preview-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TopNavBarComponent,
        RightDrawerComponent,
        ProfilePanelComponent,
        SettingsPanelComponent,
        ShareModalComponent,
    ],
    templateUrl: './preview.page.html',
    styleUrl: './preview.page.css',
})
export class PreviewPage implements OnInit, OnDestroy {
    private store = inject(HISTORY_STORE);
    private cdr = inject(ChangeDetectorRef);
    private downloadService = inject(HistoryDownloadService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private r2 = inject(Renderer2);

    mode: DrawerMode = 'none';
    item: HistoryItemModel | null = null;
    loading = true;
    errorMsg = '';

    // Editable text
    editableText = '';
    isSaving = false;
    saveMsg = '';

    // Audio
    audioUrl: string | null = null;

    // Share modal
    shareModalOpen = false;
    shareModalTitle = '';
    shareModalText = '';

    get drawerOpen() { return this.mode !== 'none'; }
    get drawerTitle() { return this.mode === 'profile' ? 'Perfil' : 'Configuración'; }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            void this.loadItem(id);
        } else {
            this.loading = false;
            this.errorMsg = 'ID no proporcionado';
        }
    }

    ngOnDestroy(): void {
        if (this.audioUrl) {
            URL.revokeObjectURL(this.audioUrl);
        }
        this.unlockScroll();
    }

    private async loadItem(id: string): Promise<void> {
        this.loading = true;
        this.cdr.detectChanges();

        try {
            // Search across all categories to find the item
            const categories = ['stt', 'tts', 'diarization', 'summaries'] as const;
            let found: HistoryItemModel | null = null;

            for (const cat of categories) {
                const items = await this.store.list({ category: cat, limit: 1000, offset: 0 });
                const match = items.find(i => i.id === id);
                if (match) {
                    found = match;
                    break;
                }
            }

            this.item = found;

            if (!this.item) {
                this.errorMsg = 'Registro no encontrado';
            } else {
                this.editableText = this.item.outputText || this.item.inputText || '';

                // Cargar audio si existe
                if (this.item.audioId || this.item.category === 'diarization') {
                    this.audioUrl = await this.downloadService.getAudioUrl(this.item);
                }
            }
        } catch (e) {
            this.errorMsg = e instanceof Error ? e.message : 'Error cargando item';
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    async saveText(): Promise<void> {
        if (!this.item || this.isSaving) return;

        this.isSaving = true;
        this.saveMsg = '';
        this.cdr.detectChanges();

        try {
            const updated: HistoryItemModel = {
                ...this.item,
                outputText: this.editableText,
            };
            await this.store.upsertItem(updated);
            this.item = updated;
            this.saveMsg = '✓ Guardado';
            setTimeout(() => { this.saveMsg = ''; this.cdr.detectChanges(); }, 2000);
        } catch (e) {
            this.saveMsg = 'Error al guardar';
        } finally {
            this.isSaving = false;
            this.cdr.detectChanges();
        }
    }

    async downloadText(): Promise<void> {
        if (!this.item) return;
        // Descargar el texto editado actual
        const content = this.editableText;
        if (content) {
            const blob = new Blob([content], { type: 'text/plain' });
            this.downloadService.downloadBlob(blob, `${this.item.name || 'preview'}.txt`);
        }
    }

    async downloadAudio(): Promise<void> {
        if (!this.item) return;
        await this.downloadService.downloadAudio(this.item);
    }

    async shareItem(): Promise<void> {
        if (!this.item) return;
        const result = await this.downloadService.share(this.item);
        if (result === 'unsupported') {
            this.shareModalTitle = this.item.name || 'Escriba';
            this.shareModalText = this.editableText;
            this.shareModalOpen = true;
            this.cdr.detectChanges();
        }
    }

    onShareAction() {
        this.shareModalOpen = false;
        this.cdr.detectChanges();
    }

    get displayName(): string {
        if (!this.item) return '';
        const name = (this.item.name ?? '').trim();
        if (name) return name;
        const src = (this.item.outputText ?? this.item.inputText ?? '').trim();
        if (src) return src.slice(0, 40) + (src.length > 40 ? '…' : '');
        return 'Sin título';
    }

    get hasAudio(): boolean {
        return !!this.audioUrl;
    }

    back() {
        this.router.navigate(['/history']);
    }

    // --- Drawer ---
    openProfile() { this.mode = this.mode === 'profile' ? 'none' : 'profile'; this.syncScrollLock(); }
    openSettings() { this.mode = this.mode === 'settings' ? 'none' : 'settings'; this.syncScrollLock(); }
    closeDrawer() { this.mode = 'none'; this.syncScrollLock(); }

    private syncScrollLock() {
        if (this.drawerOpen) this.lockScroll();
        else this.unlockScroll();
    }
    private lockScroll() { this.r2.setStyle(document.body, 'overflow', 'hidden'); }
    private unlockScroll() { this.r2.removeStyle(document.body, 'overflow'); }
}
