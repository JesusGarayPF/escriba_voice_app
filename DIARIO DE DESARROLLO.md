**DIARIO DE DESARROLLO --- Proyecto ESCRIBA**

**Día 17/11/2025**

**1) Resumen ejecutivo**

-   Se levantó el pipeline offline completo: STT con whisper.cpp y TTS con Piper, ambos ejecutables localmente.
-   Se fijó una estructura de carpetas clara separando bin/whisper, bin/piper, modelos y voces.
-   Se detectó y resolvió el requisito de audio para STT (WAV 16kHz, mono, PCM 16-bit) con conversión vía ffmpeg.
-   Se resolvió un fallo crítico de Piper con rutas Unicode en Windows moviendo el proyecto a C:\Escriba\.
-   Se validó el flujo "audio → texto → voz" (Whisper genera .txt, Piper genera .wav) desde consola.
-   Se definió arquitectura general: Angular zoneless (sin SSR/SSG) + backend Node/TypeScript ejecutando binarios por child_process.spawn.

**2) Decisiones y razonamiento (énfasis fuerte)**

-   **Decisión:** Mantener el proyecto **100% offline** (sin APIs externas).

-   **Motivo:** Evitar costes, dependencia de red y latencia; objetivo explícito del proyecto (LARP offline).
-   **Alternativas consideradas:** STT/TTS en la nube (descartado por coste y dependencia).
-   **Consecuencias:** Necesidad de gestionar binarios, modelos, rutas y formatos localmente; debugging más "sistema" que "web".

-   **Decisión:** Frontend en **Angular zoneless** y **sin SSR/SSG**.

-   **Motivo:** App orientada a uso local/offline; SSR/SSG no aporta. Zoneless reduce overhead de detección de cambios con audio/timers y encaja con la dirección de Angular (Signals).
-   **Alternativas consideradas:** SSR/SSG (descartado por innecesario), mantener zones (posible pero menos eficiente).
-   **Consecuencias:** Hay que cuidar cuándo se refresca UI en operaciones async (posibles implicaciones futuras con render/estado).

-   **Decisión:** Backend **Node + TypeScript** para orquestar Whisper/Piper.

-   **Motivo:** Stack homogéneo con Angular; facilidad para spawn de binarios; evita introducir Python.
-   **Alternativas consideradas:** Backend Python (descartado por heterogeneidad).
-   **Consecuencias:** El backend se convierte en "puente" estable entre UI y binarios; las rutas /stt y /tts serán el contrato.

-   **Decisión:** Separar binarios en bin/whisper y bin/piper.

-   **Motivo:** Evitar mezcla de DLLs/ejecutables y confusión; simplificar rutas en el backend.
-   **Alternativas consideradas:** Todo en bin/ raíz (descartado por ruido y ambigüedad).
-   **Consecuencias:** Rutas explícitas y estables para spawn.

-   **Decisión:** Mover el proyecto a C:\Escriba\ para evitar Unicode en rutas.

-   **Motivo:** Piper fallaba al procesar archivos cuando la ruta incluía tilde en el usuario de Windows (C:\Users\Jesús...).
-   **Alternativas consideradas:** Mantener ruta y "escapar" (no resuelto), usar rutas cortas 8.3 (no se adoptó).
-   **Consecuencias:** Convención práctica: **evitar rutas con caracteres no ASCII** en Windows para binarios.

-   **Decisión:** Exigir/forzar formato WAV compatible para STT.

-   **Motivo:** Whisper devolvía failed to read audio data as wav cuando el audio no era PCM/16k/mono.
-   **Alternativas consideradas:** Confiar en el formato original (descartado por errores).
-   **Consecuencias:** Paso obligatorio de conversión con ffmpeg antes de transcribir.

**3) Cambios de arquitectura / estructura del proyecto**

-   Estructura acordada y aplicada:

-   Escriba/backend/
-   Escriba/frontend/
-   Escriba/bin/whisper/ (whisper.cpp + DLLs)
-   Escriba/bin/piper/ (piper + DLLs)
-   Escriba/models/whisper/ (modelo ggml-base.bin)
-   Escriba/piper-voices/ (voces por idioma)
-   Escriba/uploads/ (temporales del backend)

-   Convenciones fijadas:

-   Ejecutables se llaman por ruta explícita desde backend.
-   Evitar rutas con tildes/Unicode.
-   STT siempre trabaja sobre WAV normalizado (16k/mono/pcm_s16le).

**4) Cambios funcionales (features)**

-   **Añadidas:**

-   Ejecución manual STT con whisper.cpp generando .txt.
-   Ejecución manual TTS con Piper generando .wav.
-   Flujo completo: salida.txt → Piper → salida_voz.wav.

-   **Modificadas:**

-   Ajuste de rutas a voces reales (según estructura del repo piper-voices/.../es_ES/carlfm/x_low/...).

-   **Eliminadas:**

-   Ninguna.

**5) Problemas y cómo se resolvieron (con causas)**

-   **Síntoma:** Whisper no generaba .txt / no parecía "hacer nada".

-   **Causa raíz:** faltaban DLLs / comando multilínea en PowerShell se rompía / formato WAV no compatible.
-   **Solución aplicada:** copiar todo el ZIP de whisper a bin/whisper; normalizar audio con ffmpeg; usar comando correcto con -otxt -of.
-   **Verificación:** aparece salida.txt en la ruta esperada.

-   **Síntoma:** whisper-cli.exe -h no mostraba nada / no funcionaba.

-   **Causa raíz:** build/ejecutable no funcional en ese paquete (no se confirmó más allá del síntoma).
-   **Solución aplicada:** se trabajó con main.exe para validar el pipeline.
-   **Verificación:** main.exe transcribe correctamente con modelo .bin y WAV normalizado.

-   **Síntoma:** Whisper error failed to read audio data as wav.

-   **Causa raíz:** WAV no cumplía 16kHz mono PCM 16-bit.
-   **Solución aplicada:** convertir con ffmpeg:

-   ffmpeg -y -i test.wav -ar 16000 -ac 1 -c:a pcm_s16le test16.wav

-   **Verificación:** Whisper procesa test16.wav sin error.

-   **Síntoma:** Piper falla al procesar texto/archivos cuando la ruta incluye tilde (usuario Windows).

-   **Causa raíz:** incompatibilidad de Piper con rutas Unicode en Windows.
-   **Solución aplicada:** mover proyecto a C:\Escriba\.
-   **Verificación:** el mismo comando de Piper funciona inmediatamente tras mover.

-   **Síntoma:** En PowerShell el operador < falla (RedirectionNotSupported).

-   **Causa raíz:** PowerShell reserva < (a diferencia de cmd).
-   **Solución aplicada:** usar piping (Get-Content ... | piper) o cambiar a cmd; finalmente se usó una variante funcional y se evitó Unicode en rutas.
-   **Verificación:** se genera salida_voz.wav.

**6) Tareas realizadas (checklist)**

-   Instalar Git LFS y clonar repositorio de voces de Piper (rhasspy/piper-voices).
-   Organizar bin/ separando whisper/ y piper/.
-   Descargar/ubicar modelo Whisper ggml-base.bin en models/whisper/.
-   Probar STT con whisper.cpp desde consola.
-   Probar TTS con Piper desde consola.
-   Normalizar audio con ffmpeg para Whisper.
-   Resolver fallo de rutas Unicode moviendo el proyecto a C:\Escriba\.
-   Crear/actualizar README.md y .gitignore (se generaron archivos descargables en el chat).

**7) Estado del proyecto al final del día**

-   **Qué funciona**

-   Whisper transcribe localmente cuando el audio está normalizado (16k/mono/PCM).
-   Piper genera audio localmente con voces instaladas.
-   Flujo manual completo: audio → texto → voz.

-   **Qué falta**

-   Backend Express con endpoints /stt y /tts funcionando de forma integrada.
-   Interfaz Angular conectada al backend (grabación, envío, reproducción).

-   **Bloqueos / riesgos**

-   Inestabilidad/ambigüedad sobre whisper-cli.exe (pendiente de verificar build correcta vs uso de main.exe).
-   Dependencia de ffmpeg en PATH (pendiente de asegurar en todos los entornos).
-   Restricción de rutas ASCII en Windows para Piper (regla práctica a mantener).

-   **Próximo paso recomendado (máximo 3 bullets)**

-   Implementar backend Express /stt (multer + ffmpeg + whisper spawn) y /tts (piper spawn).
-   Crear UI Angular mínima (grabar/stop + textarea + reproducir) consumiendo esos endpoints.
-   Añadir logging y manejo de errores para diagnosticar rutas, formatos y tiempos.

* * * * *

**Día 12/12/2025**

**1) Resumen ejecutivo**

-   Se integró backend Node/TS con Express y routers /stt y /tts.
-   Se corrigieron problemas de ESM/CommonJS en TypeScript ajustando tsconfig en lugar de reestructurar todo.
-   Se añadió ruta raíz / para evitar Cannot GET / y comprobar estado del backend desde navegador.
-   Se depuró el flujo UI↔backend: TTS llegó a funcionar estable; STT dio 500 hasta corregir el binario/flujo y el formato.
-   Se implementó una UI Angular mínima (VoicePanel) con grabación y TTS, y se depuraron fallos de inyección/importación en componentes.

**2) Decisiones y razonamiento (énfasis fuerte)**

-   **Decisión:** Adaptar el tsconfig.json actual (en vez de rehacer configuración desde cero).

-   **Motivo:** Minimizar cambios, mantener el proyecto alineado con module: nodenext y resolver imports rotos.
-   **Alternativas consideradas:** Cambiar todo a CommonJS o rehacer el scaffolding (descartado por coste/cambio grande).
-   **Consecuencias:** Los imports pasan a funcionar en el backend sin reestructuración.

-   **Decisión:** Añadir un handler GET / en Express.

-   **Motivo:** El navegador devolvía Cannot GET / y logs con GET / 404; hacía falta una "health check" simple.
-   **Alternativas consideradas:** Dejar sólo API sin root (posible, pero peor DX).
-   **Consecuencias:** Diagnóstico rápido de "backend vivo" desde navegador.

-   **Decisión:** Construir el componente UI directamente orientado a producción (home + componente funcional) en vez de "componente de prueba".

-   **Motivo:** Preferencia explícita: iterar por componentes y que cambie el ensamblaje en páginas, no duplicar esfuerzos.
-   **Alternativas consideradas:** Componente de test aislado (rechazado por redundancia).
-   **Consecuencias:** La home actúa como "pantalla principal" con el VoicePanel.

-   **Decisión:** En STT usar conversión a WAV 16k mono PCM antes de Whisper.

-   **Motivo:** MediaRecorder suele producir webm, y Whisper requiere WAV; era la causa más frecuente de 500.
-   **Alternativas consideradas:** Subir WAV directamente desde el frontend (menos realista para navegador).
-   **Consecuencias:** El backend asume responsabilidad de normalizar audio.

-   **Decisión:** Mantener TTS devolviendo audio/wav como blob y en UI generar ObjectURL para <audio controls>.

-   **Motivo:** Permite reproducción y descarga nativa desde el reproductor del navegador.
-   **Alternativas consideradas:** Base64 o servir archivos estáticos (más fricción).
-   **Consecuencias:** El reproductor aparece cuando ttsAudioUrl se setea correctamente y Angular re-renderiza.

**3) Cambios de arquitectura / estructura del proyecto**

-   Confirmado/ajustado:

-   Backend Express con server.ts/app.ts y routers stt.ts, tts.ts.
-   uploads/ como carpeta temporal utilizada por ambos endpoints.

-   Convenciones reforzadas:

-   STT: multer → ffmpeg → whisper → leer txt → limpiar temporales.
-   TTS: piper por stdin → wav → devolver binario → limpiar temporal.

**4) Cambios funcionales (features)**

-   **Añadidas:**

-   Endpoint POST /tts que devuelve audio/wav (blob).
-   Endpoint POST /stt que acepta multipart/form-data con audio.
-   UI Angular básica: grabar/detener y enviar audio; textarea para TTS y botón de reproducir.

-   **Modificadas:**

-   Logs en backend para depurar rutas, args y tiempos (se pidió explícitamente y se implementó en los archivos).
-   Ajustes en UI para no bloquear el estado "generando" hasta el final de playback (se cambió para liberar el status al recibir el blob).

-   **Eliminadas:**

-   Autoplay del audio (se pidió dejar de sonar automáticamente y que el usuario pulse play).

**5) Problemas y cómo se resolvieron (con causas)**

-   **Síntoma:** Imports rotos en backend (ECMAScript imports... CommonJS file).

-   **Causa raíz:** Config TS/Node (ESM vs CJS) inconsistente.
-   **Solución aplicada:** Ajustar tsconfig existente (manteniendo nodenext) para que el editor/compilador no marque error.
-   **Verificación:** Backend compila/arranca y responde en http://localhost:3000.

-   **Síntoma:** Cannot GET / y logs GET / 404.

-   **Causa raíz:** No existía handler GET /.
-   **Solución aplicada:** app.get('/', ...) devolviendo mensaje de estado.
-   **Verificación:** Navegador muestra "backend funcionando...".

-   **Síntoma:** PowerShell curl -X falla y Invoke-RestMethod -Form no existe.

-   **Causa raíz:** En PowerShell, curl suele ser alias de Invoke-WebRequest y no acepta sintaxis curl; -Form depende de versión.
-   **Solución aplicada:** Usar cmd para curl real o comandos compatibles con PowerShell (no se consolidó un único comando final aquí).
-   **Verificación:** Se continuó con pruebas desde cmd / navegador + Angular.

-   **Síntoma:** Angular fallos de build (Cannot find module ... voice-api.service, problemas de DI, imports de componente).

-   **Causa raíz:** Rutas incorrectas del service, componente no standalone o mal importado, y token de inyección inexistente al fallar el import.
-   **Solución aplicada:** Crear/ubicar correctamente el service y declarar componentes como standalone, importarlos en la page.
-   **Verificación:** El componente se renderiza en la app.

-   **Síntoma:** /tts "connection refused" en Angular.

-   **Causa raíz:** Backend caído (servidor no escuchando).
-   **Solución aplicada:** Levantar backend; error desaparece y TTS funciona.
-   **Verificación:** POST /tts 200 ... en logs.

-   **Síntoma:** /stt devuelve 500 desde UI.

-   **Causa raíz:** El backend estaba llamando a un binario o flujo incorrecto (cambio a main.exe vs whisper-cli.exe) y/o formato de audio; al volver a whisper-cli.exe se observó transcripción correcta.
-   **Solución aplicada:** Volver a whisper-cli.exe y mantener conversión a WAV 16k; logs confirmaron salida y guardado de txt.
-   **Verificación:** POST /stt 200 ... y transcripción en respuesta.

-   **Síntoma:** TTS tarda muchísimo (caso extremo de ~10 minutos para ~1.5 párrafos).

-   **Causa raíz:** No quedó confirmada en el chat (pendiente de verificar: CPU saturada, texto largo, throttling, bloqueo UI, o piper colgado en ciertos inputs).
-   **Solución aplicada:** Se añadieron logs y se revisó comportamiento; en otras pruebas piper mostró RTF muy bajo (rápido) y respuesta 200 en ~2--3s.
-   **Verificación:** Inconsistente; requiere medir en condiciones controladas (pendiente).

-   **Síntoma:** No aparece <audio> en DOM aunque el audio suena.

-   **Causa raíz:** La reproducción se estaba haciendo con new Audio(url) (no ligado al <audio> del template). Si ttsAudioUrl no se setea o no re-renderiza, el <audio> no aparece.
-   **Solución aplicada:** Asegurar que ttsAudioUrl se asigna y que la UI reacciona; se añadió impresión de ttsAudioUrl en pantalla para confirmar.
-   **Verificación:** Finalmente aparece el reproductor con controles y opción de descargar.

-   **Síntoma:** Tras desactivar autoplay, el reproductor deja de aparecer y "Generando..." queda infinito.

-   **Causa raíz:** Probable bloqueo por estado UI no reseteado (falta finally) o promesa no resuelta (request pendiente). Se propuso robustecer con timeout/logs/finally.
-   **Solución aplicada:** Añadir timeout y asegurar ttsStatus = '' en finally (fuente propuesta).
-   **Verificación:** Pendiente de confirmar en tu entorno tras aplicar cambios.

**6) Tareas realizadas (checklist)**

-   Ajustar tsconfig para compatibilidad de imports ESM/Node.
-   Levantar Express en localhost:3000 con GET / de diagnóstico.
-   Implementar POST /tts (piper) devolviendo audio/wav.
-   Implementar POST /stt (multer + ffmpeg + whisper) devolviendo { text }.
-   Integrar Angular con VoiceApiService y VoicePanelComponent.
-   Depurar fallos de backend caído (connection refused) y errores 500 de STT.
-   Confirmar aparición del reproductor <audio controls> y descarga.
-   Añadir logging detallado en backend para STT/TTS (rutas, args, stdout/stderr, códigos de salida).

**7) Estado del proyecto al final del día**

-   **Qué funciona**

-   Backend responde en GET /.
-   POST /tts funciona y devuelve WAV reproducible; logs indican piper salió con código 0 y HTTP 200.
-   POST /stt funciona cuando se usa whisper-cli.exe y WAV 16k; logs muestran transcripción.
-   UI Angular renderiza el componente y puede llamar a backend.

-   **Qué falta**

-   Consolidar UX final de TTS: sin autoplay, pero con reproductor siempre visible tras generar.
-   Confirmar y estabilizar tiempos (caso de lentitud extrema) y añadir medidas/limitaciones (p. ej., cortar texto largo, chunking, streaming si se quiere).
-   Mejorar manejo de errores (mostrar detalle de backend, no sólo "Error interno...").

-   **Bloqueos / riesgos**

-   Rendimiento TTS inconsistente (pendiente de verificar causa real).
-   Zoneless puede requerir cuidado extra si algún estado no dispara render (pendiente de verificar si hace falta ChangeDetectorRef en el componente).
-   Diferencias entre main.exe y whisper-cli.exe: contradicción histórica; **fuente de verdad actual**: whisper-cli.exe es el que estás usando con éxito en backend y consola.

-   **Próximo paso recomendado (máximo 3 bullets)**

-   Estabilizar UX TTS: generar blob, mostrar <audio controls>, y que el botón "Reproducir" sólo prepare el audio (sin new Audio()).
-   Añadir métricas simples: timestamps en backend + tamaño de texto para correlacionar con tiempos.
-   Endurecer STT: validar input, asegurar conversión ffmpeg siempre, y devolver errores explícitos si falta ffmpeg/model/bin.

* * * * *

**Contradicciones detectadas y "fuente de verdad" recomendada**

-   Contradicción: se indicó cambiar a main.exe pese a que está marcado como deprecado y en tu caso el flujo fiable terminó siendo whisper-cli.exe.

-   **Fuente de verdad recomendada:** mantener whisper-cli.exe para backend (lo has validado con logs y output), y dejar main.exe sólo como fallback si alguna build de whisper-cli falla.

-   Contradicción aparente en rendimiento TTS: se observan respuestas POST /tts 200 en ~2--3s, pero también un caso de ~10 minutos.

-   **Fuente de verdad recomendada:** confiar en logs del backend (tiempo real por request) y reproducir el caso lento con el mismo texto y bajo misma carga para aislar causa (pendiente).

**Día 24/12/2025**

**1) Resumen ejecutivo**

-   Se diseñó la UI base: **Home** como "launcher" con topbar y lista vertical de acciones; se descartó "Transcribir" como botón separado (se integrará en conversación/diarización más adelante).
-   Se introdujo un **drawer lateral derecho** (perfil/configuración) accionado desde la topbar, con componentes separados para ProfilePanel y SettingsPanel.
-   Se mantuvo la funcionalidad existente de STT/TTS mientras se refactorizaba la navegación; luego se decidió migrar de "vistas internas" a **páginas con routing**.
-   Se dividió el componente VoicePanel en **dos componentes**: SttComponent y TtsComponent, y se actualizó Home para mostrar cada uno.
-   Se resolvieron varios errores de Angular (CommonModule/ngIf, drawer no abriendo, configuración zoneless/Zone.js).

**2) Decisiones y razonamiento (énfasis fuerte)**

-   **Decisión:** Home como página principal con topbar + lista de acciones (icono + texto), y drawers laterales para perfil/config.

-   **Motivo:** UX clara y escalable; topbar reutilizable; drawers como componentes independientes por valor reutilizable.
-   **Alternativas consideradas:** grid de botones ("app-action-grid"), botones circulares sin texto, componentes extra para la rejilla.
-   **Consecuencias:** Home queda como "launcher" y el patrón de navegación se estandariza; se simplifica el crecimiento de herramientas futuras.

-   **Decisión:** Separar STT y TTS en componentes distintos (SttComponent, TtsComponent).

-   **Motivo:** Responsabilidades claras, menos acoplamiento, facilita navegación por herramienta y futura persistencia/estado independiente.
-   **Alternativas consideradas:** mantener VoicePanelComponent unificado.
-   **Consecuencias:** Se elimina/retira el componente unificado una vez verificado que los nuevos funcionan.

-   **Decisión:** Migrar de "vistas internas rápidas" a **rutas/páginas** por acción.

-   **Motivo:** Preparar el proyecto para crecimiento (carga selectiva, separación por feature), UX más estándar, y evitar Home como contenedor de demasiada lógica.
-   **Alternativas consideradas:** mantener el sistema de vistas por velocidad.
-   **Consecuencias:** Se introducen/ajustan rutas y se detectan problemas de arranque (zoneless) al ver que la URL no cambiaba.

-   **Decisión:** Mantener el proyecto **zoneless** (sin Zone.js) y corregir el bootstrap/config para que sea coherente.

-   **Motivo:** El proyecto fue creado zoneless; mezclar providers en main.ts vs app.config.ts rompía el arranque.
-   **Alternativas consideradas:** añadir Zone.js (no deseado).
-   **Consecuencias:** La configuración pasa a centralizarse en app.config.ts y main.ts a usar esa config.

-   **Decisión (arquitectura futura):** Diseñar una capa "desacoplable" para motores (voice) pensando en wrapper futuro y offline.

-   **Motivo:** Evitar refactors masivos si se cambia el modo de ejecución (HTTP local, IPC, etc.); mantener web local rápida para iterar.
-   **Alternativas consideradas:** envolver en wrapper desde el inicio.
-   **Consecuencias:** Se inicia refactor hacia "engine/adapters" y se planifica persistencia en dos niveles (navegación vs equipo).

**3) Cambios de arquitectura / estructura del proyecto**

-   Se consolidó una estructura de UI con:

-   components/layout/topNavBar
-   components/layout/rightDrawer
-   components/layout/panels/profile y .../settings
-   pages/home y (posteriormente) páginas separadas por herramienta.

-   Se adoptó como convención visual una paleta **blanco--negro + amarillo crema** como color de marca (CSS).
-   Se decidió (a nivel de intención) agrupar "voice" por dominio en una carpeta propia (feature-first), con separación interna por contracts/adapters/ui (pendiente de completar en el repo).

**4) Cambios funcionales (features)**

-   **Añadidas:**

-   Drawer derecho desplegable desde topbar con panel de perfil y panel de configuración.
-   Home "launcher" con acciones (STT, TTS, conversación, resumir, historial) con estado "próximamente".
-   Separación de STT/TTS en componentes independientes.

-   **Modificadas:**

-   Navegación: de vista incrustada ("voice view") a navegación por rutas (se inició la transición).
-   TTS: se añadió soporte para @Input text para precargar desde transcripción (alineación HTML/TS).

-   **Eliminadas:**

-   Componente unificado VoicePanelComponent (se planteó eliminarlo tras verificar que STT/TTS separados funcionan).

**5) Problemas y cómo se resolvieron (con causas)**

-   **Problema:** NG0303: Can't bind to 'ngIf'...

-   **Síntoma:** *ngIf no reconocido en plantilla.
-   **Causa raíz:** faltaba CommonModule (o NgIf) en imports del componente standalone.
-   **Solución aplicada:** incluir CommonModule en @Component.imports.
-   **Verificación:** desaparece el error en navegador.

-   **Problema:** Click en iconos (perfil/config) detectado pero drawer no abría.

-   **Síntoma:** logs mostraban cambios de mode y drawerOpen=true, sin UI.
-   **Causa raíz:** no quedó totalmente determinada; se observó que "sin aplicar sugerencias nuevas" empezó a funcionar (posible incoherencia temporal de estado/plantilla/imports o conflicto con cambios previos).
-   **Solución aplicada:** revertir/ajustar cambios hasta recuperar comportamiento funcional.
-   **Verificación:** drawer abre al click.

-   **Problema:** Compilación fallida con Property 'view' does not exist... y app-stt/app-tts not known.

-   **Síntoma:** plantilla referenciaba propiedades y componentes no presentes.
-   **Causa raíz:** desalineación entre home.page.html y home.page.ts / imports (probable archivo equivocado o versión antigua del TS).
-   **Solución aplicada:** ajustar home.page.ts para definir propiedades/métodos e importar componentes correctos.
-   **Verificación:** ng serve compila.

-   **Problema:** Pantalla negra + error NG0908: requires Zone.js.

-   **Síntoma:** app carga en negro; consola exige Zone.js.
-   **Causa raíz:** main.ts no estaba usando appConfig (zoneless) y registraba providers/rutas aparte → configuración incoherente.
-   **Solución aplicada:** bootstrapApplication(App, appConfig) y eliminar duplicación de router/providers en main.ts.
-   **Verificación:** app renderiza y vuelven los cambios de URL.

-   **Problema:** TTS HTML usaba propiedad text pero TS usaba otra (textForTts) y faltaba @Input text.

-   **Síntoma:** errores de binding (property inexistente / input desconocido).
-   **Causa raíz:** refactor incompleto al separar componentes.
-   **Solución aplicada:** unificar a @Input() text y alinear template.
-   **Verificación:** compila y el textarea funciona.

-   **Problema:** STT trim is not a function.

-   **Síntoma:** al transcribir, crashea en .trim().
-   **Causa raíz:** el backend devolvía JSON/objeto (no string) y el engine asumía string.
-   **Solución aplicada:** hacer el HttpVoiceEngine.stt() tolerante: aceptar string o {text: ...} y normalizar a string.
-   **Verificación:** STT vuelve a funcionar.

**6) Tareas realizadas (checklist)**

-   Definir UI Home con topbar + acciones verticales.
-   Implementar TopNavBarComponent como componente reutilizable.
-   Implementar RightDrawerComponent y panels ProfilePanel / SettingsPanel.
-   Separar VoicePanelComponent en SttComponent y TtsComponent.
-   Actualizar Home para lanzar STT y TTS como herramientas separadas.
-   Resolver errores ngIf/CommonModule.
-   Corregir arranque zoneless (usar appConfig en main.ts).
-   Corregir contrato TTS (@Input text) y el HTML.
-   Hacer STT robusto ante respuesta no-string del backend.

**7) Estado del proyecto al final del día**

-   **Qué funciona**

-   Home con topbar, acciones y navegación (incluyendo cambio de URL tras corregir main.ts/app.config.ts).
-   Drawer derecho (perfil/config) operativo.
-   STT y TTS separados y funcionando; TTS acepta texto por @Input.
-   Proyecto corre en modo zoneless sin requerir Zone.js.

-   **Qué falta**

-   Persistencia de datos (estado durante navegación + almacenamiento local duradero).
-   Formalizar completamente la arquitectura desacoplable (contracts/adapters/ui) para "voice" dentro de una carpeta de dominio.
-   Definir/implementar el sistema de guardado por "carpeta de salida" y estructura stt/tts/conversaciones/resumenes.

-   **Bloqueos / riesgos**

-   Persistencia de sesiones largas (horas): pendiente definir si se guarda en OPFS/IndexedDB y cómo trocear audio (pendiente de verificar).
-   Algunas incoherencias puntuales previas (drawer no abriendo "sin razón clara"): conviene fijar fuente de verdad de versiones de archivos y evitar desalineación TS/HTML (pendiente de verificar).

-   **Próximo paso recomendado (máximo 3)**

-   Implementar **persistencia de sesión** (sessionStorage/servicio de estado) para lastSttText, lastTtsText, idioma y preferencias.
-   Diseñar **persistencia local duradera** (IndexedDB/OPFS) para sesiones largas y metadatos (duración, timestamps).
-   Consolidar la carpeta voice/ con contracts/, adapters/, ui/ y migrar el engine/adapters si aún hay restos en services/ o imports antiguos.

**Día 22/01/2025**

**1) Resumen ejecutivo**

-   Se consolidó el flujo de navegación: cada herramienta (STT/TTS) pasó de "vistas internas" a **páginas con rutas** para evitar carga innecesaria y clarificar UX.
-   Se **arreglaron problemas de compilación y render** relacionados con Angular standalone + routing + configuración **zoneless**.
-   Se introdujo el concepto de arquitectura **desacoplable por proveedores** (tokens + interfaces), aplicándolo al motor de voz (renombrado a HttpVoiceEngine) y extendiéndolo al futuro sistema de persistencia.
-   Se creó la página **Historial** y se iteró sobre su UI hasta igualarla al patrón visual de STT/TTS (topbar + header con "volver" + paneles elegantes).
-   Se debatió y decidió una estrategia de persistencia: **historial persistente local** (no solo sesión), con plan de implementar **IndexedDB ahora** y reemplazar proveedor en la fase wrapper sin refactor.

**2) Decisiones y razonamiento (énfasis fuerte)**

-   **Decisión:** Separar el antiguo VoicePanelComponent en dos componentes: SttComponent y TtsComponent.

-   **Motivo:** Aislar lógica y UI por herramienta, facilitar mantenibilidad, y permitir navegación/páginas independientes.
-   **Alternativas consideradas:** Mantener panel unificado y solo ocultar secciones.
-   **Consecuencias:** Home pudo ofrecer botones separados; el servicio/engine se consumió por componente.

-   **Decisión:** Pasar de "cambio de vistas interno" a **páginas con routing** por herramienta.

-   **Motivo:** Escalabilidad futura y evitar que la carga de componentes crezca dentro de Home; más claro para historial y navegación.
-   **Alternativas consideradas:** Mantener el sistema de vistas (rápido y simple).
-   **Consecuencias:** Se introdujeron rutas, navegación con router.navigateByUrl(), y se detectaron/solucionaron problemas de config.

-   **Decisión:** Mantener configuración **zoneless** y no romper el routing.

-   **Motivo:** El proyecto fue creado con provideZonelessChangeDetection(). Quitar/romper providers de rutas hacía que "faltase" navegación.
-   **Alternativas consideradas:** Cambiar a zona tradicional (no se adoptó).
-   **Consecuencias:** Se corrigió main.ts/appConfig para conservar providers (router + resto).

-   **Decisión:** Adoptar un patrón de **inyección por token + contrato** para capas sustituibles (ya usado en voz; ahora también para almacenamiento).

-   **Motivo:** Poder pasar de web (IndexedDB) a wrapper (filesystem nativo) cambiando el provider, evitando refactors.
-   **Alternativas consideradas:** Servicios concretos acoplados (p.ej. VoiceApiService directo; persistencia directa en componentes).
-   **Consecuencias:** Se renombró VoiceApiService → HttpVoiceEngine y se planificó HISTORY_STORE para persistencia.

-   **Decisión:** Historial persistente **en dispositivo**, no de sesión.

-   **Motivo:** Usuarios con sesiones largas; el historial debe sobrevivir reinicios y navegación.
-   **Alternativas consideradas:** sessionStorage/estado de navegación; filesystem directo desde el inicio.
-   **Consecuencias:** Se decidió implementar **IndexedDB** primero (por compatibilidad web) con arquitectura reemplazable por provider.

-   **Decisión:** Para "quién habla", valorar a futuro multi-dispositivo vs diarización IA, pero sin implementarlo aún.

-   **Motivo:** Multi-mic por participante reduce necesidad de diarización inferida y mejora atribución de hablante.
-   **Alternativas consideradas:** Diarización automática sobre un único canal.
-   **Consecuencias:** Se dejó como dirección futura, condicionando cómo almacenar audios/metadata (timestamps, tracks).

**3) Cambios de arquitectura / estructura del proyecto**

-   Se consolidó el patrón "**engine/contrato/token**":

-   Voz: VoiceApiService se reorienta a HttpVoiceEngine como implementación concreta.
-   Persistencia: se empezó a diseñar un HistoryStore con token DI (plan).

-   Se reforzó el enfoque Angular standalone:

-   Importar correctamente módulos/directivas (ej: CommonModule para *ngIf).
-   Mantener provideZonelessChangeDetection() en app.config.ts.

-   Navegación por rutas:

-   Home deja de renderizar herramientas internamente; navega a /stt, /tts y se habilita camino para /history.

**Convenciones futuras**

-   Funcionalidades "engineables" deben exponerse vía **interfaces + tokens** para sustituir implementación según plataforma.
-   Persistencia: separar "estado de sesión" (ligero) vs "historial local" (persistente).

**4) Cambios funcionales (features)**

-   **Añadidas:**

-   STT y TTS como componentes separados, funcionales.
-   Página Historial con selector por categorías (STT/TTS/diarización/resúmenes) y layout consistente con herramientas.

-   **Modificadas:**

-   Home: de vista interna a navegación por rutas.
-   UI: adopción de topbar + drawer (perfil/config) en páginas de herramientas y en historial.

-   **Eliminadas:**

-   Se consideró borrar el componente unificado anterior (se confirmó que se podía eliminar si ya no se usa).

**5) Problemas y cómo se resolvieron (con causas)**

-   **Síntoma:** NG0303: Can't bind to 'ngIf'...

-   **Causa raíz:** Falta CommonModule (o NgIf) en @Component.imports en standalone.
-   **Solución aplicada:** Importar CommonModule en el componente afectado.
-   **Verificación:** Deja de fallar el template con *ngIf.

-   **Síntoma:** Drawer no se abría aunque detectaba clicks.

-   **Causa raíz:** Inconsistencia de estado/eventos o plantilla no enlazada como se esperaba (se observó que luego "funcionó sin saber por qué").
-   **Solución aplicada:** Ajustes en integración y/o revertir cambios recientes; quedó operativo.
-   **Verificación:** Click en iconos de topbar abre drawer.

-   **Síntoma:** Errores TS en build: Property 'view' does not exist... y app-stt/app-tts not known.

-   **Causa raíz:** Desalineación entre home.page.ts y home.page.html (propiedades/eventos referenciados que ya no existían), e imports/selector mismatch.
-   **Solución aplicada:** Sincronizar TS/HTML, asegurar imports y selectors de componentes.
-   **Verificación:** ng serve compila sin esos errores.

-   **Síntoma:** App cargaba solo "fondo negro" y no se veían rutas/cambios.

-   **Causa raíz:** Providers de routing/config perdidos o duplicados; confusión entre main.ts y appConfig.
-   **Solución aplicada:** Restaurar/centralizar providers (router) manteniendo zoneless.
-   **Verificación:** Navegación por URL vuelve a funcionar.

-   **Síntoma:** STT persistía mal el texto transcrito (TTS sí persistía).

-   **Causa raíz:** Guardado en sesión se hacía al limpiar ('') antes de asignar el resultado; y "limpiar UI" se disparaba en inicio de grabación.
-   **Solución aplicada:** Ajustar el momento del setString() para guardar el resultado final (y aclarar cuándo se limpia).
-   **Verificación:** Tras recargar o navegar, el último STT queda almacenado.

-   **Síntoma:** Historial visualmente no encajaba con TTS (tabs como texto plano, sin bordes).

-   **Causa raíz:** CSS inconsistente y efectos de btn-reset anulando estilos de botones.
-   **Solución aplicada:** Reestructurar HTML en patrón .panel/.box como STT/TTS y reforzar estilos de .tab.
-   **Verificación:** Tabs con aspecto de botón y secciones con bordes elegantes.

**6) Tareas realizadas (checklist)**

-   Dividir VoicePanelComponent en SttComponent y TtsComponent preservando funcionalidad.
-   Refactor de navegación: botones Home → rutas (/stt, /tts) en lugar de vistas internas.
-   Resolver errores standalone (CommonModule para *ngIf).
-   Resolver problemas de routing/config con zoneless (restaurar providers).
-   Implementar página Historial y alinear su layout con STT/TTS (topbar + volver + panel/boxes).
-   Definir estrategia de persistencia: historial local (IndexedDB) + arquitectura por provider para fase wrapper.

**7) Estado del proyecto al final del día**

-   **Qué funciona**

-   STT y TTS separados y operativos.
-   Navegación por rutas funcionando.
-   Drawer de perfil/config integrado en páginas.
-   Página Historial renderiza con UI consistente y selector de categorías.

-   **Qué falta**

-   Implementación real del historial (almacenamiento persistente + listado, rename, delete, download/share).
-   Persistencia robusta de outputs (no solo "último texto"), y especialmente de audios largos.
-   Diseño final del "store" desacoplable (token + interfaz + proveedor IndexedDB) integrado en STT/TTS e Historial.

-   **Bloqueos / riesgos**

-   "Audios de horas" en web: riesgo de cuotas/limitaciones del navegador (pendiente de verificar límites reales por plataforma).
-   Estrategia multi-dispositivo para atribuir hablantes: requiere diseño de sincronización (pendiente).

-   **Próximo paso recomendado (máx. 3)**

-   Definir HistoryStore + token DI e implementar proveedor IndexedDB mínimo (items + blobs).
-   Integrar STT/TTS para que creen entradas de historial (metadatos + audio/texto).
-   Conectar HistoryPage para listar por categoría desde el store (aunque sea lectura básica al principio).

* * * * *

**Día 11/02/2026**

**1) Resumen ejecutivo**

-   Se implementó **Diarización Multi-hablante** completa mediante arquitectura Host-Guest P2P (WebRTC).
-   Se creó la **LobbyPage** para gestionar sesiones: unirse con código, roles de Host/Invitado y grabación sincronizada.
-   Se resolvió la integración con **Whisper.cpp** adaptando el frontend para soportar su formato nativo JSON (`transcription` con timestamps de texto) y el estándar (`segments` con offsets).
-   Se mejoró significativamente la **UX**: modales de éxito personalizados (adiós alerts), botones de copiar/pegar inteligentes y redirección al historial.
-   Se corrigieron errores críticos de comunicación (URL 404, parámetros query en backend).

**2) Decisiones y razonamiento (énfasis fuerte)**

-   **Decisión:** Arquitectura P2P donde el **Host centraliza el procesamiento**.
    -   **Motivo:** Evitar que cada cliente necesite tener Whisper instalado/ejecutándose. Simplifica el despliegue en una LAN: solo una máquina potente hace de servidor.
    -   **Alternativas consideradas:** Procesamiento distribuido (demasiado complejo para coordinar) o Servidor central dedicado (rompe la filosofía "offline/local-first" si requiere setup extra).
    -   **Consecuencias:** El Host recibe los audios de todos, los mezcla/procesa secuencialmente y guarda el resultado.

-   **Decisión:** Soportar polimorfismo en la respuesta del STT (`segments` vs `transcription`).
    -   **Motivo:** Se descubrió que la versión de `whisper-cli` usada devuelve un JSON diferente a la API de OpenAI/Whisper estándar. En lugar de re-compilar binarios, se hizo el frontend robusto.
    -   **Consecuencias:** `DiarizationService` ahora tiene lógica para parsear tiempos en formato "HH:MM:SS,mmm".

-   **Decisión:** UX de "Pegar código" con foco manual programático.
    -   **Motivo:** Los navegadores bloquean `navigator.clipboard.readText()` si no hay un gesto de usuario explícito o el documento no tiene foco.
    -   **Solución:** Forzar `.focus()` en el input antes de llamar al API de portapapeles.

**3) Cambios de arquitectura / estructura del proyecto**

-   **Nuevos Servicios:**
    -   `DiarizationService`: Orquestador de llamadas STT y ensamblaje de transcripciones.
    -   `SessionService`: Gestión de estado P2P (PeerJS), conexión y transmisión de blobs de audio.
-   **Nuevas Páginas:**
    -   `LobbyPage`: Interfaz principal para la funcionalidad multi-hablante.
-   **Backend:**
    -   Ajuste en endpoints STT para aceptar y trazar `req.query.segments`.

**4) Cambios funcionales (features)**

-   **Añadidas:**
    -   Modo **Reunión Multi-hablante**:
        -   Host crea sala -> Recibe código.
        -   Invitados se unen con código.
        -   Grabación start/stop controlada por Host.
        -   Procesamiento automático de todos los canales.
    -   **Historial de Diarización**: Visualización de conversaciones con identificación de hablante.
    -   Botones de acción rápida: Copiar código de sala y Pegar código (con manejo de errores).

-   **Modificadas:**
    -   `HistoryRecorderService`: Soporte para guardar items tipo `diarization`.

**5) Problemas y cómo se resolvieron (con causas)**

-   **Síntoma:** El procesamiento STT nunca terminaba ("Procesando..." infinito).
    -   **Causa raíz:** El frontend esperaba un array `segments` (formato OpenAI) pero el backend recibía `transcription` (formato Whisper.cpp) y el código fallaba silenciosamente o ignoraba los datos.
    -   **Solución:** Implementar adaptador en `DiarizationService` para leer `transcription` y parsear sus timestamps de string a milisegundos.

-   **Síntoma:** Botón "Pegar" requería dos clics o fallaba silenciosamente.
    -   **Causa raíz:** Restricciones de seguridad del navegador sobre la API Clipboard.
    -   **Solución:** Añadir `this.joinInput.nativeElement.focus()` justo antes de leer el portapapeles para "demostrar" intención de usuario.

-   **Síntoma:** Error 404 al llamar a `/api/stt`.
    -   **Causa raíz:** Desalineación de configuración; el proxy o la URL base apuntaba a una ruta inexistente.
    -   **Solución:** Hardcodear (temporalmente/config) `http://localhost:3000/stt` en el servicio para bypassear problemas de proxy de desarrollo.

**6) Tareas realizadas (checklist)**

-   [x] Implementar `SessionService` con PeerJS.
-   [x] Crear UI `LobbyPage` con estados (Connecting, Connected, Recording).
-   [x] Implementar lógica de recolección de chunks de audio (Host recibe Blobs).
-   [x] Implementar `DiarizationService` conectando con backend STT.
-   [x] Debuggear y fixear formato de respuesta JSON Whisper.
-   [x] Mejorar UX: Modal éxito, validación de permisos, redirección.

**7) Estado del proyecto al final del día**

-   **Qué funciona**
    -   Diarización completa en entorno local (LAN/localhost).
    -   Identificación de hablantes (basada en el nombre del peer).
    -   Persistencia en historial.
    -   UX fluida sin errores de consola visibles.

-   **Qué falta**
    -   Manejo de desconexiones abruptas (re-conectar peers).
    -   Indicadores de nivel de audio (vúmetros) en el Lobby para saber si el micro funciona antes de grabar.

-   **Próximo paso recomendado (máximo 3 bullets)**
    -   Refinar la persistencia de audio combinado (actualmente solo se guarda texto).
    -   Optimizar la transferencia de datos P2P para sesiones largas.