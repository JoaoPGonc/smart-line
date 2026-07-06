import fs from 'fs';

let code = fs.readFileSync('src/components/MapComponent.tsx', 'utf8');

if (!code.includes('import { getStopsForRoute }')) {
  code = code.replace(
    'import L from "leaflet";',
    'import L from "leaflet";\nimport { getStopsForRoute } from "../utils/routeUtils";'
  );
}

const target = `      const stopConfigs = [
        { name: isDefaultRoute ? "Posto Gigante II" : "Posto Rota 1", desc: "Restaurante & Diesel S10", label: "1", fraction: 0.28 },
        { name: isDefaultRoute ? "Posto PRF 104" : "Ponto de Apoio PRF", desc: "Base de Segurança", label: "2", fraction: 0.70 },
        { name: isDefaultRoute ? "Parada do Pátio" : "Parada Oásis", desc: "Alimentação Rápida", label: "3", fraction: 0.90 }
      ];`;

const replacement = `      const generatedStops = getStopsForRoute(endCoords.name || "", () => "");
      
      const defaultFractions = [0.28, 0.70, 0.90];
      const stopConfigs = generatedStops.map((stop, i) => ({
        name: stop.title,
        desc: stop.desc,
        label: (i + 1).toString(),
        fraction: defaultFractions[i] || ((i + 1) / (generatedStops.length + 1))
      }));`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/MapComponent.tsx', code);
