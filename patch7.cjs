const fs = require('fs');
let code = fs.readFileSync('src/components/ViewRouteMapScreen.tsx', 'utf8');

code = code.replace(
  'import { parseDurationMinutes } from "../utils/routeUtils";',
  'import { parseDurationMinutes, generateGoogleMapsUrl } from "../utils/routeUtils";\\nimport { MapPin } from "lucide-react";'
);

const startComponent = code.indexOf('export default function ViewRouteMapScreen(');
const afterProps = code.indexOf('}: ViewRouteMapScreenProps) {', startComponent) + '}: ViewRouteMapScreenProps) {'.length;

const newStates = `
  const [showStartPrompt, setShowStartPrompt] = useState(false);
`;

code = code.slice(0, afterProps) + newStates + code.slice(afterProps);

code = code.replace(
  'onClick={() => onNavigate(ScreenId.ActiveRoute)}',
  'onClick={() => setShowStartPrompt(true)}'
);

const endDiv = code.lastIndexOf('</div>');
const popupCode = `
      {showStartPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <Navigation2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Iniciar Viagem</h3>
              <p className="text-sm text-slate-500">
                Onde você deseja acompanhar a sua rota e paradas ao longo da viagem?
              </p>
              
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowStartPrompt(false);
                    onNavigate(ScreenId.ActiveRoute);
                  }}
                  className="w-full bg-blue-950 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider"
                >
                  Seguir no Smart Line
                </button>
                <button
                  onClick={() => {
                    setShowStartPrompt(false);
                    const url = generateGoogleMapsUrl(originCoords, destCoords, appointment?.customStops || []);
                    if (url) window.open(url, '_blank');
                  }}
                  className="w-full bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Ir para Google Maps
                </button>
                <button
                  onClick={() => setShowStartPrompt(false)}
                  className="w-full bg-white border border-slate-200 text-slate-400 font-bold py-3 rounded-xl text-xs uppercase tracking-wider mt-1"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
`;

// Insert just before the last two closing </div>s
const lastClosingDiv = code.lastIndexOf('</div>');
const secondLastClosingDiv = code.lastIndexOf('</div>', lastClosingDiv - 1);

code = code.slice(0, secondLastClosingDiv + 6) + popupCode + code.slice(secondLastClosingDiv + 6);

fs.writeFileSync('src/components/ViewRouteMapScreen.tsx', code);
