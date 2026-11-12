# HarmonyJazz

Webapp para aprender jazz en trompeta: armonía aplicada, vocabulario, play-along generado y análisis de lo que tocás por micrófono. Todo escrito para trompeta en Si♭ (o en concierto).

- **Hoy:** plan diario con tonalidad del día, temporizador por bloque, racha e historial.
- **Play-along:** 17 progresiones con estilos swing, en 2, balada y bossa (ii–V–I en las 12, blues, Rhythm changes, Autumn Leaves, modal, Coltrane, Giant Steps…) o la tuya, en cualquier tonalidad, con acorde actual, guide tones y escala.
- **Lecciones:** 12 lecciones de nivel avanzado con ejercicios generados en las 12 tonalidades y registro de tempos.
- **Grabá tu solo:** en el play-along, la app transcribe lo que tocás, lo escribe según cada acorde y lo analiza (llegadas a guide tones, tiempo fuerte, contratiempo, espacio, registro).
- **Vocabulario:** tu colección de frases, cargadas a mano (en Si♭ o concierto) y transportables por el ciclo de cuartas.
- **Transcribir:** cargá un audio, bajale la velocidad sin cambiar el tono, marcá pasajes en loop y guardalos para seguir otro día.
- **Repertorio:** 22 standards, sólo con los acordes (sin melodía ni letra).
- **Mis temas:** cargá tus propios cifrados de a uno o en masa desde un texto, con loop de compases y transposición.
- **Modo atril:** la grilla y el acorde actual en letra grande a pantalla completa, para el celular en el atril.
- **Sin conexión:** se instala como app en Android y funciona sin señal; la pantalla se queda encendida mientras suena.
- **Copia de seguridad:** guardá y restaurá tus temas, frases, progreso y pasajes.
- **Afinador:** afinación, medición de estabilidad en notas largas y notas de referencia.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests del núcleo musical, generadores y detector de altura
npm run build    # sitio estático en dist/
```

## Publicar en GitHub Pages

El workflow `.github/workflows/deploy.yml` publica `dist/` en cada push a `main`. Hay que activarlo una vez: **Settings → Pages → Source: GitHub Actions**. Para usarla en el celular, abrí la URL y elegí "Agregar a pantalla de inicio".

## Créditos de audio

- Piano: [Salamander Grand Piano V3](https://archive.org/details/SalamanderGrandPianoV3), Alexander Holm, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Contrabajo y trompeta: FluidR3 SoundFont, Frank Wen, MIT.

Detalle de cambios y licencias en [`public/samples/CREDITS.txt`](public/samples/CREDITS.txt).

El diseño completo está en [`docs/DISENO.md`](docs/DISENO.md).

El micrófono necesita HTTPS o `localhost`. Usá auriculares para que el análisis no capte el acompañamiento.
