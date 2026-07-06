const fs = require('fs');
let code = fs.readFileSync('src/components/ActiveRouteScreen.tsx', 'utf8');

const target = `  // Determine which stop is active based on progress
  const getActiveStopIndex = () => {
    if (progress < 0.28) return 0;
    if (progress < 0.70) return 1;
    if (progress < 0.90) return 2;
    return 3;
  };

  const activeStopIndex = getActiveStopIndex();`;

const replacement = `  // Determine which stop is active based on checked stops
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

code = code.replace(target, replacement);

fs.writeFileSync('src/components/ActiveRouteScreen.tsx', code);
