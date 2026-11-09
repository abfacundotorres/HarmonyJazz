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

### Escucha

- YIN sobre bloques de 2048 muestras (~60 fps) con la cancelación de eco, la supresión de ruido y el AGC desactivados.
- `NoteTracker` emite una nota cuando la altura se mantiene unos 60 ms.
- Cada nota se clasifica contra el acorde que suena: del acorde / tensión / de la escala / cromática.
- **Reto de guide tones:** con cada cambio de acorde se abre una ventana de un tiempo; acierta si la primera nota relevante es la 3ª o la 7ª.
- **Notas largas:** se mide la dispersión (desvío estándar en cents) para trabajar la estabilidad del sonido.
- Se recomienda usar auriculares: el micrófono no separa la trompeta del acompañamiento.

### Plan diario

Seis bloques proporcionales a la duración elegida (30–120 min): calentamiento y sonido, técnica en la tonalidad del día, armonía aplicada (lección foco), vocabulario (frase del día), tema de la semana e improvisación libre / transcripción. La tonalidad del día recorre el ciclo de cuartas y el tema rota cada semana. Hay temporizador por bloque, racha e historial de 28 días.

## Roadmap

**Corto plazo**
- Instrumentos sampleados (piano, contrabajo, ride) en lugar de síntesis.
- Resaltar la nota actual en la partitura durante la reproducción.
- Más frases y más formas de standards; editor de frases propias.
- Estilos: bossa, balada, latin, double-time.

**Mediano plazo**
- Transcripción asistida: grabar un solo y obtener la notación con el análisis contra los cambios.
- Ejercicios de oído: dictado de cualidades, guide tones y progresiones.
- Repetición espaciada por tonalidad y ejercicio, según las marcas de tempo.
- PWA instalable y offline.

**Opcional (requiere backend)**
- Sincronización entre dispositivos.
- Tutor con IA que genere frases nuevas y comente las grabaciones.

## Limitaciones conocidas

- El sonido es sintetizado: sirve para practicar, pero no es un trío real.
- Si se cambia el tempo durante la reproducción, el chorus vuelve a empezar.
- La detección de altura es monofónica y necesita auriculares para no confundirse con el acompañamiento.
