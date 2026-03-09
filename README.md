# ESCRIBA — Asistente de Voz (Offline)

**Escriba** es una solución integral de herramientas de voz . A diferencia de otros asistentes, Escriba funciona de manera **100% offline**, garantizando privacidad, baja latencia y la posibilidad de usarse en entornos sin conexión a internet.

El sistema combina transcripción (STT), síntesis de voz natural (TTS) y una arquitectura modular pensada para ser rápidamente migrada a contenerdores móvil o de escritorio.

Este proyecto demuestra habilidades en:
- Integración de herramientas de IA de bajo nivel en aplicaciones web.
- Gestión de flujos de datos asíncronos y audio en tiempo real.
- Diseño de arquitecturas desacopladas y eficientes.
- Desarrollo frontend moderno con Angular Zoneless.

---

## Características Principales

-  **Transcripción Offline**: Motor basado en `Whisper.cpp` para convertir voz en texto con alta precisión.
-  **Síntesis de Voz Realista**: Integración con `Piper` para generar voces naturales en múltiples idiomas y personalidades.
-  **Privacidad Total**: No se envían datos a la nube; todo el procesamiento ocurre localmente.
-  **Alto Rendimiento**: Optimizado para funcionar en hardware estándar mediante modelos cuantizados.

---

##  Stack Tecnológico

- **Frontend**: Angular (v20, Zoneless)
- **Backend**: Node.js + Express + TypeScript
- **Procesamiento de Voz**: 
  - [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) (Speech-to-Text)
  - [Piper](https://github.com/rhasspy/piper) (Text-to-Speech)
- **Utilidades**: FFmpeg (conversión de audio)

---

## Galería de Imágenes

<img width="1916" height="937" alt="Escriba - Main" src="https://github.com/user-attachments/assets/c90ea2ff-12f8-4111-a71d-11e61ebd55ed" />
<img width="1918" height="941" alt="<img width="1918" height="942" alt="Escriba STT" src="https://github.com/user-attachments/assets/a94bcd11-877d-4047-ae70-de09e2d16f0c" />
<img width="1918" height="942" alt="Escriba STT" src="https://github.com/user-attachments/assets/79f4925e-b1b1-4a5d-97b2-c928d2e30876" />
<img width="1918" height="936" alt="Escriba - Diarización I" src="https://github.com/user-attachments/assets/a220edff-7422-486d-8882-be3e1906e714" />
<img width="1918" height="937" alt="Escriba - Diarización II" src="https://github.com/user-attachments/assets/690f03b5-4caf-48fa-96a5-f5dfb8bd87a5" />
<img width="1918" height="941" alt="Escriba - Diarización III" src="https://github.com/user-attachments/assets/d2d08ce9-ee95-4db9-9117-f9fa9be86fdc" />
<img width="1918" height="941" alt="Escriba - Guardado" src="https://github.com/user-attachments/assets/3ff7e469-8812-459a-8eab-07d07bde529d" />
<img width="1918" height="940" alt="Escriba - Historial" src="https://github.com/user-attachments/assets/e0c87ee1-284d-4617-8ede-5dcbfb135bf8" />
<img width="1898" height="938" alt="Escriba - Preview" src="https://github.com/user-attachments/assets/135ffca3-cef6-488b-ab0c-167bb90492a9" />

##  Estructura de Directorios

```text
Escriba/
├── backend/            # API en Express para gestión de audio y lógica
├── frontend/           # Interfaz de usuario en Angular
├── bin/                # [IGNORADO] Binarios de Whisper y Piper
├── models/             # [IGNORADO] Modelos de Whisper (GGML/GGUF)
├── piper-voices/       # [IGNORADO] Voces de Piper (ONNX + JSON)
├── uploads/            # Archivos temporales de audio
└── outputs/            # Archivos de audio generados
```

---

##  Guía de Instalación

Este proyecto requiere algunos componentes externos que no están incluidos en el repositorio debido a su tamaño o naturaleza binaria.

### 1. Requisitos Previos

- **Node.js** (v18+)
- **FFmpeg**: Necesario para la manipulación de archivos de audio.
  - *Windows*: `winget install Gyan.FFmpeg`
  - *Linux*: `sudo apt install ffmpeg`

### 2. Configuración de Binarios y Modelos (Archivos Ignorados)

Para que el proyecto funcione, debes descargar y colocar manualmente los siguientes archivos:

#### 🎙️ Whisper.cpp (STT)
1. Descarga los binarios de la sección de **Releases** de [Whisper.cpp](https://github.com/ggerganov/whisper.cpp/releases) (ej. `whisper-bin-x64.zip`).
2. Extrae el contenido en `Escriba/bin/whisper/`. Debe contener `main.exe` y sus DLLs.
3. Descarga un modelo (se recomienda `base` o `small`) desde [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp/tree/main).
4. Guarda los archivos `.bin` en `Escriba/models/whisper/`.

#### 🔊 Piper (TTS)
1. Descarga el ejecutable para Windows desde [Piper GitHub Releases](https://github.com/rhasspy/piper/releases) (ej. `piper_windows_amd64.zip`).
2. Extrae el contenido en `Escriba/bin/piper/`. Debe contener `piper.exe`.
3. Descarga las voces que desees (archivos `.onnx` y `.json`) desde el [repositorio de voces de Piper](https://huggingface.co/rhasspy/piper-voices/tree/main).
4. Organízalas en carpetas por idioma dentro de `Escriba/piper-voices/` (ej. `es/spanish-voice.onnx`).

### 3. Instalación de Dependencias

Ejecuta los siguientes comandos en terminales separadas:

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend/larp-voice
npm install
npm run start
```
