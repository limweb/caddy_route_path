# caddy_route_path

Gateway กลางสำหรับรวมทุก app ให้เข้าผ่าน **domain เดียว** ด้วย path แทน subdomain
เช่น `admin.xxxx.com` → `xxxx.com/admin`

```
user → https://xxxx.com ──► [ Caddy container ]
                              ├─ /            → Vue portal (หน้า launcher)
                              ├─ /admin/*     → strip prefix → admin:3000
                              ├─ /pos/*       → strip prefix → pos:3000 (LB อัตโนมัติ)
                              └─ /account/*   → strip prefix → account:3000
                                      │
                          docker network: "proxy-network" (shared)
```

TLS ถูก terminate ที่ external proxy (nginx-proxy ฯลฯ) บน `proxy-network`
ผ่าน labels `virtual.host`/`virtual.port`/`virtual.tls-email` — Caddy จึง serve
HTTP อย่างเดียวที่ port 80 (`auto_https off` ใน Caddyfile)

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `Dockerfile` | multi-stage: build portal (Vite) → image `caddy:2` + static files |
| `Caddyfile` | route path → upstream, TLS อัตโนมัติ, subdomain เดิมช่วง migrate |
| `docker-compose.yml` | service `gateway` บน external network `proxy-network` |
| `portal/` | Vue 3 launcher page — แก้รายการ app ได้ที่ `portal/src/apps.json` |
| `examples/` | demo apps (whoami) สำหรับทดสอบ routing |

## Quick start

```bash
# ตั้งค่า domain/upstream — copy แล้วแก้ใน .env
cp .env.example .env            # Windows: copy .env.example .env

docker compose up -d --build
```

### ทดสอบกับ demo apps

```bash
docker compose up -d --build                              # up gateway ก่อน
docker compose -f examples/docker-compose.demo.yml up -d  # up demo apps

# https://testpath.shopsthai.com/      → หน้า portal
# https://testpath.shopsthai.com/pos/  → refresh หลายครั้ง เห็น hostname หมุนเวียน (3 replicas)
```

## ให้ app เดิม join เข้ามา

แต่ละ app ยังมี `docker-compose.yml` ของตัวเอง แค่ให้ join `proxy-network`
(service name ใช้เป็น DNS alias ได้เลย ไม่ต้องตั้ง aliases เพิ่ม):

```yaml
services:
  pos:
    # ไม่ต้อง bind ports: — Caddy เรียกผ่าน network โดยตรง
    deploy:
      replicas: 3            # scale เดิม — Caddy load balance ให้ผ่าน Docker DNS

networks:
  default:
    external: true
    name: proxy-network
```

แล้วตั้ง upstream ให้ตรง port ที่ app ฟัง (default `:3000`) ใน `.env` เช่น
`POS_UPSTREAM=pos:8080`

## ประเด็นสำคัญ: base path

`handle_path` จะ **strip prefix** ก่อนส่งต่อ → app เห็น request เป็น `/` เหมือนเดิม
แต่ถ้า HTML ของ app อ้าง asset แบบ absolute (`/assets/app.js`) มันจะวิ่งไปที่
portal แทน แก้ได้หลายระดับ (เลือกอันที่ app รองรับ):

1. **ตั้ง base path ใน app** — Vite `base: '/admin/'`, backend `ROOT_URL`/`urlPrefix`
   แล้วเปลี่ยน `handle_path` → `handle` ใน Caddyfile (ไม่ strip)
2. **SPA ที่แก้ได้นิดหน่อย** — ตั้ง `base: './'` ให้ asset เป็น relative ทำงานได้ทุก path
3. **แก้ app ไม่ได้เลย** — build Caddy เองพร้อม plugin `replace-response`
   (ดู comment ใน `Dockerfile`) แล้ว rewrite `href/src` + `Location` + `Set-Cookie`
4. **Fallback** — เก็บ subdomain เดิมไว้ (มีอยู่แล้วใน Caddyfile) แล้วให้ portal
   ลิงก์ไป subdomain ชั่วคราว

## Sticky session (ถ้า app เก็บ session ใน memory)

เพิ่มใน block `reverse_proxy` ของ app นั้นใน Caddyfile:

```
lb_policy cookie
```

แนวทางที่ดีกว่าระยะยาวคือย้าย session ไป Redis/shared store

## Phase 2: SSO

path-based ทำให้ทุก app อยู่ domain เดียวกัน → cookie `Path=/` ใช้ร่วมกันได้
แนะนำใส่ IdP (Authentik/Authelia) + Caddy `forward_auth` ดักทุก path —
user login ครั้งเดียวเข้าได้ทุก app โดย app อ่าน user จาก header `X-Forwarded-User`

## ข้อควรระวัง

- Caddy ไม่ได้ถือ port 80/443 ของ host ตรง ๆ — external proxy forward มาที่
  container port 80 ผ่าน `virtual.port` label → ห้ามลบ `auto_https off` ถ้า
  TLS ยังอยู่ที่ proxy ข้างนอก (ไม่งั้นเกิด redirect loop)
- ถ้าจะให้ Caddy ถือ TLS เอง ให้ uncomment `ports:` ใน compose, ลบ
  `auto_https off`, และเอา label `virtual.*` ออก
- `deploy.replicas` ใช้ได้กับ `docker compose up` ใน Compose v2 — service name
  จะ resolve เป็น IP ของทุก replica ผ่าน DNS round-robin
- WebSocket/SSE ทำงานผ่าน `reverse_proxy` อัตโนมัติ แต่ถ้า app ผูก WS path แบบ
  absolute ต้องเพิ่ม route เฉพาะใน Caddyfile
