import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsPanelComponent {
  model = {
    language: 'es',
    autoScroll: true,
    autoPlayTTS: false,
  };
}
