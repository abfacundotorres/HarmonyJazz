# Continuar el trabajo en HarmonyJazz

Texto para pegar al empezar una conversación nueva.

## Proyecto
Webapp estática (React + TypeScript + Vite + Tone.js + abcjs) para aprender jazz en trompeta (Si♭), nivel avanzado. Repo `abfacundotorres/HarmonyJazz`, desplegada en GitHub Pages desde `main`. Un solo usuario, **Android**, escucha por el altavoz del celular. iOS no importa.

## Criterio legal (decidido: se mantiene lo seguro)
- La app es sólo para el usuario, pero el repositorio es **público**: todo lo que se sube queda distribuido. Por eso: **sin melodías ni letras**, sin cifrados copiados de libros (Real Book, etc.), sin colecciones ni archivos de terceros en el repo.
- La app no trae standards. Lo que el usuario quiera estudiar lo carga él en "Mis temas" (texto o grilla); queda en su navegador. (La armonía sola en general no se protege, pero se prefirió no llevar ningún tema de terceros en el repositorio.)
- **No se implementa la importación del formato de iReal Pro** (`irealb://`): decisión del usuario tras analizar el tema. Motivos: no se pudieron verificar los términos de uso de iReal, y las colecciones curadas de la app podrían tener condiciones propias. Si algún día cambia el uso (compartir o publicar la app), consultar a una persona abogada antes.

## Cómo trabajar
- Respuestas sinceras, sin condescendencia. Preguntar antes si hay ambigüedad. Eficiencia antes que tener razón.
- Todo legal: no publicar melodías ni letras con derechos de autor. Sólo armonía (acordes), frases originales y material de dominio público o con licencia libre. Los cifrados de Real Book los carga el usuario.
- No abrir PR salvo que se pida. Ramas: usar la que indique la sesión.
- Antes de commitear: `npx tsc -b`, `npm run lint` y `npx vitest run`; para cambios de interfaz, también `npm run e2e` (pruebas de navegador, en la carpeta `e2e/`).

## Qué existe
- **Pestañas:** Hoy, Play-along, Lecciones, **Escalas**, Vocabulario, Transcribir, Afinador (y Créditos en `#/creditos`).
- **Play-along** con loops, transposición, "Mis temas" (localStorage, exportar/importar, carga masiva) y **editor de grilla** estilo iReal: teclado fijo abajo, 4 compases por fila, selección de rango (copiar/cortar/pegar/repetir/borrar), "avanzar solo" y ▶ para tocar mientras se edita (la edición entra en la vuelta siguiente: `engine.queueChart`). La grilla de reproducción muestra secciones, repeticiones y finales, con cifrado Δ7 / -7 / ø7 (ajuste "Estilo de cifrado" en "Más").
- **Audio** con muestras reales (piano, bajo, trompeta, batería), swing según tempo, salida "celular" (`PHONE` en `src/audio/engine.ts`). El bajo ya no lleva distorsión fuerte en esa salida. `scripts/medir-audio.mjs` y `.py` miden la salida real (pico, rms, bandas) con Chromium.
- **Hoy:** plan diario con 15 calentamientos y 18 ejercicios de técnica (`content/practice.ts`), cada uno con explicación completa y pentagrama (los de técnica se generan en la tonalidad del día: `content/techniqueAbc.ts`). Incluye "Escala del día", que sale de la sugerencia de Escalas.
- **Lecciones** (12, teoría auditada): paso a paso, por qué funciona, plan de siete días, errores frecuentes y, por cada ejercicio generado, "Cómo practicar este ejercicio" (`content/exerciseGuides.ts`).
- **Escalas** (`pages/Scales.tsx`, `content/scaleStudy.ts`): las 21 escalas del motor en cuatro grupos, camino de seis patrones, pentagrama en la tonalidad, audio con la trompeta de la app con metrónomo en 2 y 4, cuenta previa y repetición (`engine.playExercise`), y progreso por tempo en `mastery` (`scale:<escala>:<patrón>`).
- **Vocabulario**: sin frases propias de la app; el usuario las carga a mano en Si♭ o concierto. El estudio de cada frase es generado.
- **Transcribir** (`pages/Transcribe.tsx`, `ui/components/transcribe/`, `src/transcribe/`): motor propio (WSOLA en AudioWorklet), loops, velocidad con tono preservado, espectrograma, detección de notas, compases, marcadores, entrenador de loops y pasajes guardados. Ver `docs/DISENO.md`.
- **Sin conexión / instalable** (service worker generado en el build), pantalla encendida mientras suena, modo atril, copia de seguridad (tarjeta al final de Hoy).
- **Contraseña de acceso** (`src/auth/access.ts`, `scripts/access-hash.mjs`): sólo se guarda su derivación PBKDF2. Es una traba del lado del navegador, no seguridad real: el hash es público. Para cambiarla: `node scripts/access-hash.mjs "clave"` y pegar el resultado en `ACCESS_HASH`. La prueba de acceso de Playwright se omite sin `HJ_PASSWORD`.
- **Auditoría pedagógica** de los textos de práctica: `docs/AUDITORIA_EJERCICIOS.md` (Arban y Clarke leídos del original de dominio público; lo que no se pudo comprobar está anotado).

## Decisiones que se mantienen
- La app no trae temas de terceros ni frases inventadas; el usuario carga lo suyo. No hay importación de iReal.
- Probar siempre contra el build (`vite preview`), no contra el servidor de desarrollo: las pruebas de navegador usan el service worker real.
- Antes de mergear, confirmar con el usuario. Los PR se hacen desde la rama de la sesión; `main` despliega solo a GitHub Pages.
- Si la app se difunde o se cobra, consultar a una persona abogada (licencias de las muestras, contenido) y a un contador; el control de acceso real exige un servidor.

## Pendiente
1. Escuchar en el celular: el bajo y la saturación a volumen bajo (nivel medido, no oído), el audio de Escalas (ahora con tempo que sube solo) y el play-along tras los cambios del motor (`playExercise`, agendado por chorus con eventos de un solo uso).
2. Probar Transcribir con audios reales (mp3, m4a) y escuchar el estiramiento a 50–70 %; ver memoria con audios largos: el tope del motor preciso ahora depende de la memoria del aparato (`transcribe/limits.ts`: unos 7 min con 4 GB, 4 min con 2 GB; pasado eso usa el reproductor simple). Ajustar esos números según lo que aguante el celular.
3. Partituras en el celular: van de a 2 compases por línea (1 si hay muchas alteraciones). Se probó meter 4 en las líneas de blancas y redondas: abcjs no achica el espaciado y el dibujo se sale. Sólo se logra con notas más chicas (`scale` < 1): decidir mirándolo en el aparato.
4. El temporizador de Hoy avisa con vibración y dos tonos: comprobar en el celular que se oye y vibra con la pantalla apagada (el navegador puede frenarlo).
5. Pruebas en otros navegadores (sólo Chromium a 390 px) e iOS (no es prioridad).

## Hecho en la última etapa (auditoría general)
- **Carga por pantalla:** cada pestaña viaja en su archivo (`lazy` en `ui/App.tsx`); Hoy abre con ~114 KB comprimidos en lugar de 395 (Tone.js y abcjs llegan cuando hacen falta y se precargan de fondo). `audio/stopAll.ts` permite cortar el audio sin cargar el motor; `usePosition` salió de `hooks.ts` por lo mismo.
- **Hoy:** el plan cambia solo al pasar la medianoche con la app abierta; el temporizador mide contra el reloj (no se atrasa con la pantalla apagada), avisa al terminar y se puede reiniciar; los minutos de los bloques suman la duración elegida; aviso de copia de seguridad arriba si hay datos y pasaron 14 días.
- **Escalas:** campo de tempo que deja escribir el número (antes saltaba a 40 al tipear), botones −4/+4, "subir 4 bpm cada 2 vueltas" al repetir (marca el tempo alcanzado) y la nota que suena resaltada en el pentagrama.
- **Pentatónicas:** sobre 7♯11 el generador usa la de la tónica (la de la 2ª traía la 7ª mayor); lección y receta al día.
- **Play-along / Afinador:** el texto de tonalidad sigue la lectura elegida; las notas de referencia muestran la octava.
- **Nombres en la lectura elegida:** los nombres y descripciones de las progresiones de la app ("Blues de jazz en F") se muestran en Si♭ o concierto; los temas propios no se tocan.
- **Vocabulario:** ya no tiene textos generados (la frase se estudia con la tarjeta común), así que no hay nada que auditar ahí.
- **Transcribir:** el transporte (inicio, −5 s, ▶, +5 s, loop, tiempo y velocidad) queda pegado arriba al bajar a los paneles; velocidad en menos renglones; la ayuda de teclado no se muestra en pantallas táctiles. La selección se puede pasar al tramo siguiente o anterior (mismo largo, para sacar un solo frase por frase) y acortar a la mitad o duplicar.
- **Motor:** los eventos agendados se borran al sonar (antes se acumulaban durante toda la sesión) y el bajo se corta al detener.
