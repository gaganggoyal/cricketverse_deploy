# node:20-slim (glibc), not alpine: npm installs Next.js' glibc SWC compiler
# binary, which fails to load on alpine's musl libc.
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle AT BUILD TIME —
# passing them at container runtime does nothing. docker-compose.prod.yml
# forwards them from .env as build args.
# Database credentials are deliberately NOT build args: they are read at
# runtime by server-only code, and a NEXT_PUBLIC_* database key is exactly
# the pattern this migration removed.
ARG NEXT_PUBLIC_SIM_URL
ARG NEXT_PUBLIC_MP_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADSENSE_SLOT
ENV NEXT_PUBLIC_SIM_URL=$NEXT_PUBLIC_SIM_URL \
    NEXT_PUBLIC_MP_URL=$NEXT_PUBLIC_MP_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT \
    NEXT_PUBLIC_ADSENSE_SLOT=$NEXT_PUBLIC_ADSENSE_SLOT
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
