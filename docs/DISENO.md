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
  content/     progresiones, lecciones, licks (frases originales) y plan diario
  audio/engine.ts  play-along con Tone.js: bajo walking, comping rootless, batería con swing,
                   melodía guía, cuenta, metrónomo en 2 y 4
  pitch/       detector YIN + segmentador de notas + captura del micrófono
  state/       persistencia (ajustes, historial, tonalidades dominadas)
  ui/          React: Hoy, Play-along, Lecciones, Vocabulario, Afinador
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

### Vocabulario: frases con estudio paso a paso

Cada frase (13 en total, con nivel y tempo propios) se estudia en seis partes:
1. **Cómo aprenderla:** ocho pasos de lento a rápido, con el tempo de la propia frase.
2. **Por ideas:** la frase dividida en 2–5 ideas, cada una con qué hace y por qué funciona (texto mío).
3. **Nota por nota:** **generada** por `analyzeLick` a partir de la propia frase y la carta: grado sobre el acorde, función (nota del acorde, tensión, de la escala, cromática), guide tone, intervalo desde la anterior, posición en el compás y recursos detectados (aproximaciones, enclosures, notas azules, anticipaciones).
4. **Por qué funciona:** mis explicaciones más datos medidos (porcentaje de notas del acorde en tiempo fuerte, llegadas a guide tones, etc.).
5. **Ejercicios:** propios de la frase y comunes, con casillas que se guardan en el dispositivo.
6. **En la trompeta:** consejos de ejecución.

Los textos están escritos en la tonalidad de referencia de cada frase y `localizeNotes` traduce los nombres de notas y acordes a la tonalidad y a la lectura elegidas (Si♭ o concierto), para que coincidan con la partitura y la tabla.

**Cómo se verifica:** el análisis de cada frase es idéntico en las 12 tonalidades (test); las ideas cubren todas las notas sin huecos ni solapes (test); los textos no contienen construcciones que el traductor confundiría con una nota (test); y en el navegador se comprueba que el texto de una idea nombre las mismas notas que sus fichas en Si♭, concierto y otra tonalidad. Revisar el contenido contra el análisis encontró errores míos que se corrigieron antes de publicar (una "escala bebop" que no lo era, una nota fuera de lugar en un ejercicio, afirmaciones sin fundamento).

### Lecciones: paso a paso y desglose de cada línea

Cada una de las 12 lecciones tiene, además del texto, un **paso a paso** (5–6 pasos de práctica progresiva), **por qué funciona** (3 puntos) y 4–6 ejercicios. Para cada línea generada se muestra **cómo está armada**: la fórmula exacta del generador (`recipe`) y, nota por nota, sus primeros cuatro compases, con el mismo analizador que usa Vocabulario. Las fórmulas se verifican con tests que ejecutan cada generador y comparan los grados que produce con lo que la receta dice. Los textos se traducen a la lectura elegida (Si♭ o concierto); sin transposición se dejan intactos para conservar la ortografía intencional (por ejemplo C♭ en la escala alterada de G).

### Loops, transposición y biblioteca propia

- **Loop:** en el play-along se toca un compás para marcar el inicio y otro para el final. `sliceChart` recorta la forma y el motor la repite, así que el bajo, el piano y la grabación del solo trabajan sobre el tramo.
- **Transposición:** los temas con tonalidad usan el selector de las 12 tonalidades; los demás (y las progresiones propias sin tonalidad) se transponen de a medio tono con ortografía de jazz (`semitoneInterval`: el tritono es una 5ª disminuida, C → G♭).
- **Mis temas:** cifrados cargados por el usuario, guardados en `localStorage` (hasta 500). Se limpian secciones (`[A]`, `*A`), repeticiones y saltos de línea (`normalizeChartText`) y se validan al guardar, al importar y al leer, por si el almacenamiento tiene datos dañados. Se exportan e importan como `.json`.
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
- Más frases y más formas de standards; editor de frases propias.
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
