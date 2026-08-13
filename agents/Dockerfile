FROM node:22-alpine
WORKDIR /app
COPY agents/package.json ./agents/package.json
COPY agents/src ./agents/src
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "agents/src/index.js"]

