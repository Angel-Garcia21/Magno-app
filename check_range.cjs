const fs = require('fs');
const content = fs.readFileSync('/Users/Angel/Downloads/grupo-magno-inmobiliario 2/screens/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

const startLine = 7910;
const endLine = 9140;

let divBalance = 0;
let parenBalance = 0;

for (let i = startLine - 1; i < endLine; i++) {
    const line = lines[i];

    // Simple tag counting (avoiding self-closing)
    const opens = (line.match(/<div[ >]/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    const selfCloses = (line.match(/<div[^>]*\/>/g) || []).length;

    divBalance += (opens - selfCloses - closes);

    // Paren counting for expressions
    const pOpens = (line.match(/\(/g) || []).length;
    const pCloses = (line.match(/\)/g) || []).length;
    parenBalance += (pOpens - pCloses);

    if (i === startLine - 1 || i === endLine - 1 || i % 100 === 0) {
        console.log(`Line ${i + 1}: DivBalance=${divBalance}, ParenBalance=${parenBalance}`);
    }
}
console.log('Final Balance at 9140:');
console.log(`DivBalance: ${divBalance}`);
console.log(`ParenBalance: ${parenBalance}`);
