const fs = require('fs');
let code = fs.readFileSync('src/components/ActiveRouteScreen.tsx', 'utf8');

code = code.replace(
  'Tempo Restante: <span className="text-slate-800">{String(remainingHours).padStart(2, "0")}:{String(remainingMinutes).padStart(2, "0")}</span>',
  'Tempo Restante: <span className="text-slate-800">{String(remainingHours).padStart(2, "0")}:{String(remainingMinutes).padStart(2, "0")}</span> <span className="text-[9px] text-slate-400 font-normal">(hh:mm restantes)</span>'
);

fs.writeFileSync('src/components/ActiveRouteScreen.tsx', code);
