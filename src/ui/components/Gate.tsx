import { ReactNode, useState } from 'react';
import { checkPassword, isUnlocked, rememberUnlock } from '../../auth/access';

/** Pide la contraseña de acceso antes de mostrar la app (una vez por dispositivo). */
export function Gate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(isUnlocked);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (open) return <>{children}</>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await checkPassword(pw).catch(() => false);
    setBusy(false);
    if (!ok) return setError(true);
    rememberUnlock();
    setOpen(true);
  };
  return (
    <div className="gate">
      <form className="card" onSubmit={submit}>
        <h2>
          <span className="bell" aria-hidden>◗</span> HarmonyJazz
        </h2>
        <label htmlFor="gate-pw">Contraseña</label>
        <input id="gate-pw" type="password" autoComplete="current-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        {error && <p className="small" style={{ color: 'var(--bad)' }}>Contraseña incorrecta.</p>}
        <button className="primary" type="submit" disabled={busy || !pw}>
          {busy ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
