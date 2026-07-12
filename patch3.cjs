const fs = require('fs');
let code = fs.readFileSync('src/components/RouteOverviewScreen.tsx', 'utf8');

code = code.replace(
  'import { parseDurationMinutes } from "../utils/routeUtils";',
  'import { parseDurationMinutes, generateGoogleMapsUrl } from "../utils/routeUtils";'
);

const startComponent = code.indexOf('export default function RouteOverviewScreen(');
const afterProps = code.indexOf('}: RouteOverviewScreenProps) {', startComponent) + '}: RouteOverviewScreenProps) {'.length;

const newStates = `
  const [showStartPrompt, setShowStartPrompt] = useState(false);
`;

code = code.slice(0, afterProps) + newStates + code.slice(afterProps);

const startButtonIndex = code.indexOf('<button\\n          onClick={() => onNavigate(ScreenId.ActiveRoute)}\\n          className="w-full bg-blue-950');

fs.writeFileSync('src/components/RouteOverviewScreen.tsx', code);
