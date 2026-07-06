import fs from 'fs';

let code = fs.readFileSync('src/components/ActiveRouteScreen.tsx', 'utf8');

const target1 = `  // Determine which stop is active based on progress
  const getActiveStopIndex = () => {
    if (progress < 0.28) return 0;
    if (progress < 0.70) return 1;
    if (progress < 0.90) return 2;
    return 3;
  };
  const activeStopIndex = getActiveStopIndex();`;

const replacement1 = `  // Determine which stop is active based on checked stops
  const durMins = parseDurationMinutes(appointment?.estimatedDuration || "4h 35m");
  const stops = getStopsForRoute(appointment?.destination || "Porto de Tubarão", (percent) => computeStopTime(appointment?.time || "11:30", durMins, percent));

  const nextUncheckedStopIndex = checkedStops.findIndex(c => !c);
  const activeStopIndex = nextUncheckedStopIndex !== -1 && nextUncheckedStopIndex < stops.length ? nextUncheckedStopIndex : stops.length;

  const getNextStopTitle = () => {
    if (activeStopIndex < stops.length) {
      return \`Parada \${activeStopIndex + 1}: \${stops[activeStopIndex].title}\`;
    }
    return \`Destino Final: \${appointment?.destination?.split(",")[0] || "Porto"}\`;
  };

  const getNextStopDesc = () => {
    if (activeStopIndex < stops.length) {
      return stops[activeStopIndex].desc;
    }
    return "Sua carga está pronta para descarregar.";
  };`;

const target2 = `            <h4 className="text-xs font-black text-white uppercase tracking-wider mt-0.5 truncate">
              {activeStopIndex === 0 && "Parada 1: Posto Gigante II"}
              {activeStopIndex === 1 && "Parada 2: Posto PRF 104"}
              {activeStopIndex === 2 && "Parada 3: Parada do Pátio"}
              {activeStopIndex >= 3 && "Destino Final: Porto de Tubarão"}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {activeStopIndex === 0 && "Restaurante completo, estacionamento de carga e combustíveis."}
              {activeStopIndex === 1 && "Base de Apoio da PRF - Ponto seguro de parada."}
              {activeStopIndex === 2 && "Triagem de apoio e alimentação rápida antes do porto."}
              {activeStopIndex >= 3 && "Sua carga está pronta para descarregar."}
            </p>`;

const replacement2 = `            <h4 className="text-xs font-black text-white uppercase tracking-wider mt-0.5 truncate">
              {getNextStopTitle()}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {getNextStopDesc()}
            </p>`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/ActiveRouteScreen.tsx', code);
