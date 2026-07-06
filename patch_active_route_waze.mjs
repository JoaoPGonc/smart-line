import fs from 'fs';

let code = fs.readFileSync('src/components/ActiveRouteScreen.tsx', 'utf8');

const target3 = `        nextStop: "Posto Gigante II",`;
const replacement3 = `        nextStop: stops[0]?.title || "Parada 1",`;

const target4 = `        subtext: "Posto Gigante II - Parada obrigatória / recomendada para motoristas.",
        nextStop: "Posto Gigante II",`;
const replacement4 = `        subtext: \`\${stops[0]?.title || "Parada 1"} - Parada obrigatória / recomendada para motoristas.\`,
        nextStop: stops[0]?.title || "Parada 1",`;

const target5 = `        nextStop: "Posto PRF 104",`;
const replacement5 = `        nextStop: stops[1]?.title || "Parada 2",`;

const target6 = `        subtext: "Próxima parada recomendada de segurança: Posto PRF 104.",`;
const replacement6 = `        subtext: \`Próxima parada recomendada de segurança: \${stops[1]?.title || "Parada 2"}.\`,`;

code = code.replace(new RegExp(target3, 'g'), replacement3);
code = code.replace(new RegExp(target4, 'g'), replacement4);
code = code.replace(new RegExp(target5, 'g'), replacement5);
code = code.replace(new RegExp(target6, 'g'), replacement6);

fs.writeFileSync('src/components/ActiveRouteScreen.tsx', code);
