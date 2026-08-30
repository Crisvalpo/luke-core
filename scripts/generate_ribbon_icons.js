import fs from 'fs';
import path from 'path';

const ICONS = {
  // --- GRUPO 1: PROYECTO ---
  ProyectoActivo: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="20" width="48" height="36" rx="6" fill="#1E293B" stroke="#38BDF8" stroke-width="3"/>
      <path d="M22 20V14C22 11.7909 23.7909 10 26 10H38C40.2091 10 42 11.7909 42 14V20" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="38" r="8" fill="#0284C7" stroke="#BAE6FD" stroke-width="2"/>
      <path d="M32 30V46M24 38H40" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M12 28L52 28" stroke="#0EA5E9" stroke-width="1.5" stroke-dasharray="3 3"/>
    </svg>
  `,
  ActualizarProyecto: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="10" y="14" width="44" height="40" rx="6" fill="#1E293B" stroke="#64748B" stroke-width="2.5"/>
      <path d="M32 20C38.6274 20 44 25.3726 44 32C44 38.6274 38.6274 44 32 44C26.5 44 21.8 40.3 20.4 35" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M16 35H22V29" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="32" r="4" fill="#0284C7"/>
    </svg>
  `,
  CambiarProyecto: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="6" y="12" width="22" height="18" rx="4" fill="#1E293B" stroke="#38BDF8" stroke-width="2.5"/>
      <rect x="36" y="34" width="22" height="18" rx="4" fill="#1E293B" stroke="#10B981" stroke-width="2.5"/>
      <path d="M28 21H47V34" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M43 30L47 34L51 30" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M36 43H17V30" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21 34L17 30L13 34" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  // --- GRUPO 2: SINCRONIZACION ---
  PublicarCambios: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <path d="M16 42C12 42 8 38.5 8 34C8 30 11 26.5 15 26.1C16.5 19 22.5 14 30 14C38 14 44.5 19.5 45.8 27C50 27.5 54 31 54 35.5C54 40.5 50 44 45 44H38" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M32 54V30M32 30L24 38M32 30L40 38" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  ActualizarNube: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <path d="M16 40C12 40 8 36.5 8 32C8 28 11 24.5 15 24.1C16.5 17 22.5 12 30 12C38 12 44.5 17.5 45.8 25C50 25.5 54 29 54 33.5C54 38.5 50 42 45 42H38" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M32 26V50M32 50L24 42M32 50L40 42" stroke="#0EA5E9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  EstadoSync: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="24" fill="#064E3B" stroke="#10B981" stroke-width="3.5"/>
      <path d="M20 33L28 41L44 23" stroke="#34D399" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="32" r="20" stroke="#059669" stroke-width="1.5" stroke-dasharray="4 2"/>
    </svg>
  `,
  Historial: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="10" width="40" height="46" rx="5" fill="#1E293B" stroke="#64748B" stroke-width="3"/>
      <path d="M22 22H42M22 30H36M22 38H42" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="44" cy="44" r="12" fill="#0F172A" stroke="#F59E0B" stroke-width="2.5"/>
      <path d="M44 38V44L48 46" stroke="#FBBF24" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,
  AuditoriaColumnas: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="12" width="48" height="40" rx="4" fill="#1E293B" stroke="#38BDF8" stroke-width="2.5"/>
      <path d="M22 12V52M36 12V52" stroke="#64748B" stroke-width="2"/>
      <path d="M8 24H56M8 38H56" stroke="#475569" stroke-width="1.5"/>
      <circle cx="46" cy="42" r="10" fill="#0F172A" stroke="#F59E0B" stroke-width="2"/>
      <circle cx="46" cy="42" r="4" stroke="#FCD34D" stroke-width="1.5"/>
    </svg>
  `,

  // --- GRUPO 3: INGENIERIA ---
  PID: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="10" width="48" height="44" rx="4" fill="#1E293B" stroke="#38BDF8" stroke-width="2.5"/>
      <circle cx="22" cy="24" r="7" fill="#0284C7" stroke="#BAE6FD" stroke-width="2"/>
      <rect x="38" y="34" width="14" height="14" rx="2" fill="#0369A1" stroke="#BAE6FD" stroke-width="2"/>
      <path d="M22 31V41H38" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
      <path d="M29 24H45V34" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="31,21 35,24 31,27" fill="#38BDF8"/>
    </svg>
  `,
  Lineas: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <path d="M8 20H26C29.3 20 32 22.7 32 26V38C32 41.3 34.7 44 38 44H56" stroke="#0EA5E9" stroke-width="5" stroke-linecap="round"/>
      <circle cx="12" cy="20" r="4" fill="#38BDF8"/>
      <circle cx="52" cy="44" r="4" fill="#38BDF8"/>
      <path d="M32 26V12M32 38V52" stroke="#64748B" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="12" r="3" fill="#94A3B8"/>
      <circle cx="32" cy="52" r="3" fill="#94A3B8"/>
    </svg>
  `,
  Isometricos: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <path d="M32 8L54 20V44L32 56L10 44V20L32 8Z" fill="#1E293B" stroke="#6366F1" stroke-width="2.5"/>
      <path d="M32 8V56M54 20L32 32L10 20" stroke="#818CF8" stroke-width="2.5"/>
      <path d="M20 25L32 32L44 25" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="3.5" fill="#38BDF8"/>
    </svg>
  `,
  Spools: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="6" y="24" width="6" height="16" rx="2" fill="#38BDF8"/>
      <rect x="52" y="24" width="6" height="16" rx="2" fill="#38BDF8"/>
      <path d="M12 32H28C30.2 32 32 30.2 32 28V16M32 48V36C32 33.8 33.8 32 36 32H52" stroke="#0284C7" stroke-width="5" stroke-linecap="round"/>
      <rect x="26" y="10" width="12" height="6" rx="1.5" fill="#38BDF8"/>
      <rect x="26" y="48" width="12" height="6" rx="1.5" fill="#38BDF8"/>
      <circle cx="32" cy="32" r="4" fill="#F59E0B"/>
    </svg>
  `,
  Juntas: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="6" y="24" width="20" height="16" rx="2" fill="#334155" stroke="#64748B" stroke-width="2"/>
      <rect x="38" y="24" width="20" height="16" rx="2" fill="#334155" stroke="#64748B" stroke-width="2"/>
      <ellipse cx="32" cy="32" rx="4" ry="10" fill="#F59E0B" stroke="#FBBF24" stroke-width="2"/>
      <path d="M32 14L32 20M32 44L32 50M22 20L26 24M42 20L38 24" stroke="#FCD34D" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="32,8 34,14 30,14" fill="#F59E0B"/>
    </svg>
  `,

  // --- GRUPO 4: OPERACION ---
  AvanceProyecto: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="12" width="48" height="40" rx="4" fill="#1E293B" stroke="#64748B" stroke-width="2.5"/>
      <path d="M16 42L26 32L36 38L48 22" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="48" cy="22" r="4" fill="#34D399"/>
      <path d="M16 46H48" stroke="#475569" stroke-width="2"/>
    </svg>
  `,
  Calidad: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <path d="M32 8L50 16V30C50 42 42 50 32 56C22 50 14 42 14 30V16L32 8Z" fill="#1E293B" stroke="#10B981" stroke-width="3"/>
      <path d="M24 32L30 38L40 24" stroke="#34D399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  Logistica: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="24" width="28" height="20" rx="2" fill="#1E293B" stroke="#F59E0B" stroke-width="2.5"/>
      <path d="M36 28H48L54 36V44H36V28Z" fill="#1E293B" stroke="#F59E0B" stroke-width="2.5"/>
      <circle cx="18" cy="48" r="5" fill="#0F172A" stroke="#FBBF24" stroke-width="3"/>
      <circle cx="44" cy="48" r="5" fill="#0F172A" stroke="#FBBF24" stroke-width="3"/>
      <path d="M14 30H30" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,
  SDI: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <path d="M12 12H52C54.2 12 56 13.8 56 16V40C56 42.2 54.2 44 52 44H24L12 52V16C12 13.8 13.8 12 16 12Z" fill="#1E293B" stroke="#38BDF8" stroke-width="3"/>
      <path d="M22 24H42M22 32H34" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/>
      <circle cx="44" cy="32" r="3" fill="#F59E0B"/>
    </svg>
  `,

  // --- GRUPO 5: INTELIGENCIA ---
  Dashboard: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="10" width="48" height="44" rx="6" fill="#0F172A" stroke="#38BDF8" stroke-width="3"/>
      <rect x="14" y="28" width="8" height="18" rx="2" fill="#0284C7"/>
      <rect x="28" y="20" width="8" height="26" rx="2" fill="#38BDF8"/>
      <rect x="42" y="16" width="8" height="30" rx="2" fill="#10B981"/>
      <path d="M14 48H50" stroke="#64748B" stroke-width="2"/>
    </svg>
  `,
  BIMViewer: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <path d="M32 6L56 18V42L32 54L8 42V18L32 6Z" fill="#0F172A" stroke="#00D2FF" stroke-width="3"/>
      <path d="M32 6V54M56 18L32 30L8 18" stroke="#38BDF8" stroke-width="2.5"/>
      <circle cx="32" cy="30" r="4" fill="#F59E0B"/>
      <path d="M44 24L44 36M20 24L20 36" stroke="#818CF8" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,
  BotsIA: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="14" y="18" width="36" height="32" rx="8" fill="#1E293B" stroke="#00D2FF" stroke-width="3"/>
      <circle cx="26" cy="32" r="4" fill="#38BDF8"/>
      <circle cx="38" cy="32" r="4" fill="#38BDF8"/>
      <path d="M26 42H38" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>
      <path d="M32 18V10M32 10C30 10 30 6 32 6C34 6 34 10 32 10Z" stroke="#F59E0B" stroke-width="2.5"/>
      <rect x="8" y="28" width="6" height="12" rx="2" fill="#38BDF8"/>
      <rect x="50" y="28" width="6" height="12" rx="2" fill="#38BDF8"/>
    </svg>
  `,

  // --- GRUPO 6: SEGURIDAD ---
  IniciarSesion: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="14" y="26" width="36" height="28" rx="6" fill="#1E293B" stroke="#10B981" stroke-width="3"/>
      <path d="M24 26V18C24 13.5 27.5 10 32 10C36.5 10 40 13.5 40 18V20" stroke="#34D399" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="32" cy="38" r="4" fill="#10B981"/>
      <path d="M32 42V46" stroke="#34D399" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,
  CerrarSesion: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <path d="M28 14H16C13.8 14 12 15.8 12 18V46C12 48.2 13.8 50 16 50H28" stroke="#EF4444" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M38 22L48 32L38 42M48 32H24" stroke="#F87171" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  SolicitarAcceso: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <circle cx="28" cy="22" r="10" fill="#1E293B" stroke="#38BDF8" stroke-width="3"/>
      <path d="M12 50C12 41 18 36 28 36C33 36 38 38 41 42" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
      <circle cx="46" cy="44" r="10" fill="#064E3B" stroke="#10B981" stroke-width="2.5"/>
      <path d="M42 44L45 47L51 41" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,

  // --- LOGO PRINCIPAL ---
  LukeAppRibbonLogo: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#0B1329" stroke="#00D2FF" stroke-width="3"/>
      <path d="M20 18V44H38" stroke="#00D2FF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="42" cy="24" r="5" fill="#F59E0B"/>
      <path d="M32 30L44 42" stroke="#10B981" stroke-width="4" stroke-linecap="round"/>
      <circle cx="44" cy="42" r="3" fill="#34D399"/>
    </svg>
  `
};

const baseDir = 'C:\\Github\\Core\\assets\\ribbon';
const svgDir = path.join(baseDir, 'svg');

if (!fs.existsSync(svgDir)) {
  fs.mkdirSync(svgDir, { recursive: true });
}

console.log('Generando SVGs corporativos de LukeApp...');

for (const [name, svgContent] of Object.entries(ICONS)) {
  const filePath = path.join(svgDir, `${name}.svg`);
  fs.writeFileSync(filePath, svgContent.trim(), 'utf-8');
  console.log(`✓ ${name}.svg guardado.`);
}

console.log('Todos los SVGs generados correctamente en:', svgDir);
