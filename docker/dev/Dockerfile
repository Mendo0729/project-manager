FROM node:24-alpine

WORKDIR /workspace

RUN corepack enable \
    && corepack prepare pnpm@10.15.0 --activate \
    && pnpm config set store-dir /pnpm/store

EXPOSE 3000 5173

CMD ["sh", "-c", "pnpm install && pnpm dev"]
