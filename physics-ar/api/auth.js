import { kv } from '@vercel/kv';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Тек POST сұраныстары қабылданады' }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Жарамсыз JSON деректер' }, 400);
  }

  const { action, email, password, name } = body;

  if (!action || !email || !password) {
    return json({ error: 'action, email және password міндетті өрістер' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Электрондық пошта форматы дұрыс емес' }, 400);
  }

  if (password.length < 6) {
    return json({ error: 'Құпия сөз кемінде 6 таңбадан тұруы керек' }, 400);
  }

  if (action === 'register') {
    const existing = await kv.get(`user:${email}`);
    if (existing) {
      return json({ error: 'Бұл электрондық пошта тіркелген' }, 409);
    }

    const passwordHash = hashPassword(password);
    await kv.set(`user:${email}`, {
      email,
      name: name || '',
      passwordHash,
      createdAt: Date.now(),
    });

    return json({ success: true });
  }

  if (action === 'login') {
    const user = await kv.get(`user:${email}`);
    if (!user) {
      return json({ error: 'Электрондық пошта немесе құпия сөз қате' }, 401);
    }

    if (user.passwordHash !== hashPassword(password)) {
      return json({ error: 'Электрондық пошта немесе құпия сөз қате' }, 401);
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ email, name: user.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    return json({ token, user: { email, name: user.name } });
  }

  return json({ error: 'Белгісіз action мәні' }, 400);
}
