const cards = require('../reports/cards-full.json');
for (const c of cards) {
  const published = c.published;
  const numKo = c.knowledgeObjects.length;
  const demoKo = c.knowledgeObjects.filter(ko => ko.knowledgeObject.isDemo).length;
  const unpublishedKo = c.knowledgeObjects.filter(ko => ko.knowledgeObject.status !== 'published').length;
  console.log(`${c.code}: published=${published}, ko=${numKo}, demo=${demoKo}, unpubKo=${unpublishedKo}`);
}
