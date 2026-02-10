const fs = require('fs');
const content = fs.readFileSync('/Users/Angel/Downloads/grupo-magno-inmobiliario 2/screens/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

const blocks = [
    { start: 8077, end: 8124, name: 'Cerrador Appointment' },
    { start: 8126, end: 8193, name: 'Investigation Paid' },
    { start: 8195, end: 8225, name: 'Investigating' },
    { start: 8227, end: 8240, name: 'Investigation Passed' },
    { start: 8242, end: 8263, name: 'Ready to Close' },
    { start: 8265, end: 8276, name: 'Closed Won' }
];

for (const block of blocks) {
    let bal = 0;
    for (let i = block.start - 1; i < block.end; i++) {
        const line = lines[i];
        const opens = (line.match(/<div[ >]/g) || []).length;
        const closes = (line.match(/<\/div>/g) || []).length;
        const selfCloses = (line.match(/<div[^>]*\/>/g) || []).length;
        bal += (opens - selfCloses - closes);
    }
    console.log(`${block.name}: Balance=${bal}`);
}
