const fs = require('fs');
const content = fs.readFileSync('/Users/Angel/Downloads/grupo-magno-inmobiliario 2/screens/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

const startLine = 8029;
const endLine = 8277;

let bal = 0;
for (let i = startLine - 1; i < endLine; i++) {
    const line = lines[i];
    const opens = (line.match(/<div[ >]/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    const selfCloses = (line.match(/<div[^>]*\/>/g) || []).length;
    bal += (opens - selfCloses - closes);
    console.log(`${i + 1}: ${bal} | ${line.trim()}`);
}
console.log(`Final Balance: ${bal}`);
