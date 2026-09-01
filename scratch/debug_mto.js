import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super-secret-jwt-token-with-32-chars';

const tokenAnglo = jwt.sign(
  { sub: 'CRISTIANLUKECABELLO', tenant_id: '11111111-1111-1111-1111-111111111111', perm: 'sync', scope: 'excel_sync', rol: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const BASE = 'http://127.0.0.1:3080';

async function run() {
  const mtoRes = await fetch(`${BASE}/api/piping/mto?id_proyecto=LB-2026`, {
    headers: { Authorization: `Bearer ${tokenAnglo}` }
  });
  console.log('MTO STATUS:', mtoRes.status);
  console.log('MTO BODY:', JSON.stringify(await mtoRes.json(), null, 2));
}

run().catch(console.error);
