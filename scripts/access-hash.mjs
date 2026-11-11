// Uso: node scripts/access-hash.mjs "contraseña"  → imprime el valor para ACCESS_HASH (src/auth/access.ts)
import { pbkdf2Sync } from 'node:crypto';
const pw = process.argv[2];
if (!pw) {
  console.error('Uso: node scripts/access-hash.mjs "contraseña"');
  process.exit(1);
}
console.log(pbkdf2Sync(pw.normalize('NFC'), 'harmonyjazz:acceso:v1', 200_000, 32, 'sha256').toString('hex'));
