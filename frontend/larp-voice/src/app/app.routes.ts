import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { SttPage } from './pages/stt/stt.page';
import { TtsPage } from './pages/tts/tts.page';
import { HistoryPage } from './history/pages/history.page';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'stt', component: SttPage },
  { path: 'tts', component: TtsPage },
  { path: 'history', component: HistoryPage },
  { path: '**', redirectTo: '' },
];
