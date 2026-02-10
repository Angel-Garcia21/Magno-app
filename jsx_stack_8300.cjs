const fs = require('fs');
const content = fs.readFileSync('/Users/Angel/Downloads/grupo-magno-inmobiliario 2/screens/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

let tagStack = [];

for (let i = 0; i < 8300; i++) {
    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (char === '<' && i > 4500) {
            // Check for closing tag
            if (line[j + 1] === '/') {
                const tagEnd = line.substring(j + 2).split(/[ >]/)[0];
                if (tagStack.length > 0 && tagStack[tagStack.length - 1].name === tagEnd) {
                    tagStack.pop();
                } else {
                    // Mismatched close
                }
                j += tagEnd.length + 1;
            } else if (/[a-zA-Z]/.test(line[j + 1])) {
                // Check if it's NOT a comment or something else
                const tagFull = line.substring(j).split('>')[0];
                if (!tagFull.includes('!--') && !tagFull.endsWith('/') && !tagFull.includes('/>')) {
                    const tagName = tagFull.substring(1).split(/[ >]/)[0];
                    tagStack.push({ name: tagName, line: i + 1 });
                    j += tagName.length;
                }
            }
        }
    }
}

console.log('Tag Stack at 8300:', tagStack);
