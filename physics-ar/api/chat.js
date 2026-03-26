import { jwtVerify } from 'jose';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SYSTEM_PROMPT = `Сен PhysicsAR қосымшасының AI көмекшісісің. Тек физика тақырыбы бойынша қазақ тілінде жауап бер. Формулаларды қарапайым мәтінде жаз. Қысқа және түсінікті болу.

Жауап беру ережелері:
- Тек физика, механика, термодинамика, электромагнетизм, оптика және кванттық физика тақырыптарына жауап бер.
- Басқа тақырыптарға: "Мен тек физика бойынша көмектесе аламын" деп жауап бер.
- Формулаларды: F = m*a, E = m*c^2 түрінде жаз.
- Жауаптар қысқа болсын — ең көбі 3-4 сөйлем.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function verifyToken(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Тек POST сұраныстары қабылданады' }, 405);
  }

  const user = await verifyToken(req);
  if (!user) {
    return json({ error: 'Авторизация қажет' }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Жарамсыз JSON деректер' }, 400);
  }

  const { message, history = [] } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return json({ error: 'message өрісі міндетті' }, 400);
  }

  const messages = [
    ...history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-10), // keep last 10 turns to limit context size
    { role: 'user', content: message.trim() },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 800,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('OpenAI error:', err);
      return json({ error: 'AI қызметінде қате пайда болды' }, 502);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return json({ error: 'AI жауап қайтармады' }, 502);
    }

    return json({ reply });
  } catch (err) {
    console.error('Fetch error:', err);
    return json({ error: 'Желі қатесі. Кейінірек қайталаңыз.' }, 503);
  }
}
