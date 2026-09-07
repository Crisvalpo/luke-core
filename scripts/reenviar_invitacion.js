import { supabaseAdmin } from '../dist/config/supabase.js';

async function reenviar() {
  const email = 'paoluke.webapp@gmail.com';
  console.log(`🚀 Iniciando reenvío de invitación para: ${email}`);

  // 1. Intentar invitar nuevamente
  const redirectUrl = `https://app.lukeapp.cl/admin/crear-clave.html?email=${encodeURIComponent(email)}`;
  const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectUrl,
    data: {
      nombre: 'Paola Luke',
      role: 'admin_proyecto',
      tenant_id: 'fd1fe8eb-9229-4c81-a73b-c443bbe2c325'
    }
  });

  console.log('Resultado inviteUserByEmail:', JSON.stringify(inviteResult));

  if (inviteResult.error) {
    console.log('El usuario ya estaba registrado en Supabase Auth, enviando correo de reset/creación de clave...');
    const resetResult = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    console.log('Resultado resetPasswordForEmail:', JSON.stringify(resetResult));
  }

  // 2. Generar el enlace directo por si el usuario lo necesita
  const linkResult = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email,
    options: { redirectTo: redirectUrl }
  });

  if (linkResult.data?.properties?.action_link) {
    console.log('🔗 ENLACE DIRECTO GENERADO:', linkResult.data.properties.action_link);
  }
}

reenviar().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
