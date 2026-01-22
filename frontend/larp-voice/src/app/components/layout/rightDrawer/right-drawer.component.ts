import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-right-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './right-drawer.component.html',
  styleUrl: './right-drawer.component.css',
})
export class RightDrawerComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() width = '420px';

  @Output() close = new EventEmitter<void>();

  @ViewChild('panel') panel?: ElementRef<HTMLElement>;

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent) {
    if (!this.open) return;
    if (ev.key === 'Escape') this.close.emit();
  }

  onOverlayClick() {
    this.close.emit();
  }

  stop(ev: MouseEvent) {
    ev.stopPropagation();
  }
}
