import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.css',
})
export class ConfirmModalComponent {
  @Input() open = false;

  @Input() title = 'Confirmar';
  @Input() text = '¿Estás seguro?';

  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';

  /** para estilos: "danger" en borrados, "primary" en confirmaciones normales */
  @Input() variant: 'primary' | 'danger' = 'primary';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onBackdropClick() {
    this.cancel.emit();
  }

  onCancel() {
    this.cancel.emit();
  }

  onConfirm() {
    this.confirm.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.open) this.cancel.emit();
  }
}
