import { Component, OnDestroy, OnInit, Renderer2, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TopNavBarComponent } from '../../components/layout/topNavBar/top-nav-bar.component';
import { RightDrawerComponent } from '../../components/layout/rightDrawer/right-drawer.component';
import { ProfilePanelComponent } from '../../components/layout/panels/profile/profile.component';
import { SettingsPanelComponent } from '../../components/layout/panels/settings/settings.component';

import { type HistoryCategory } from '../contracts/history-category';
import { HISTORY_STORE } from '../contracts/history-store.token';
import { HistoryItemModel } from '../models/history-item.model';
import { ConfirmService } from '../../components/shared/confirmModal/confirm.service';
import { HistoryDownloadService } from '../services/history-download.service';

type DrawerMode = 'none' | 'profile' | 'settings';

const CATEGORY_LABEL: Record<HistoryCategory, string> = {
  stt: 'Voz a Texto',
  tts: 'Texto a Voz',
  diarization: 'Diarización',
  summaries: 'Resúmenes',
};


@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [
    CommonModule,
    TopNavBarComponent,
    RightDrawerComponent,
    ProfilePanelComponent,
    SettingsPanelComponent,
  ],
  templateUrl: './history.page.html',
  styleUrl: './history.page.css',
})
export class HistoryPage implements OnInit, OnDestroy {
  private store = inject(HISTORY_STORE);
  private cdr = inject(ChangeDetectorRef);
  private confirm = inject(ConfirmService);
  private downloadService = inject(HistoryDownloadService);

  mode: DrawerMode = 'none';

  categories: { id: HistoryCategory; label: string }[] = [
    { id: 'stt', label: CATEGORY_LABEL.stt },
    { id: 'tts', label: CATEGORY_LABEL.tts },
    { id: 'diarization', label: CATEGORY_LABEL.diarization },
    { id: 'summaries', label: CATEGORY_LABEL.summaries },
  ];

  selected: HistoryCategory = 'stt';

  // --- Datos de historial (para renderizar) ---
  items: HistoryItemModel[] = [];
  loading = false;
  errorMsg = '';

  // --- Edición inline del nombre ---
  editingId: string | null = null;
  draftName = '';

  constructor(
    private router: Router,
    private r2: Renderer2
  ) { }

  ngOnInit(): void {
    void this.refresh();
  }

  ngOnDestroy(): void {
    this.unlockScroll();
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

  // --- History category selection ---
  async select(cat: HistoryCategory) {
    this.selected = cat;
    this.cancelRename(); // evita quedar en modo edición al cambiar de pestaña
    await this.refresh();
    this.cdr.detectChanges();
  }

  get headerTitle(): string {
    return CATEGORY_LABEL[this.selected];
  }

  // --- Carga desde store ---
  async refresh(): Promise<void> {
    this.loading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    try {
      this.items = await this.store.list({
        category: this.selected,
        limit: 200,
        offset: 0,
      });

      // si lo preferís, aquí podrías ordenar por fecha desc
      // this.items = [...this.items].sort((a,b)=> (b.createdAt ?? 0) - (a.createdAt ?? 0));

    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : 'Error cargando historial';
      this.items = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // --- Helpers de display ---
  displayName(it: HistoryItemModel): string {
    const name = (it.name ?? '').trim();
    if (name) return name;

    const src = (it.outputText ?? it.inputText ?? '').trim();
    if (src) return src.slice(0, 30) + (src.length > 30 ? '…' : '');

    return 'Sin título';
  }

  startRename(it: HistoryItemModel) {
    this.editingId = it.id;
    const current = (it.name ?? '').trim();
    this.draftName = current || this.displayName(it).replace(/…$/, '');
    this.cdr.detectChanges();
  }

  cancelRename() {
    this.editingId = null;
    this.draftName = '';
    this.cdr.detectChanges();
  }

  async saveRename(it: HistoryItemModel): Promise<void> {
    if (this.loading) return;

    const next = this.draftName.trim();
    const updated: HistoryItemModel = { ...it, name: next || '' };

    this.loading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    try {
      await this.store.upsertItem(updated);
      this.cancelRename();
      await this.refresh();
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : 'Error renombrando';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  formatDuration(ms: number | null | undefined): string {
    if (ms == null) return '—';
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  formatBytes(n: number | null | undefined): string {
    if (n == null) return '—';
    const bytes = Math.max(0, n);
    const units = ['B', 'KB', 'MB', 'GB'];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  // --- Acciones por item ---
  async deleteOne(it: HistoryItemModel): Promise<void> {
    if (this.loading) return;

    const ok = await this.confirm.ask({
      title: 'Borrar item',
      text: `¿Borrar “${this.displayName(it)}”?`,
      confirmText: 'Borrar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!ok) return;

    this.loading = true;
    this.errorMsg = '';
    this.cdr.detectChanges();

    try {
      await this.store.delete(it.id);
      // si estábamos editando justo ese item, salimos del modo edición
      if (this.editingId === it.id) this.cancelRename();
      await this.refresh();
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : 'Error borrando item';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async download(it: HistoryItemModel): Promise<void> {
    const ok = await this.downloadService.download(it);
    if (!ok) {
      this.errorMsg = 'No hay contenido para descargar';
      this.cdr.detectChanges();
    }
  }

  async share(it: HistoryItemModel): Promise<void> {
    const result = await this.downloadService.share(it);
    if (result === 'copied') {
      // Feedback visual opcional
      console.log('Texto copiado al portapapeles');
    }
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
