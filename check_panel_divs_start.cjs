const fs = require('fs');
const content = fs.readFileSync('/Users/Angel/Downloads/grupo-magno-inmobiliario 2/screens/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

const START = 8140;
const END = 9575;

let balance = 0;
for (let i = START - 1; i < END; i++) {
    const line = lines[i];
    const opens = (line.match(/<div(?!\s*\/>)/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    balance += opens - closes;
    if (opens !== 0 || closes !== 0) {
        console.log(`Line ${i + 1}: ${line.trim()} | Balance: ${balance}`);
    }
}

console.log('Final balance for Lead Management Panel:', balance);
