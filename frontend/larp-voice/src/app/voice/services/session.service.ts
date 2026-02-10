import { Injectable, signal, computed } from '@angular/core';
import Peer, { DataConnection } from 'peerjs';

export interface PeerInfo {
    id: string;
    name: string; // Nombre amigable (ej. "Móvil 1")
    conn?: DataConnection;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable({ providedIn: 'root' })
export class SessionService {
    private peer: Peer | null = null;
    private connections: Map<string, DataConnection> = new Map();

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

    // --- Privados ---

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
        this.isHost.set(false);
    }

    private setupHostListeners() {
        if (!this.peer) return;

        this.peer.on('connection', (conn) => {
            console.log('[Session] Nueva conexión entrante:', conn.peer);

            conn.on('open', () => {
                // Añadir a lista de participantes
                const name = conn.metadata?.name || 'Anónimo';
                this.connections.set(conn.peer, conn);

                this.updateParticipantsList();
                this.setupDataListeners(conn);

                // Enviar saludo / estado inicial si fuera necesario
                conn.send({ type: 'welcome', message: 'Conectado a la sesión' });
            });

            conn.on('close', () => {
                console.log('[Session] Conexión cerrada:', conn.peer);
                this.connections.delete(conn.peer);
                this.updateParticipantsList();
            });

            conn.on('error', (err) => {
                console.error('[Session] Error en conexión:', err);
                this.connections.delete(conn.peer);
                this.updateParticipantsList();
            });
        });
    }

    private setupDataListeners(conn: DataConnection) {
        conn.on('data', (data: any) => {
            console.log('[Session] Dato recibido:', data);
            // Aquí manejaremos el audio más adelante
        });
    }

    private updateParticipantsList() {
        const list: PeerInfo[] = [];
        this.connections.forEach((conn, id) => {
            list.push({
                id,
                name: conn.metadata?.name || 'Participante',
                conn
            });
        });
        this.participants.set(list);
    }
}
