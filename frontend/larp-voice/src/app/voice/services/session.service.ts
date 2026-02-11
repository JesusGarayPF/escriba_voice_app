import { Injectable, signal, computed, inject } from '@angular/core';
import Peer, { DataConnection } from 'peerjs';
import { AudioCaptureService } from './audio-capture.service';

export interface PeerInfo {
    id: string;
    name: string; // Nombre amigable (ej. "Móvil 1")
    conn?: DataConnection;
    audioChunks: Blob[]; // Buffer de audio recibido
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SessionMessage {
    type: 'welcome' | 'control' | 'audio';
    payload?: any;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
    private peer: Peer | null = null;
    private connections: Map<string, DataConnection> = new Map();
    // Mapa interno de info extra (nombre, audioChunks) por peerId
    private peersInfo: Map<string, { name: string; audioChunks: Blob[] }> = new Map();

    private audioCapture = inject(AudioCaptureService);

    // Signals para estado reactivo
    status = signal<ConnectionStatus>('disconnected');
    error = signal<string | null>(null);

    // ID de la sesión actual (código corto de 6 caracteres)
    sessionId = signal<string | null>(null);

    // Soy el host?
    isHost = signal<boolean>(false);

    // Lista de participantes conectados (excluyéndome a mí)
    participants = signal<PeerInfo[]>([]);

    // Mi propio ID completo de PeerJS
    myPeerId = signal<string | null>(null);

    constructor() { }

    /**
     * Inicializa una sesión como HOST.
     * Genera un ID corto y lo usa como sufijo del PeerID.
     */
    async createSession(): Promise<string> {
        this.cleanup();
        this.isHost.set(true);
        this.status.set('connecting');

        // Generar ID corto de 6 caracteres (mayúsculas)
        const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const fullId = `escriba-${shortId}`;

        return new Promise((resolve, reject) => {
            try {
                this.peer = new Peer(fullId);

                this.peer.on('open', (id) => {
                    console.log('[Session] Host creado:', id);
                    this.sessionId.set(shortId);
                    this.myPeerId.set(id);
                    this.status.set('connected');
                    this.setupHostListeners();
                    resolve(shortId);
                });

                this.peer.on('error', (err) => {
                    console.error('[Session] Error host:', err);
                    this.status.set('error');
                    this.error.set(err.type);
                    reject(err);
                });
            } catch (e) {
                this.status.set('error');
                reject(e);
            }
        });
    }

    /**
     * Se une a una sesión existente como PARTICIPANTE.
     */
    async joinSession(shortId: string, myName: string): Promise<void> {
        this.cleanup();
        this.isHost.set(false);
        this.status.set('connecting');

        // Validar formato
        if (!shortId || shortId.length !== 6) {
            this.error.set('Código de sesión inválido');
            this.status.set('error');
            return;
        }

        const hostPeerId = `escriba-${shortId.toUpperCase()}`;

        return new Promise((resolve, reject) => {
            // Como participante, dejo que PeerJS me asigne un ID aleatorio UUID
            this.peer = new Peer();

            this.peer.on('open', (myId) => {
                console.log('[Session] Peer abierto:', myId);
                this.myPeerId.set(myId);

                // Conectar al host
                const conn = this.peer!.connect(hostPeerId, {
                    metadata: { name: myName }
                });

                conn.on('open', () => {
                    console.log('[Session] Conectado al host');
                    this.status.set('connected');
                    this.sessionId.set(shortId.toUpperCase());

                    // Guardar conexión con host
                    this.connections.set(hostPeerId, conn);

                    // Configurar listeners de datos
                    this.setupDataListeners(conn);
                    resolve();
                });

                conn.on('error', (err) => {
                    console.error('[Session] Error conexión:', err);
                    this.status.set('error');
                    this.error.set('No se pudo conectar al host');
                    reject(err);
                });
            });

            this.peer.on('error', (err) => {
                console.error('[Session] Error peer:', err);
                this.status.set('error');
                this.error.set(err.type);
                reject(err);
            });
        });
    }

    disconnect() {
        this.cleanup();
    }

    // --- Control de Grabación (Host -> Todos) ---

    async startRecordingForAll() {
        if (!this.isHost()) return;

        console.log('[Session] Host inicia grabación global');

        // 1. Enviar señal a todos
        this.broadcast({ type: 'control', payload: { action: 'start' } });

        // 2. Iniciar mi propia grabación (como host)
        // El host también graba su audio localmente
        // Aquí podríamos decidir si el host guarda SU audio en el mismo pool que los participantes
        // Para simplificar: Sí, el Host se trata como un "participante local" a nivel de audio
        this.peersInfo.set('me', { name: 'Host (Yo)', audioChunks: [] });

        await this.startLocalRecording();
    }

    stopRecordingForAll() {
        if (!this.isHost()) return;

        console.log('[Session] Host detiene grabación global');

        // 1. Enviar señal a todos
        this.broadcast({ type: 'control', payload: { action: 'stop' } });

        // 2. Detener mi grabación
        this.audioCapture.stopRecording();

        // 3. Procesar o guardar todo (Fase futura de STT)
        console.log('[Session] Grabación finalizada. Chunks recolectados:', this.peersInfo);
    }

    // --- Acceso a Datos (Diarización) ---

    getAllRecordedBlobs(): { id: string; name: string; blobs: Blob[] }[] {
        const results: { id: string; name: string; blobs: Blob[] }[] = [];

        this.peersInfo.forEach((info, id) => {
            if (info.audioChunks.length > 0) {
                results.push({
                    id,
                    name: info.name,
                    blobs: [...info.audioChunks] // Copia
                });
            }
        });

        return results;
    }

    // --- Privados ---

    private async startLocalRecording() {
        try {
            await this.audioCapture.startRecording((blob) => {
                if (this.isHost()) {
                    // Host guarda su propio audio directamente
                    const myInfo = this.peersInfo.get('me');
                    if (myInfo) myInfo.audioChunks.push(blob);
                } else {
                    // Participante envía chunk al host
                    this.sendToHost({ type: 'audio', payload: blob });
                }
            });
        } catch (e) {
            console.error('[Session] Fallo al iniciar grabación local', e);
            this.error.set('No se pudo acceder al micrófono para grabar');
        }
    }

    private broadcast(msg: SessionMessage) {
        this.connections.forEach(conn => conn.send(msg));
    }

    private sendToHost(msg: SessionMessage) {
        // Si soy participante, tengo una conexión con el host (almacenada en connections, generalmente solo 1)
        // Pero en mi implementación actual, `connections` tiene al host con su ID real.
        // Un participante solo debería tener conexión con el HOST.
        this.connections.forEach(conn => conn.send(msg));
    }

    private cleanup() {
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.status.set('disconnected');
        this.error.set(null);
        this.sessionId.set(null);
        this.participants.set([]);
        this.peersInfo.clear();
        this.isHost.set(false);
        this.audioCapture.stopRecording();
    }

    private setupHostListeners() {
        if (!this.peer) return;

        this.peer.on('connection', (conn) => {
            console.log('[Session] Nueva conexión entrante:', conn.peer);

            conn.on('open', () => {
                // Añadir/Actualizar info
                const name = conn.metadata?.name || 'Anónimo';
                if (!this.peersInfo.has(conn.peer)) {
                    this.peersInfo.set(conn.peer, { name, audioChunks: [] });
                }

                this.connections.set(conn.peer, conn);

                this.updateParticipantsList();
                this.setupDataListeners(conn);

                // Enviar saludo
                conn.send({ type: 'welcome', payload: 'Conectado a la sesión' });
            });

            conn.on('close', () => {
                console.log('[Session] Conexión cerrada:', conn.peer);
                this.connections.delete(conn.peer);
                this.peersInfo.delete(conn.peer); // Eliminar info del participante
                this.updateParticipantsList();
            });

            conn.on('error', (err) => {
                console.error('[Session] Error en conexión:', err);
                this.connections.delete(conn.peer);
                this.peersInfo.delete(conn.peer); // Eliminar info del participante
                this.updateParticipantsList();
            });
        });
    }

    private setupDataListeners(conn: DataConnection) {
        conn.on('data', (data: any) => {
            // data es del tipo SessionMessage o Blob directo si peerjs lo maneja raw
            // Vamos a asumir estructura { type, payload }

            if (data?.type === 'control') {
                this.handleControlMessage(data.payload);
            } else if (data?.type === 'audio') {
                this.handleAudioMessage(conn.peer, data.payload);
            } else {
                console.log('[Session] Dato desconocido:', data);
            }
        });
    }

    private handleControlMessage(payload: any) {
        if (payload?.action === 'start') {
            console.log('[Session] Recibida orden START');
            void this.startLocalRecording();
        } else if (payload?.action === 'stop') {
            console.log('[Session] Recibida orden STOP');
            this.audioCapture.stopRecording();
        }
    }

    private handleAudioMessage(peerId: string, payload: any) {
        // payload debería ser un Blob o ArrayBuffer
        // PeerJS a veces convierte Blobs en ArrayBuffer al recibir
        let blob: Blob;
        if (payload instanceof Blob) {
            blob = payload;
        } else if (payload instanceof ArrayBuffer) {
            blob = new Blob([payload], { type: 'audio/webm;codecs=opus' }); // Asumimos formato
        } else if (payload && payload.constructor === Uint8Array) {
            blob = new Blob([payload as any], { type: 'audio/webm;codecs=opus' });
        } else {
            console.warn('[Session] Audio chunk inválido recibido de', peerId);
            return;
        }

        // Guardar en el buffer del peer correspondiente (Solo el Host hace esto)
        if (this.isHost()) {
            const info = this.peersInfo.get(peerId);
            if (info) {
                info.audioChunks.push(blob);
                console.log(`[Session] Recibido chunk de ${info.name} (${blob.size} bytes)`);
            }
        }
    }

    private updateParticipantsList() {
        const list: PeerInfo[] = [];
        this.connections.forEach((conn, id) => {
            const info = this.peersInfo.get(id);
            list.push({
                id,
                name: info?.name || 'Participante',
                conn,
                audioChunks: info?.audioChunks || []
            });
        });
        this.participants.set(list);
    }
}
