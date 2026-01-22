# ESCRIBA — Asistente de Voz para Rol en Vivo (STT + TTS Offline)

**Escriba** es un asistente de voz **offline** para partidas de rol en vivo.  
Está pensado para controlar NPCs y narrativa mediante voz, sin depender de servicios en la nube.

Permite:

- 🎙 **Transcripción de voz → texto** (Whisper.cpp)
- 🔊 **Síntesis de texto → voz** (Piper)
- 🧠 **Lógica narrativa** para NPCs controlados por IA
- 📴 Funcionamiento **completamente offline**

---

## 📁 Estructura del Proyecto

Escriba/
├─ backend/ # Node + TypeScript (Express)
├─ frontend/
│ └─ larp-voice/ # Angular (zoneless)
│
├─ bin/
│ ├─ whisper/ # Binarios de Whisper.cpp (main.exe, DLLs, etc.)
│ └─ piper/ # Binarios de Piper (piper.exe, DLLs, etc.)
│
├─ models/
│ └─ whisper/ # Modelos STT (ggml-base.bin, small.bin, gguf, etc.)
│
├─ piper-voices/
│ ├─ es/ # Voces españolas (ONNX + JSON)
│ └─ en/ # Voces inglesas (ONNX + JSON)
│
├─ uploads/ # Audios temporales usados por el backend
├─ test.wav # Archivo de prueba
├─ .gitignore
└─ README.md

yaml
Copiar código

> ⚠️ Las carpetas `models/`, `piper-voices/`, `bin/`, `uploads/` **no se versionan en Git**  
> Deben obtenerse mediante descarga manual o almacenamiento en la nube local.

---

## 🎙 Speech-to-Text (Whisper.cpp)

### ✔ Requisitos

- Binarios de Whisper.cpp en:
Escriba/bin/whisper/

css
Copiar código
(incluyendo `main.exe` y las DLL necesarias)

- Un modelo Whisper en:
Escriba/models/whisper/

r
Copiar código

Ejemplos:
- `ggml-base.bin`
- `ggml-small.bin`
- versiones `.gguf`

---

### ▶ Ejemplo de Ejecución

```powershell
.\bin\whisper\main.exe `
-m .\models\whisper\ggml-base.bin `
-f .\test16.wav `
-l es `
-otxt `
-of salida
Este comando:

Transcribe test16.wav

Usa el modelo Whisper indicado

Fuerza idioma español

Genera un archivo de texto como salida

yaml
Copiar código

---

### Recomendación final (muy importante)
Añade justo después (cuando quieras) una sección tipo:

```md
## ⚙ Instalación rápida

1. Clonar el repositorio
2. Instalar dependencias del frontend (`npm install`)
3. Instalar dependencias del backend
4. Descargar modelos Whisper y voces Piper
5. Colocar binarios de Whisper y Piper en `bin/`