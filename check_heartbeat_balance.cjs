const fs = require('fs');
const content = fs.readFileSync('/Users/Angel/Downloads/grupo-magno-inmobiliario 2/screens/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

const START = 8291;
const END = 8414;

let curly = 0;
let paren = 0;

for (let i = START - 1; i < END; i++) {
    const line = lines[i];
    const cOpen = (line.match(/{/g) || []).length;
    const cClose = (line.match(/}/g) || []).length;
    const pOpen = (line.match(/\(/g) || []).length;
    const pClose = (line.match(/\)/g) || []).length;

    curly += cOpen - cClose;
    paren += pOpen - pClose;

    if (cOpen !== 0 || cClose !== 0 || pOpen !== 0 || pClose !== 0) {
        console.log(`Line ${i + 1}: ${line.trim()} | Curly: ${curly}, Paren: ${paren}`);
    }
}

console.log('Final local balance for heartbeat:', { curly, paren });
