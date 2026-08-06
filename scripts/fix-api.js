const fs = require('fs');
let content = fs.readFileSync('frontend/src/services/api.js', 'utf8');

// The replacement tool duplicated the quizzes block. I will just split by 'quizzes: {' and rebuild it.
const parts = content.split('quizzes: {');
if (parts.length > 2) {
  const correctPrefix = parts[0];
  const lastPart = parts[parts.length - 1]; // This contains practicalCards because it was added after quizzes
  
  const finalCode = correctPrefix + 'quizzes: {' + lastPart;
  fs.writeFileSync('frontend/src/services/api.js', finalCode);
}
