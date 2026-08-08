FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# Install all workspace dependencies
COPY package*.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/ 2>/dev/null || true
RUN npm install

# Build shared package
COPY shared/tsconfig.json shared/
COPY shared/src shared/src
RUN npm run build --workspace=@school-mgmt/shared

# Build backend
COPY backend/tsconfig.json backend/
COPY backend/src backend/src
COPY backend/prisma backend/prisma
WORKDIR /app/backend
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/package.json ./backend/

WORKDIR /app/backend
EXPOSE 4000

CMD ["sh", "-c", "npx prisma generate && node dist/index.js"]