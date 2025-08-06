
import { createHash } from 'crypto';

export function generateSecureHash(data: any): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

