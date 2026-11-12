import { useEffect } from 'react';

/**
 * Mantiene la pantalla encendida mientras `active` sea verdadero (celular en el atril, audio sonando).
 * El navegador suelta el bloqueo al cambiar de pestaña, así que se vuelve a pedir al regresar.
 * Si el navegador no lo admite, no hace nada.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> } };
    if (!nav.wakeLock) return;
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const get = async () => {
      try {
        const l = await nav.wakeLock!.request('screen');
        if (!alive) return void l.release().catch(() => undefined);
        lock = l;
      } catch {
        /* sin permiso o sin batería suficiente: se sigue sin bloqueo */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) void get();
    };
    void get();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
