import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmHostComponent } from './components/shared/confirmModal/confirm-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('larp-voice');
}
