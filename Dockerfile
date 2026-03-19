FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tini

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod

COPY . .

ENV NODE_ENV=production

EXPOSE 7352

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "bin/modelrelay.js"]
