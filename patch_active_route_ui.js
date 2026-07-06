const fs = require('fs');
let code = fs.readFileSync('src/components/ActiveRouteScreen.tsx', 'utf8');

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

code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/ActiveRouteScreen.tsx', code);
