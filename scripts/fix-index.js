const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');

// Insert import
code = code.replace(
  /import \{ adminRoutes \} from '.\/services\/admin'/,
  `import { adminRoutes } from './services/admin'\nimport { practicalCardRoutes } from './services/practical-cards'`
);

// Register route
code = code.replace(
  /server\.register\(decisionCheckRoutes, \{ prefix: '\/api\/v1\/decision-checks' \}\)/,
  `server.register(decisionCheckRoutes, { prefix: '/api/v1/decision-checks' })\n  server.register(practicalCardRoutes, { prefix: '/api/v1/practical-cards' })`
);

fs.writeFileSync('src/index.ts', code);
