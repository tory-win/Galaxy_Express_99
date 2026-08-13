FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY agents/package.json ./agents/package.json
RUN pnpm install --frozen-lockfile
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
ARG VITE_BASE_PATH=./
ENV VITE_BASE_PATH=$VITE_BASE_PATH
RUN pnpm build

FROM nginx:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 CMD wget -q -O - http://127.0.0.1/healthz || exit 1
