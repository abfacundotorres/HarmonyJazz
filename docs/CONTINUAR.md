# Continuar el trabajo en HarmonyJazz

Texto para pegar al empezar una conversación nueva.

## Proyecto
Webapp estática (React + TypeScript + Vite + Tone.js + abcjs) para aprender jazz en trompeta (Si♭), nivel avanzado. Repo `abfacundotorres/HarmonyJazz`, desplegada en GitHub Pages desde `main`. Un solo usuario, **Android**, escucha por el altavoz del celular. iOS no importa.

## Cómo trabajar
- Respuestas sinceras, sin condescendencia. Preguntar antes si hay ambigüedad. Eficiencia antes que tener razón.
- Todo legal: no publicar melodías ni letras con derechos de autor. Sólo armonía (acordes), frases originales y material de dominio público o con licencia libre. Los cifrados de Real Book los carga el usuario.
- No abrir PR salvo que se pida. Ramas: usar la que indique la sesión.
- Antes de commitear: `npx tsc -b` y `npx vitest run`.

## Qué existe
- Play-along con loops, transposición, "Mis temas" (localStorage, exportar/importar, carga masiva) y editor de grilla estilo iReal.
- Audio con muestras reales (piano, bajo, trompeta, batería), swing según tempo, salida "celular" (`PHONE` en `src/audio/engine.ts`).
- **Repertorio** (`src/content/standards.ts`): 22 temas con **sólo la armonía**. Están escritos de memoria; hay que contrastarlos de oído y corregirlos en el editor si algo no coincide. Botón "Copiar a Mis temas".
- Vocabulario: 20 frases originales con estudio completo (`licks.ts`, `licksStudy.ts`); Lecciones.
- Contraseña de acceso (`src/auth/access.ts`, `scripts/access-hash.mjs`). **Está desactivada** (`ACCESS_HASH` vacío) hasta que se genere el hash. Es una traba del lado del navegador, no seguridad real: el código es público.

## Pendiente
1. Escuchar en el celular el ajuste anti-saturación (`MASTER_DB` 18→15, compresor ratio 4, recorte desde 0,8, `PHONE.exciterDb` 4). Si aún satura, bajar `MASTER_DB` o `BUS_DB.real.horn`.
2. Activar la contraseña: `node scripts/access-hash.mjs "clave"` y pegar el resultado en `ACCESS_HASH`.
3. Revisar de oído el Repertorio y las 7 frases nuevas (ninguna fue revisada por un trompetista).
4. Vocabulario desde fuentes libres: el entorno no pudo acceder a `open.maricopa.edu` (libro abierto CC BY 4.0 *A Guide to Exploring Jazz Improvisation*). Si se permite el dominio, se puede tomar de ahí con atribución.
5. Ideas para la grilla en celular: tocar mientras se edita, cifrado en pantalla grande, atajos de acordes.
