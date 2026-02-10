const fs = require('fs');
const file = process.argv[2];
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div/g) || []).length;
    balance += opens - closes;
    if (i > 4400 && i < 4600 || i > 9100) {
        console.log(`${i + 1}: ${balance} ( +${opens} -${closes} ) | ${line.trim().substring(0, 50)}`);
    } else if (opens !== closes && i > 7900 && i < 9180) {
        console.log(`${i + 1}: ${balance} ( +${opens} -${closes} ) | ${line.trim().substring(0, 50)}`);
    }
}
