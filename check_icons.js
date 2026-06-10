const fs = require('fs');
const path = require('path');
const lucide = require('lucide-react');

const dir = path.join(__dirname, 'src', 'components');
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.jsx')) {
        const code = fs.readFileSync(path.join(dir, file), 'utf8');
        const match = code.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/);
        if (match) {
            const imports = match[1].split(',').map(i => i.trim().split(' as ')[0].trim());
            imports.forEach(i => {
                if (i && typeof lucide[i] === 'undefined') {
                    console.log(`ERROR: Component ${file} imports undefined icon: ${i}`);
                }
            });
        }
    }
});
