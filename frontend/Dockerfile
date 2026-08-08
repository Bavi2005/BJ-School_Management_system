FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Install all workspace dependencies
COPY package*.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm install

# Build shared package
COPY shared/tsconfig.json shared/
COPY shared/src shared/src
RUN npm run build --workspace=@school-mgmt/shared

# Build frontend
COPY frontend/tsconfig.json frontend/
COPY frontend/next.config.mjs frontend/
COPY frontend/tailwind.config.ts frontend/
COPY frontend/postcss.config.js frontend/
COPY frontend/app frontend/app
COPY frontend/components frontend/components
COPY frontend/lib frontend/lib
COPY frontend/public frontend/public

WORKDIR /app/frontend
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build /app/frontend/.next/standalone/frontend ./
COPY --from=build /app/frontend/.next/static ./.next/static
COPY --from=build /app/frontend/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]