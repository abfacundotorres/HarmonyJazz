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
- Antes de commitear: `npx tsc -b` y `npx vitest run`.

## Qué existe
- Play-along con loops, transposición, "Mis temas" (localStorage, exportar/importar, carga masiva) y editor de grilla estilo iReal.
- Audio con muestras reales (piano, bajo, trompeta, batería), swing según tempo, salida "celular" (`PHONE` en `src/audio/engine.ts`).
- **Sin standards propios** (decisión del usuario): la app trae sólo formas y ejercicios genéricos; los temas los carga el usuario en "Mis temas". Se quitó un Repertorio de 28 temas (sólo armonía, escrito de memoria).
- **Vocabulario**: sin frases propias de la app; el usuario las carga a mano (`phrases.ts`, `pages/Vocab.tsx`) en Si♭ o concierto, con teclado de entrada y vista previa en partitura.
- **Transcribir** (`pages/Transcribe.tsx`, `ui/components/transcribe/`, `src/transcribe/`): motor propio (WSOLA en AudioWorklet) con loops sin cortes, velocidad con tono preservado, afinación fina, filtros, espectrograma, nota que suena, detección de notas (estimación), compases, marcadores, entrenador de loops y pasajes guardados. Ver `docs/DISENO.md`. Respaldo con el reproductor del navegador para audios largos.
- **Contraseña de acceso** (`src/auth/access.ts`, `scripts/access-hash.mjs`): contraseña provisoria activa (no figura en el repo, sólo su derivación). Es una traba del lado del navegador, no seguridad real. Para cambiarla: `node scripts/access-hash.mjs "clave"` y pegar el resultado en `ACCESS_HASH`.

- **Sin conexión / instalable** (service worker generado en el build), **pantalla encendida** mientras suena, **modo atril** (Play-along → "Modo atril"), **copia de seguridad** (tarjeta al final de Hoy), **atajos del editor de grilla** (acordes de la tonalidad, plantillas, transposición) y, en Transcribir, **click de metrónomo sobre la grilla** y **estimación de la afinación del disco**. Ver `docs/DISENO.md`.

## Pendiente
1. Escuchar en el celular el ajuste anti-saturación (`MASTER_DB` 18→15, compresor ratio 4, recorte desde 0,8, `PHONE.exciterDb` 4). Si aún satura, bajar `MASTER_DB` o `BUS_DB.real.horn`.
2. Probar Transcribir en el celular con audios reales (mp3, m4a) y **escuchar**: calidad del estiramiento a 50–70 % (batería, piano), cortes, latencia, memoria con audios de 8–12 min. Si el celular se queda corto, bajar `MAX_DECODED_BYTES` en `transcribe/engine.ts`. Probar la detección de notas con un solo real y ver cuántas acierta. Posibles mejoras: exportar/importar pasajes y marcadores, metrónomo sobre la grilla, ajuste de la afinación de referencia por detección.
4. Vocabulario desde fuentes libres: *A Guide to Exploring Jazz Improvisation* (open.maricopa.edu, CC BY 4.0) devolvió 403 desde este entorno. Si el usuario pega texto o ejemplos del libro, se pueden incorporar con atribución (los ejemplos musicales pueden tener excepciones a la licencia).
5. En el celular: instalar la app (menú de Chrome → "Instalar app"), probar que abre sin señal, que la pantalla no se apaga con el atril y que la letra del atril se lee a distancia. Si el aviso de "versión nueva" molesta o no aparece, revisar `main.tsx`.
6. Ideas siguientes: tocar mientras se edita la grilla, metrónomo y cuenta previa en Transcribir, exportar/importar pasajes entre dispositivos, mejoras de la detección de notas con grabaciones reales.
