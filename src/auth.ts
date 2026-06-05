export interface Env {
  VSL_KV: KVNamespace;
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function isPasswordSet(kv: KVNamespace): Promise<boolean> {
  const pw = await kv.get('admin_password');
  return pw !== null && pw !== '';
}

export async function setPassword(kv: KVNamespace, password: string): Promise<void> {
  if (password.length < 4) {
    throw new Error('Senha deve ter pelo menos 4 caracteres');
  }
  const alreadySet = await isPasswordSet(kv);
  if (alreadySet) {
    throw new Error('Senha já foi definida');
  }
  const hash = await sha256(password);
  await kv.put('admin_password', hash);
}

export async function verifyPassword(kv: KVNamespace, password: string): Promise<boolean> {
  const stored = await kv.get('admin_password');
  if (!stored) return false;
  const hash = await sha256(password);
  return hash === stored;
}

export async function createSession(kv: KVNamespace): Promise<string> {
  const token = crypto.randomUUID();
  const session = {
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  await kv.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: 24 * 60 * 60,
  });
  return token;
}

export async function validateSession(kv: KVNamespace, token: string | null): Promise<boolean> {
  if (!token) return false;
  const raw = await kv.get(`session:${token}`);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw) as { expiresAt: string };
    return new Date(session.expiresAt).getTime() > Date.now();
  } catch {
    return false;
  }
}

export async function destroySession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(`session:${token}`);
}

export function getSessionFromCookie(request: Request): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(/vsl_session=([^;]+)/);
  return match ? match[1] : null;
}

export function makeSessionCookie(token: string, maxAge = 86400): string {
  return `vsl_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `vsl_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export async function requireAuth(request: Request, kv: KVNamespace): Promise<boolean> {
  const token = getSessionFromCookie(request);
  return validateSession(kv, token);
}
