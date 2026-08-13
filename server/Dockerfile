FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
RUN pnpm install --filter railpool-api --prod --frozen-lockfile
COPY server/src ./server/src
ENV NODE_ENV=production
EXPOSE 8320
CMD ["node", "server/src/index.js"]
