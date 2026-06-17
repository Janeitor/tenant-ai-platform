FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/client-demo/package.json apps/client-demo/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY . .

RUN npm run build --workspace @tenant-ai/client-demo


FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json package-lock.json ./
COPY apps/client-demo/package.json apps/client-demo/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --omit=dev --workspace @tenant-ai/client-demo --include-workspace-root

COPY --from=builder /app/apps/client-demo ./apps/client-demo

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace", "@tenant-ai/client-demo"]
