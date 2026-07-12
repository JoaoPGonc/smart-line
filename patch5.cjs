const fs = require('fs');
let code = fs.readFileSync('src/components/ActiveRouteScreen.tsx', 'utf8');

code = code.replace(
  'Destino Final: <span className="text-slate-800">{String(remainingHours).padStart(2, "0")}:{String(remainingMinutes).padStart(2, "0")}</span>',
  'Tempo Restante: <span className="text-slate-800">{String(remainingHours).padStart(2, "0")}:{String(remainingMinutes).padStart(2, "0")}</span>'
);

fs.writeFileSync('src/components/ActiveRouteScreen.tsx', code);
