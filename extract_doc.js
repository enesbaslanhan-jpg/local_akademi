const mammoth = require('mammoth');

async function extractDocx() {
  const result = await mammoth.extractRawText({ path: 'C:\\Users\\bugrz\\Downloads\\LocalAkademi_Birlesik_Ana_Dokuman.docx' });
  console.log(result.value);
  require('fs').writeFileSync('C:\\Users\\bugrz\\LocalAkademi_extracted\\doc_content.txt', result.value, 'utf8');
}

extractDocx().catch(console.error);