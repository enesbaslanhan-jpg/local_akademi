const fs = require('fs');
let code = fs.readFileSync('frontend/src/router/index.jsx', 'utf8');

const imports = `
const PracticalCardList = lazy(() => import('@/pages/practical-cards/PracticalCardList'))
const PracticalCardDetail = lazy(() => import('@/pages/practical-cards/PracticalCardDetail'))
const SavedPracticalCards = lazy(() => import('@/pages/practical-cards/SavedPracticalCards'))
`;

code = code.replace(
  /const AuthPage = lazy\(\(\) => import\('@\/pages\/AuthPage'\)\)/,
  imports + 'const AuthPage = lazy(() => import(\'@/pages/AuthPage\'))'
);

const routes = `
          {
            import.meta.env.VITE_FF_PRACTICAL_CARDS === 'true' && (
              <Route path="practical-cards">
                <Route index element={<PracticalCardList />} />
                <Route path="saved" element={<SavedPracticalCards />} />
                <Route path=":code" element={<PracticalCardDetail />} />
              </Route>
            )
          }
`;

code = code.replace(
  /<Route path="knowledge">/,
  routes + '          <Route path="knowledge">'
);

fs.writeFileSync('frontend/src/router/index.jsx', code);
