const fs = require('fs');
let code = fs.readFileSync('src/components/ViewRouteMapScreen.tsx', 'utf8');

code = code.replace(
  'import { parseDurationMinutes, generateGoogleMapsUrl } from "../utils/routeUtils";\\nimport { MapPin } from "lucide-react";',
  'import { parseDurationMinutes, generateGoogleMapsUrl } from "../utils/routeUtils";\nimport { MapPin } from "lucide-react";'
);

fs.writeFileSync('src/components/ViewRouteMapScreen.tsx', code);
