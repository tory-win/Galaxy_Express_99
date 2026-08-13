FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY apps/product-web/package.json ./apps/product-web/package.json
COPY services/product-api/package.json ./services/product-api/package.json

RUN npm install

COPY . .

ENV NODE_ENV=development
