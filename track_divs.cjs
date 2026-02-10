const fs = require('fs');
const content = fs.readFileSync('/Users/Angel/Downloads/grupo-magno-inmobiliario 2/screens/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

const startLine = 7910;
const endLine = 9140;

let divBalance = 0;
let stack = [];

for (let i = startLine - 1; i < endLine; i++) {
    const line = lines[i];

    // Find all tags
    const tags = line.match(/<(div[ >]|\/div>)/g) || [];

    for (const tag of tags) {
        if (tag.startsWith('<div')) {
            // Check if self-closing in the full line (approximation)
            const tagIndex = line.indexOf(tag);
            const remaining = line.substring(tagIndex);
            if (remaining.match(/<div[^>]*\/>/)) {
                continue;
            }
            divBalance++;
            stack.push(i + 1);
        } else if (tag === '</div>') {
            divBalance--;
            stack.pop();
        }
    }

    if (divBalance > 10) { // arbitrary threshold to see growth
        // console.log(`line ${i+1}: ${divBalance}`);
    }
}

console.log(`Final Balance: ${divBalance}`);
console.log('Unclosed divs opened at lines:');
console.log(stack.join(', '));
