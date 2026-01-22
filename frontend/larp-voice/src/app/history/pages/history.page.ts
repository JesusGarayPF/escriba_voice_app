import { Component, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TopNavBarComponent } from '../../components/layout/topNavBar/top-nav-bar.component';
import { RightDrawerComponent } from '../../components/layout/rightDrawer/right-drawer.component';
import { ProfilePanelComponent } from '../../components/layout/panels/profile/profile.component';
import { SettingsPanelComponent } from '../../components/layout/panels/settings/settings.component';

type DrawerMode = 'none' | 'profile' | 'settings';
type HistoryCategory = 'stt' | 'tts' | 'diarization' | 'summaries';

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
export class HistoryPage implements OnDestroy {
  mode: DrawerMode = 'none';

  categories: { id: HistoryCategory; label: string }[] = [
    { id: 'stt', label: CATEGORY_LABEL.stt },
    { id: 'tts', label: CATEGORY_LABEL.tts },
    { id: 'diarization', label: CATEGORY_LABEL.diarization },
    { id: 'summaries', label: CATEGORY_LABEL.summaries },
  ];

  selected: HistoryCategory = 'stt';

  constructor(
    private router: Router,
    private r2: Renderer2
  ) {}

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
  select(cat: HistoryCategory) {
    this.selected = cat;
  }

  get headerTitle(): string {
    return CATEGORY_LABEL[this.selected];
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
