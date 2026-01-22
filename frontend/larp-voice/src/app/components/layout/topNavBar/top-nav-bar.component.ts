import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-top-nav-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-nav-bar.component.html',
  styleUrl: './top-nav-bar.component.css',
})
export class TopNavBarComponent {
  @Input() brandName = 'Escriba';
  @Input() subtitle?: string;

  @Output() profileClick = new EventEmitter<void>();
  @Output() settingsClick = new EventEmitter<void>();
}
