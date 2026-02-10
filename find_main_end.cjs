const fs = require('fs');
const content = fs.readFileSync('/Users/Angel/Downloads/grupo-magno-inmobiliario 2/screens/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

let startLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<main')) {
        startLine = i;
        break;
    }
}

if (startLine === -1) {
    console.error('Start not found');
    process.exit(1);
}

console.log('Start line:', startLine + 1);

let balance = 1;
for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/<main/g) || []).length;
    const closes = (line.match(/<\/main>/g) || []).length;
    balance += opens - closes;
    if (balance === 0) {
        console.log('End line (tag):', i + 1);
        break;
    }
}
