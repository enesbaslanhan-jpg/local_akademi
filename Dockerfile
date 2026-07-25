FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate --schema=./prisma/schema.prisma && npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/public ./dist/public
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN mkdir -p /app/prisma /app/uploads && chown -R node:node /app
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER node

CMD ["./docker-entrypoint.sh"]
