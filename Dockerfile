# ---------- Stage 1: build Vue portal ----------
FROM node:20-alpine AS portal-build
WORKDIR /app
COPY portal/package*.json ./
RUN npm ci
COPY portal/ .
RUN npm run build

# ---------- Stage 2: Caddy + portal static files ----------
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=portal-build /app/dist /srv/portal

# ถ้ามี app ที่ตั้ง base path ไม่ได้จริง ๆ ให้เปลี่ยน stage 2 เป็น build เองด้วย xcaddy:
# FROM caddy:2-builder AS caddy-build
# RUN xcaddy build --with github.com/caddyserver/replace-response
# FROM caddy:2-alpine
# COPY --from=caddy-build /usr/bin/caddy /usr/bin/caddy
