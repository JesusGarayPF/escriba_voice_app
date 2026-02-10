import { Component, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TopNavBarComponent } from '../../components/layout/topNavBar/top-nav-bar.component';
import { RightDrawerComponent } from '../../components/layout/rightDrawer/right-drawer.component';
import { ProfilePanelComponent } from '../../components/layout/panels/profile/profile.component';
import { SettingsPanelComponent } from '../../components/layout/panels/settings/settings.component';

type DrawerMode = 'none' | 'profile' | 'settings';

const ACTIONS = [
  {
    id: 'stt',
    title: 'Voz a texto',
    desc: 'Graba y transcribe al instante.',
    icon: 'mic',
    enabled: true,
  },
  {
    id: 'tts',
    title: 'Texto a voz',
    desc: 'Convierte texto en audio.',
    icon: 'speaker',
    enabled: true,
  },
  {
    id: 'conversation',
    title: 'Conversación',
    desc: 'Detectar quién habla (host/participante).',
    icon: 'chat',
    enabled: true,
  },
  {
    id: 'summarize',
    title: 'Resumir',
    desc: 'Resumen rápido o detallado.',
    icon: 'spark',
    enabled: false,
  },
  {
    id: 'history',
    title: 'Historial',
    desc: 'Sesiones, audios y notas.',
    icon: 'clock',
    enabled: true,
  },
] as const;

type ActionId = (typeof ACTIONS)[number]['id'];

const ROUTE_BY_ACTION: Partial<Record<ActionId, string>> = {
  stt: '/stt',
  tts: '/tts',
  history: '/history',
  conversation: '/conversation',
};

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    TopNavBarComponent,
    RightDrawerComponent,
    ProfilePanelComponent,
    SettingsPanelComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage implements OnDestroy {
  mode: DrawerMode = 'none';
  actions = ACTIONS;

  constructor(
    private router: Router,
    private r2: Renderer2
  ) { }

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

  // --- Navigation ---
  go(actionId: ActionId) {
    const route = ROUTE_BY_ACTION[actionId];
    if (!route) return; // acciones "próximamente" o sin ruta

    // Cierra drawer (por si estuviera abierto) y navega
    this.mode = 'none';
    this.syncScrollLock();

    void this.router.navigateByUrl(route);
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
