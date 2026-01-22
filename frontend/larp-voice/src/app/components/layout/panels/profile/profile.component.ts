import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-profile-panel',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfilePanelComponent {
  @Output() signOut = new EventEmitter<void>();
}
