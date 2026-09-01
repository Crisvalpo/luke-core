import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super-secret-jwt-token-with-32-chars';

const tokenAnglo = jwt.sign(
  { sub: 'CRISTIANLUKECABELLO', tenant_id: '11111111-1111-1111-1111-111111111111', role: 'administrador' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const BASE = 'http://127.0.0.1:3080';

async function run() {
  const cfgRes = await fetch(`${BASE}/api/piping/config?id_proyecto=LB-2026`, {
    headers: { Authorization: `Bearer ${tokenAnglo}` }
  });
  console.log('CONFIG STATUS:', cfgRes.status);
  console.log('CONFIG BODY:', JSON.stringify(await cfgRes.json(), null, 2));

  const linesRes = await fetch(`${BASE}/api/piping/lineas?id_proyecto=LB-2026`, {
    headers: { Authorization: `Bearer ${tokenAnglo}` }
  });
  console.log('LINES STATUS:', linesRes.status);
  console.log('LINES BODY:', JSON.stringify(await linesRes.json(), null, 2));
}

run().catch(console.error);
