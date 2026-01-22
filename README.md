# ESCRIBA — Asistente de Voz para Rol en Vivo (STT + TTS Offline)

**Escriba** es un asistente de voz offline para partidas de rol en vivo.  
Permite:

- 🎙 Transcripción de voz → texto (Whisper.cpp)
- 🔊 Síntesis de texto → voz (Piper)
- 🧠 Lógica narrativa para NPCs controlados por IA
- 📴 Funciona completamente **offline**

---

## 📁 Estructura del Proyecto

Escriba/
backend/ # Node + TypeScript (Express)
frontend/
larp-voice/ # Angular (zoneless)

bin/
whisper/ # Binarios de Whisper.cpp (main.exe, dlls, etc.)
piper/ # Binarios de Piper (piper.exe, dlls, etc.)

models/
whisper/ # Modelos STT (ggml-base.bin, small.bin, gguf, etc.)

piper-voices/
es/ # Voces españolas (onnx + json)
en/ # Voces inglesas (onnx + json)

uploads/ # Audios temporales usados por el backend
test.wav # Archivo de prueba


---

## 🎙 Speech-to-Text (Whisper.cpp)

### ✔ Requisitos
- `main.exe` + DLLs dentro de `Escriba/bin/whisper/`
- Un modelo Whisper en `Escriba/models/whisper/`  
  Ejemplos:  
  - `ggml-base.bin`
  - `ggml-small.bin`
  - (o versiones `.gguf`)

---

### ▶ Ejemplo de Ejecución

```powershell
.\bin\whisper\main.exe `
  -m .\models\whisper\ggml-base.bin `
  -f .\test16.wav `
  -l es `
  -otxt `
  -of salida
