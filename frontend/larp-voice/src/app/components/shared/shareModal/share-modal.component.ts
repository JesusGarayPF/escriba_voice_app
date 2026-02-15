import { CommonModule } from '@angular/common';
import {
    Component,
    EventEmitter,
    HostListener,
    Input,
    Output,
} from '@angular/core';

export type ShareAction = 'copy' | 'email' | 'dismiss';

@Component({
    selector: 'app-share-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './share-modal.component.html',
    styleUrl: './share-modal.component.css',
})
export class ShareModalComponent {
    @Input() open = false;
    @Input() title = 'Compartir';
    @Input() text = '';

    @Output() action = new EventEmitter<ShareAction>();

    copied = false;

    onBackdropClick() {
        this.action.emit('dismiss');
    }

    async onCopy() {
        try {
            await navigator.clipboard.writeText(this.text);
            this.copied = true;
            setTimeout(() => {
                this.copied = false;
                this.action.emit('copy');
            }, 1200);
        } catch {
            this.action.emit('copy');
        }
    }

    onEmail() {
        const subject = encodeURIComponent(this.title);
        const body = encodeURIComponent(this.text);
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        this.action.emit('email');
    }

    onWhatsApp() {
        const encoded = encodeURIComponent(this.text);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
        this.action.emit('dismiss');
    }

    onTelegram() {
        const encoded = encodeURIComponent(this.text);
        window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
        this.action.emit('dismiss');
    }

    @HostListener('document:keydown.escape')
    onEsc() {
        if (this.open) this.action.emit('dismiss');
    }
}
