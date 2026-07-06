import fs from 'fs';

let code = fs.readFileSync('src/components/ActiveRouteScreen.tsx', 'utf8');

code = code.replace(
  'subtext: "${stops[0]?.title || "Parada 1"} - Parada obrigatória / recomendada para motoristas.",',
  'subtext: `${stops[0]?.title || "Parada 1"} - Parada obrigatória / recomendada para motoristas.`,'
);

fs.writeFileSync('src/components/ActiveRouteScreen.tsx', code);
