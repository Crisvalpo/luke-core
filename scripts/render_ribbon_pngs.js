import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const baseDir = 'C:\\Github\\Core\\assets\\ribbon';
const svgDir = path.join(baseDir, 'svg');
const dir32 = path.join(baseDir, '32x32');
const dir64 = path.join(baseDir, '64x64');

[dir32, dir64].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const svgFiles = fs.readdirSync(svgDir).filter(f => f.endsWith('.svg'));

console.log(`Renderizando ${svgFiles.length} iconos a PNG 32x32 y 64x64...`);

for (const file of svgFiles) {
  const name = path.basename(file, '.svg');
  const svgPath = path.join(svgDir, file);
  const svgContent = fs.readFileSync(svgPath, 'utf-8');

  // Render 64x64
  const resvg64 = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: 64 },
    background: 'rgba(0,0,0,0)'
  });
  const pngData64 = resvg64.render().asPng();
  fs.writeFileSync(path.join(dir64, `${name}.png`), pngData64);
  fs.writeFileSync(path.join(baseDir, `${name}.png`), pngData64); // En la raíz para RibbonX Editor

  // Render 32x32
  const resvg32 = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: 32 },
    background: 'rgba(0,0,0,0)'
  });
  const pngData32 = resvg32.render().asPng();
  fs.writeFileSync(path.join(dir32, `${name}.png`), pngData32);

  console.log(`✓ ${name}.png (32x32 y 64x64) generado.`);
}

console.log('🎉 Todos los iconos corporativos generados exitosamente.');
