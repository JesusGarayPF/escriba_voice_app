import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TopNavBarComponent } from '../../components/layout/topNavBar/top-nav-bar.component';
import { RightDrawerComponent } from '../../components/layout/rightDrawer/right-drawer.component';
import { ProfilePanelComponent } from '../../components/layout/panels/profile/profile.component';
import { SettingsPanelComponent } from '../../components/layout/panels/settings/settings.component';

import { SttComponent } from '../../voice/ui/stt/stt.component';

type DrawerMode = 'none' | 'profile' | 'settings';

@Component({
  selector: 'app-stt-page',
  standalone: true,
  imports: [
    CommonModule,
    TopNavBarComponent,
    RightDrawerComponent,
    ProfilePanelComponent,
    SettingsPanelComponent,
    SttComponent,
  ],
  templateUrl: './stt.page.html',
  styleUrl: './stt.page.css',
})
export class SttPage {
  mode: DrawerMode = 'none';

  constructor(private router: Router) {}

  back() {
    this.router.navigateByUrl('/');
  }

  openProfile() {
    this.mode = this.mode === 'profile' ? 'none' : 'profile';
  }

  openSettings() {
    this.mode = this.mode === 'settings' ? 'none' : 'settings';
  }

  closeDrawer() {
    this.mode = 'none';
  }

  get drawerOpen() {
    return this.mode !== 'none';
  }

  get drawerTitle() {
    return this.mode === 'profile' ? 'Perfil' : this.mode === 'settings' ? 'Configuración' : '';
  }
}
