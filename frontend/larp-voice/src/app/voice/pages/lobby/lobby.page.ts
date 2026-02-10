import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session.service';
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
    private router = inject(Router);

    // Estado local para UI
    mode: DrawerMode = 'none';
    joinCode = '';
    myNick = 'Invitado';
    isJoining = false;

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
