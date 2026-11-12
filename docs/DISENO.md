# HarmonyJazz: documento de diseño

Webapp para aprender jazz en trompeta (nivel avanzado): armonía aplicada, vocabulario, play-along y escucha por micrófono, organizado en un plan diario.

## Principios

1. **Todo en lectura de trompeta en Si♭.** Notación, cifrados, guide tones y afinador se muestran escritos (2ª mayor arriba) y con un clic pasan a concierto. Internamente todo está en concierto.
2. **Ortografía correcta.** Las notas se modelan como letra + alteración, no como números MIDI: G7alt se escribe G A♭ A♯ B C♯ E♭ F. Las transposiciones son por intervalo (letras + semitonos).
3. **Las 12 tonalidades como unidad de progreso.** Cada ejercicio registra en qué tonalidades salió limpio y a qué tempo.
4. **Generar, no almacenar.** Los ejercicios se generan sobre cualquier progresión y tonalidad, así el material nunca se agota.
5. **Sin backend.** Web estática con el progreso en `localStorage`. Se puede desplegar en GitHub Pages y funciona en el celular.

## Arquitectura

```
src/
  theory/      núcleo musical puro (sin dependencias, con tests)
    notes.ts     notas, intervalos, grados, transposición, colocación en registro
    scales.ts    21 escalas (modos, menor melódica y sus modos, disminuidas, bebop…)
    chords.ts    parser de cifrados, calidades, escala-acorde, análisis de notas
    chart.ts     progresiones "Dm7 G7 | Cmaj7 | %" → acordes ubicados en corcheas
    voicings.ts  voicings rootless A/B con conducción de voces
  exercises/
    generators.ts  11 generadores de líneas (guide tones, arpegios, enclosures, bebop,
                   1-2-3-5, pares de tríadas, pentatónicas, side-slipping, desplazamiento)
    abc.ts         línea + carta → notación ABC (armadura, alteraciones por compás, ligaduras)
  content/     progresiones, repertorio (sólo armonía), lecciones, frases del usuario y plan diario
  transcribe/  audios guardados (IndexedDB), selecciones, loop y picos de la onda
  auth/        contraseña de acceso (traba en el navegador)
  audio/engine.ts  play-along con Tone.js: bajo walking, comping rootless, batería con swing,
                   melodía guía, cuenta, metrónomo en 2 y 4
  pitch/       detector YIN + segmentador de notas + captura del micrófono
  state/       persistencia (ajustes, historial, tonalidades dominadas)
  ui/          React: Hoy, Play-along, Lecciones, Vocabulario, Transcribir, Afinador
```

### Flujo de un ejercicio

`progresión (concierto) → transponer a la tonalidad elegida → generador → MelNote[] (concierto)`, y después:
- `toAbc(..., transpose: Si♭)` → partitura escrita (abcjs);
- `engine.play({ chart, melody })` → acompañamiento y, opcionalmente, la línea sonando.

### Play-along

- Se agenda un chorus por vez (`Transport.scheduleRepeat`), así cada vuelta es distinta (comping y walking aleatorizados).
- El swing se aplica posicionando el contratiempo en `beat + swing` (0,5 = recto, 0,67 = tresillo).
- El bajo camina con fundamental, notas del acorde o de la escala, y una aproximación cromática o por 5ª a la siguiente fundamental.
- El piano usa la forma A o B del voicing rootless, la que menos se mueve respecto del anterior, con ritmos tipo Charleston y anticipaciones.
- **Instrumentos reales:** piano (Salamander Grand Piano V3), contrabajo y trompeta (FluidR3), unas 34 muestras (~3 MB) servidas desde el propio sitio. Se piden al abrir la pantalla; `Tone.Sampler` interpola las notas intermedias. Si no cargan (por ejemplo, sin conexión) se usan los sintetizadores de respaldo y la interfaz lo avisa. La **batería sigue siendo sintetizada**: no hay un kit de jazz con licencia verificada. Créditos y licencias en `public/samples/CREDITS.txt` y en el pie de la app (el piano es CC BY 3.0 y exige atribución).
- **Mezcla y volumen:** cada instrumento pasa por un bus; la salida va a un compresor, un limitador y un recortador suave que garantiza un techo de ~0,91 (sin saturar). Los niveles se ajustaron **midiendo la salida real** (rms por instrumento y del conjunto), no a oído. El control de volumen va **después** del compresor (si no, éste aplasta lo que se sube) y va de −14 a +2 dB respecto de una base de +2 dB; el conjunto queda en ≈ −9,7 dBFS de rms (la versión original estaba en −16,8) y, al máximo, ~3 % de las muestras roza el techo.
- **Humanización:** microvariaciones de tiempo por instrumento (piano apenas atrás, bajo apenas adelante; melodía y clic exactos), variación de intensidad y una dinámica que crece en los primeros coros.
- **Robustez:** los avisos visuales llevan un número de generación y se descartan si el motor se detuvo o reinició (Tone no puede cancelar uno que ya pasó a `requestAnimationFrame`); `play()` se cancela solo si hubo un stop durante la preparación; en móviles pide la sesión de audio `playback` y mantiene un `<audio>` silencioso.
- **Estilos:** swing (walking), swing en 2, balada (escobillas, bajo en 2, piano sostenido) y bossa nova (corcheas rectas, clave 3-2 en rim, bajo fundamental–quinta). Cada progresión trae un estilo por defecto que se puede cambiar.
- `engine.locate(performance.now())` convierte un instante en (chorus, corchea cuantizada con swing) usando `AudioContext.getOutputTimestamp()`: es el reloj que usa la transcripción.

### Escucha

- YIN sobre bloques de 2048 muestras (~60 fps) con la cancelación de eco, la supresión de ruido y el AGC desactivados.
- `NoteTracker` emite una nota cuando la altura se mantiene unos 60 ms.
- Cada nota se clasifica contra el acorde que suena: del acorde / tensión / de la escala / cromática.
- **Reto de guide tones:** con cada cambio de acorde se abre una ventana de un tiempo; acierta si la primera nota relevante es la 3ª o la 7ª.
- **Notas largas:** se mide la dispersión (desvío estándar en cents) para trabajar la estabilidad del sonido.
- Se recomienda usar auriculares: el micrófono no separa la trompeta del acompañamiento.

### Transcripción del solo

En el play-along, con el micrófono activo, **● Grabar solo** captura cada inicio y fin de nota y, al terminar:
1. ubica cada evento en la forma con `engine.locate`, compensando ~85 ms del retardo propio de la detección;
2. arma notas que duran hasta la siguiente o hasta su fin, y las corta en el final del chorus (`pitch/transcribe.ts`);
3. escribe cada altura con la ortografía del acorde que suena (sobre G7alt, A♭ es ♭9 y A♯ es ♯9);
4. muestra la partitura por chorus, permite escucharla sobre el acompañamiento y analiza: llegadas a guide tones en los cambios, notas del acorde en tiempo fuerte, ataques en contratiempo, espacio, cromatismo y registro, con comentarios concretos.

Es una aproximación: no capta notas fantasma, glissandos ni notas más rápidas que ~60 ms.

### Plan diario

Seis bloques proporcionales a la duración elegida (30–120 min): calentamiento y sonido, técnica en la tonalidad del día, armonía aplicada (lección foco), vocabulario (frase del día), tema de la semana e improvisación libre / transcripción. La tonalidad del día recorre el ciclo de cuartas y el tema rota cada semana. Hay temporizador por bloque, racha e historial de 28 días.

### Vocabulario: tus frases, cargadas a mano

La app **no trae frases propias**: el Vocabulario es una colección que carga el usuario (`content/phrases.ts`, guardada en `localStorage`). Cada frase se carga con notas, cifrado, tonalidad, modo, nivel y tempo, escritas como estén en la partitura del usuario: **en Si♭ o en concierto** (se convierte a concierto al guardar). Hay un teclado de entrada (alteración, octava, duración) y una vista previa en partitura. Una vez guardada, la frase se estudia con la misma tarjeta de ejercicio de las lecciones: partitura, play-along sobre su armonía, tempo y las 12 tonalidades con registro de dominio.

Las frases de prueba del analizador (`exercises/fixtures.ts`) sólo se usan en los tests y no forman parte de la app.

**Fuentes libres:** se evaluó el libro abierto *A Guide to Exploring Jazz Improvisation* (open.maricopa.edu, CC BY 4.0); desde este entorno el sitio devolvió 403 y no se pudo leer. No se incorporó contenido de él.

### Repertorio: sólo armonía

`content/standards.ts` tiene 22 temas con **sólo la sucesión de acordes** (sin melodía ni letra). La armonía no tiene derecho de autor por sí sola, pero los cifrados están escritos de memoria y pueden diferir de la grabación: cada tema tiene el botón "Copiar a Mis temas" para corregirlo en el editor. Los de dominio público (publicados hasta 1930) están marcados.

### Transcribir

Pestaña para sacar música de oído a partir de audios propios (`ui/pages/Transcribe.tsx`, `ui/components/transcribe/`, `transcribe/`). Los archivos se guardan en **IndexedDB**, sólo en el dispositivo; nada se sube. Cada audio guarda su posición, velocidad, afinación, filtros, selección, pasajes, marcadores, grilla, entrenador y apuntes, para seguir otro día.

**Motor de audio.** Hay dos, y la app elige sola:
- **Motor preciso** (`stretch.ts`, `engine.worklet.ts`, `engine.ts`): se decodifica el audio entero, se pasa a 16 bits y lo reproduce un `AudioWorklet` con un núcleo propio (`PlayerCore`). Estira el tiempo con **WSOLA** (cuadros de 2048 muestras, solape del 50 %, empalme por correlación normalizada), afina por remuestreo de Hermite (la velocidad final es la pedida y el tono cambia por esa razón) y trata el loop como una señal circular: los últimos 12 ms se mezclan con el audio anterior al inicio, así que el loop dura exactamente lo marcado y **no tiene cortes ni clics**. Los saltos (buscar, pausar, cambiar de modo) llevan fundidos de 2 ms. El silencio entre repeticiones se inserta en el flujo ya estirado.
- **Reproductor simple** (`MediaEngine`): el `<audio>` del navegador. Sirve para cualquier duración, pero el loop se corta un instante y no hay afinación, filtros ni espectrograma. Se usa si el audio decodificado superaría ~260 MB (unos 12–15 min en estéreo), si el navegador no admite worklets, si falla la decodificación o si el usuario lo pide.

**Medido** (`stretch.test.ts`, núcleo puro y determinista): a 50/75/150/200 % el tono de un seno de 440 Hz se mantiene entre 438 y 442 Hz y la posición avanza al ritmo pedido (±0,12 s en 4 s); +100 centésimas da 466,16 ± 1 Hz sin cambiar la velocidad; un tono estable no pulsa (±8 % de amplitud); un acorde conserva sus tres frecuencias; en loop, la posición nunca sale del tramo, el salto máximo entre muestras en el empalme no supera 1,6× el de la señal original (a 50, 100 y 150 %) y diez vueltas de 0,6 s duran 6,0 s; la pausa entre repeticiones deja un silencio de 0,45–0,6 s. Costo de CPU: ~100× tiempo real en promedio y, en régimen, el peor bloque de 128 muestras tarda 0,7 ms de los 2,7 ms disponibles (en un celular puede ser varias veces más lento).

**Análisis** (`fft.ts`, `spectro.ts`, `pitch.ts`):
- **Espectrograma** con eje de altura logarítmico (E2–C7, 3 filas por semitono), líneas en cada Do (o en cada "Do" escrito si se lee en Si♭) y las notas detectadas encima.
- **Nota que suena** junto al cursor: suma de armónicos sobre el espectro, con estimación de desafinación en centésimas.
- **Detección de notas de una selección**: suma de armónicos por cuadro + seguimiento de Viterbi + segmentación. **Es una estimación**: en señales sintéticas (trompeta con vibrato, 5 audios de 20 notas) encontró 99–100 % de las notas, con precisión de 100 % (sola), 92 % (bajo suave), 79 % (bajo tan fuerte como el solo) y 66 % (bajo al doble o timbre apagado); las notas sobrantes son armónicos del bajo. Con grabaciones reales va a rendir peor. El "corte de graves" del reproductor también se aplica a la detección. Se puede escuchar lo detectado con la trompeta de la app, ocultar las notas débiles y pasar la selección a Vocabulario (cuantizada a corcheas con el tempo de la grilla; el borrador viaja por `localStorage` y se abre en el editor).

**Click de metrónomo alineado** (`PlayerCore.setClick`): se genera dentro del worklet a partir de la posición de origen y de la grilla, así que cae con la música a cualquier velocidad y también tras la vuelta del loop; sirve para comprobar de oído que la grilla (tempo y "el 1") coincide con el disco. Medido: cada click cae a ±15 ms de su lugar a 50, 100 y 150 %, el acento (tiempo 1) es más agudo y el filtro "quitar el centro" no lo anula.

**Estimación de afinación** (`estimateTuning`): mide la desafinación de ~240 instantes del audio y promedia en un círculo de 100 centésimas. En señales sintéticas dio el desvío correcto (0, +12, +27, +30, −35, +44 centésimas, error ≤ 8) y devolvió "sin resultado" con ruido y con silencio. En la interfaz propone corregirlo con el ajuste fino.

**Otras herramientas:** velocidad 25–200 %, afinación ±12 semitonos y ±100 centésimas, filtro de graves y agudos (dos biquad en cascada, 24 dB/oct), "quitar el centro" / "sólo el centro", preajuste "Aislar trompeta"; grilla de compases (tempo por toques, "el 1 está aquí", loops de 1/2/4/8 compases, ajuste de la selección a compases y a tiempos); marcadores con nombre; **entrenador de loops** (sube la velocidad cada N repeticiones hasta la meta, con pausa entre repeticiones); pasajes guardados con su velocidad; apuntes. Gestos: tocar = ir ahí, arrastrar = seleccionar, arrastrar un borde = ajustarlo, pellizco o rueda = zoom, franja general para moverse.

**Lo que no pude verificar:** cómo suena. La calidad del estiramiento a velocidades bajas en música real (transitorios de la batería, piano), la latencia y los cortes en un Android real y el consumo de memoria con audios largos en un celular sólo se pueden juzgar escuchando y probando en el aparato.

### Práctica en el celular: sin conexión, atril, copia de seguridad

- **Sin conexión** (`vite.config.ts`, plugin `offline`, `main.tsx`): el build genera `sw.js` con todo lo que la app necesita (código, estilos, el worklet, íconos y las muestras de instrumentos, ~4 MB). El service worker lo guarda al instalarse y responde primero desde el almacenamiento; la versión del caché sale de un hash de nombres y tamaños, así que cada despliegue lo renueva y la app avisa (\"Hay una versión nueva… Recargar\"). El manifiesto trae íconos PNG de 192 y 512 px (y uno *maskable*) para poder instalarla en Android. **Verificado:** con el servidor apagado, la app recarga, el play-along se dibuja y las muestras salen del caché. (La simulación de "sin conexión" de Playwright no sirve para esto: se probó apagando el servidor.)
- **Pantalla encendida** (`ui/wakeLock.ts`): mientras suena el play-along o un audio de Transcribir y mientras está abierto el atril. Si el navegador no admite la API, no hace nada. No se pudo verificar en un celular real.
- **Modo atril** (`ui/components/Atril.tsx`): pantalla completa con el acorde actual enorme, el siguiente, los cuatro tiempos, la grilla en letra grande (ajustable con A−/A+, se recuerda), el compás que suena resaltado y siempre a la vista, el loop marcado, y los controles de ▶/■ y tempo. Usa pantalla completa si el navegador la permite.
- **Copia de seguridad** (`state/backup.ts`, `ui/components/BackupCard.tsx`, en Hoy): un JSON con los temas, frases, progreso, ajustes y las fichas de los audios (pasajes, marcadores, grilla). **No** incluye la contraseña, los borradores ni los audios (pesan decenas de MB). Restaurar reemplaza los datos tras confirmar y valida el archivo (rechaza lo que no es una copia, claves raras y datos desmesurados). Avisa si hace 14 días o más que no se hace una copia.

### Editor de grilla: atajos

`content/chartTemplates.ts` y el panel "Atajos" de `ChartEditor`: los siete acordes de la tonalidad elegida (mayor o menor) para ponerlos en el casillero con un toque; plantillas (ii–V–I, ii–V corto, ii–V–i menor, turnaround, backdoor, sustitución tritonal, blues de 12 compases, rhythm changes A, cadena de ii–V por cuartas) que se agregan después del compás elegido; y transposición de toda la grilla (±½ tono, ±cuarta) con ortografía de jazz (bemoles). Las plantillas se verifican en las 12 tonalidades y el blues y los rhythm changes coinciden con las progresiones de la app.

### Lecciones: paso a paso y desglose de cada línea

Cada una de las 12 lecciones tiene, además del texto, un **paso a paso** (5–6 pasos de práctica progresiva), **por qué funciona** (3 puntos) y 4–6 ejercicios. Para cada línea generada se muestra **cómo está armada**: la fórmula exacta del generador (`recipe`) y, nota por nota, sus primeros cuatro compases, con el analizador `analyzeLick`. Las fórmulas se verifican con tests que ejecutan cada generador y comparan los grados que produce con lo que la receta dice. Los textos se traducen a la lectura elegida (Si♭ o concierto); sin transposición se dejan intactos para conservar la ortografía intencional (por ejemplo C♭ en la escala alterada de G).

### Loops, transposición y biblioteca propia

- **Loop:** en el play-along se toca un compás para marcar el inicio y otro para el final. `sliceChart` recorta la forma y el motor la repite, así que el bajo, el piano y la grabación del solo trabajan sobre el tramo.
- **Transposición:** los temas con tonalidad usan el selector de las 12 tonalidades; los demás (y las progresiones propias sin tonalidad) se transponen de a medio tono con ortografía de jazz (`semitoneInterval`: el tritono es una 5ª disminuida, C → G♭).
- **Mis temas:** cifrados cargados por el usuario, guardados en `localStorage` (hasta 500). Se limpian secciones (`[A]`, `*A`), repeticiones y saltos de línea (`normalizeChartText`) y se validan al guardar, al importar y al leer, por si el almacenamiento tiene datos dañados. Se exportan e importan como `.json`.
- **Editor de grilla (estilo iReal Pro):** `ChartEditor` + `content/chartDoc.ts`. El tema se arma por compases (1–4 acordes, `%`), con paleta de raíz y calidad, secciones (Intro/A/B/C/D/Coda), inicio/fin de repetición y finales 1.º/2.º, con deshacer/rehacer. `compileDoc` despliega las repeticiones a un cifrado plano (lo que toca el play-along); el `doc` se guarda junto al tema (`UserTune.doc`) para seguir editándolo, y `chart` es siempre su versión desplegada. También se puede pegar texto (modo "Texto").
- **Sonido:** `audio/patterns.ts` genera (con semilla, sin audio y con tests) el bajo caminante, el comping de piano y la batería; `audio/engine.ts` los toca con piano/bajo/trompeta/batería reales. El swing depende del tempo. El ajuste "Salida" (automática/celular/normal) activa en el celular un filtro pasaaltos, realce de presencia y armónicos del bajo, porque un altavoz de celular casi no reproduce graves. La salida tiene un techo duro (~−0,8 dBFS) sin sobremuestreo, que rebasaba el techo en los transitorios de la batería.
- **Carga masiva:** un texto o archivo `.txt` con varios temas (cada uno empieza con `# Nombre`; `tonalidad:`, `tempo:`, `estilo:` y `compositor:` son opcionales; los saltos de línea separan compases). `parseBulk` devuelve un resultado por tema con su línea, avisos y error, así que un tema roto no frena a los demás. La tonalidad se deduce del último acorde sólo cuando éste es una tónica clara; si no, el tema queda sin tonalidad fija (se transpone de a medio tono). Hay vista previa antes de importar, detección de repetidos (mismo nombre y cifrado) y un tope de 500 temas. Los finales 1ª/2ª no se expanden solos: el cifrado se escribe completo.
- **Sin el Real Book:** la app no trae contenido con derechos de autor (melodías ni cifrados de libros comerciales). El usuario carga los suyos.
- **Diagnóstico de audio:** el reproductor muestra un medidor del sonido que genera la app y avisa si el audio del navegador está pausado o si todo está apagado; en móviles pide la sesión de audio "playback" y mantiene un `<audio>` silencioso.

## Seguridad y privacidad

- **Sin red:** la app no hace peticiones a terceros. Una CSP (meta tag, sólo en el build) lo impone: `connect-src 'self'`, sin scripts inline, `object-src 'none'`. `abcjs` trae URLs de soundfonts que no se usan; la CSP las deja inertes.
- **Audio local:** el micrófono se analiza en el dispositivo; no se graba ni se envía. Se libera al apagarlo.
- **Datos en el dispositivo:** configuración, registro de práctica, tempos dominados y temas propios, en `localStorage`. Sin cuentas, cookies ni rastreo.
- **Entrada de usuario:** la progresión propia pasa por un parser estricto; el código propio no usa `innerHTML` ni `eval`.
- **CI/CD:** permisos mínimos (`contents: read`); `pages: write` e `id-token: write` sólo en el job de deploy.
- **Pendiente:** las acciones de GitHub están fijadas por etiqueta (`@v4`), no por SHA de commit; `frame-ancestors` no se puede fijar desde un meta tag en GitHub Pages.

## Roadmap

**Hecho en la iteración 3:** instrumentos reales (piano, contrabajo, trompeta), mezcla medida, más volumen sin saturar, humanización, control de volumen, y corrección de dos carreras del motor (stop).

**Hecho en la iteración 2:** estilos (balada, bossa, swing en 2), Blue Bossa, Solar y balada en E♭, transcripción y análisis del solo, despliegue en GitHub Pages y manifest para instalarla.

**Corto plazo**
- Batería real (ride, bombo, caja, hi-hat): falta una fuente con licencia verificable.
- Elegir y comparar otros bancos de piano y contrabajo; más capas de velocidad.
- Guardar las tomas transcriptas para seguir el progreso en el tiempo.
- Resaltar la nota actual en la partitura durante la reproducción.
- Más formas de standards (revisadas de oído).
- Estilos: latin, double-time.

**Mediano plazo**
- Transcripción asistida: grabar un solo y obtener la notación con el análisis contra los cambios.
- Ejercicios de oído: dictado de cualidades, guide tones y progresiones.
- Repetición espaciada por tonalidad y ejercicio, según las marcas de tempo.
- Funcionamiento offline (service worker).

**Opcional (requiere backend)**
- Sincronización entre dispositivos.
- Tutor con IA que genere frases nuevas y comente las grabaciones.

## Limitaciones conocidas

- Piano, contrabajo y trompeta son muestras reales, pero el **acompañamiento sigue siendo generado**, no un trío grabado, y la **batería es sintetizada**. La calidad musical (fraseo del bajo, comping) no se puede evaluar sin escucharla: los números del documento miden niveles y tiempos, no gusto.
- Si se cambia el tempo durante la reproducción, el chorus vuelve a empezar.
- La detección de altura es monofónica y necesita auriculares para no confundirse con el acompañamiento.
