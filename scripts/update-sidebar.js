const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/layout/Sidebar.jsx', 'utf8');

const targetStr = `const learnerLinks = [`;
const insertStr = `\n  ...(import.meta.env.VITE_FF_PRACTICAL_CARDS === 'true' ? [{ id: 'practical-cards', label: 'Pratik Kartlar', icon: Lightbulb, path: '/practical-cards' }] : []),`;

if (!code.includes('practical-cards')) {
    code = code.replace(targetStr, targetStr + insertStr);
    fs.writeFileSync('frontend/src/components/layout/Sidebar.jsx', code);
}
