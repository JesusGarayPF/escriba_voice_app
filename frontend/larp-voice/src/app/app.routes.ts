import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { SttComponent } from './voice/ui/stt/stt.component';
import { TtsComponent } from './voice/ui/tts/tts.component';
import { HistoryPage } from './history/pages/history.page';
import { LobbyPage } from './voice/pages/lobby/lobby.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'stt', component: SttComponent },
  { path: 'tts', component: TtsComponent },
  { path: 'history', component: HistoryPage },
  { path: 'conversation', component: LobbyPage },
  { path: '**', redirectTo: '' },
];
