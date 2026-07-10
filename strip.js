const fs = require('fs');
const { globSync } = require('glob');
const strip = require('strip-comments');

const files = [
    ...globSync('server/**/*.js', { ignore: 'server/node_modules/**' }),
    ...globSync('client/src/**/*.js', { ignore: 'client/node_modules/**' }),
    ...globSync('client/src/**/*.jsx', { ignore: 'client/node_modules/**' })
];

let count = 0;
for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const stripped = strip(content);
    if (content !== stripped) {
        fs.writeFileSync(file, stripped, 'utf8');
        count++;
        console.log(`Stripped comments from: ${file}`);
    }
}

console.log(`\nFinished stripping comments from ${count} files.`);
