const fs = require('fs');
let code = fs.readFileSync('src/services/conversation.ts', 'utf8');

// 1. Add feature flag constant
code = code.replace(
  "const MAX_TITLE_LENGTH = 120",
  "const IS_CONTEXTUAL_MENTOR_ENABLED = process.env.FEATURE_CONTEXTUAL_MENTOR_ENABLED === 'true'\n\nconst MAX_TITLE_LENGTH = 120"
);

// 2. In fastify.post('/')
code = code.replace(
  "let contextSnapshot: string | null = null\n      if (context) {",
  "let contextSnapshot: string | null = null\n      if (context && IS_CONTEXTUAL_MENTOR_ENABLED) {"
);

// 3. In fastify.post('/:id/messages') and streamMessage
code = code.replaceAll(
  "const { message, knowledgeObjectCode: rawCode, contextOverride } = request.body as { message: string; knowledgeObjectCode?: string; contextOverride?: MentorContextEnvelope }",
  "const { message, knowledgeObjectCode: rawCode, contextOverride: rawContextOverride } = request.body as { message: string; knowledgeObjectCode?: string; contextOverride?: MentorContextEnvelope }\n      const contextOverride = IS_CONTEXTUAL_MENTOR_ENABLED ? rawContextOverride : undefined"
);

// 4. In buildContext and regenerate (for snapshot processing)
code = code.replaceAll(
  "if (contextData) {",
  "if (contextData && IS_CONTEXTUAL_MENTOR_ENABLED) {"
);

// 5. In editAndRegenerate
code = code.replace(
  "if (conv.contextSnapshot) {",
  "if (conv.contextSnapshot && IS_CONTEXTUAL_MENTOR_ENABLED) {"
);

fs.writeFileSync('src/services/conversation.ts', code);
console.log('Done');
