const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  '.dark-mode-container .bg-blue-50,.dark-mode-container .bg-slate-100\\\\/70,.dark-mode-container .bg-slate-100',
  '.dark-mode-container .bg-blue-50,.dark-mode-container .bg-blue-100\\\\/70,.dark-mode-container .bg-slate-100\\\\/70,.dark-mode-container .bg-slate-100'
);

fs.writeFileSync('src/index.css', css);
