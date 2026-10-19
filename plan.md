---
agent: devin-local
session: grizzly-dish
created: 2026-10-19T04:02:27Z
---
# Caddy Path-Based Gateway + Vue Portal (รวม subdomain → path)

สร้าง Docker container กลาง (Caddy + Vue portal) ที่ให้ user เข้าทุก app ผ่าน xxxx.com/admin, xxxx.com/pos แทน subdomain โดย app เดิม join shared docker network และรองรับ scaling ของ pos

## สถาปัตยกรรมรวม

```
user → https://xxxx.com ──► [ Caddy container ]
                              ├─ /            → Vue portal (หน้า launcher)
                              ├─ /admin/*     → strip prefix → admin:PORT
                              ├─ /pos/*       → strip prefix → pos:PORT (load balance อัตโนมัติ)
                              └─ /account/*   → strip prefix → account:PORT
                                      │
                          docker network: "gateway" (shared)
                  ┌───────────┬──────────┬──────────────┐
              compose A    compose B   compose C    (project นี้)
               admin       pos (x N)    account
```

- Caddy เป็น edge proxy ตัวเดียว ถือ port 80/443, ทำ TLS อัตโนมัติ
- Docker network `gateway` เป็น shared network — compose ของแต่ละ app เดิม join เข้ามาผ่าน `external: true` พร้อมตั้ง alias ให้ตรงชื่อ host (`admin`, `pos`, `account`)
- Service name resolve ผ่าน Docker DNS round-robin → `pos` ที่ scale หลาย replica จะถูก load balance โดยอัตโนมัติ (เพิ่ม `lb_policy` + health check ได้ใน Caddyfile)
- Vue portal เป็น Vue 3 + Vite app เล็ก ๆ build เป็น static files แล้ว serve ด้วย `file_server` ใน Caddy container เดียวกัน (ไม่ต้องมี container แยก)

## ประเด็นสำคัญที่ต้องตัดสินใจ: base path

ปัญหาหลักของ subdomain → path คือ app ที่เขียนมาให้ serve ที่ `/` เมื่อถูกแปะไว้ใต้ `/admin` จะเรียก asset ผิด (`/assets/app.js` จะวิ่งไปที่ portal แทน) ต้องรองรับหลายระดับ:

1. **ดีที่สุด — app ตั้ง base path ได้**: ตั้ง `base: '/admin/'` (Vite) / `ROOT_URL`, `urlPrefix` (backend) แล้ว Caddy ใช้ `handle_path` strip prefix ส่งให้ app ตามเดิม
2. **SPA ที่แก้ได้นิดหน่อย**: ตั้ง `base: './'` ให้ asset เป็น relative → ทำงานได้ทุก path โดย app ไม่ต้องรู้ prefix
3. **แก้ app ไม่ได้เลย**: ใช้ Caddy plugin `replace-response` (ต้อง build image เองด้วย xcaddy) rewrite `href="/..."` ใน HTML + rewrite `Location` header + `Set-Cookie` path — ทำได้แต่เปราะ ใช้เป็นทางเลือกสุดท้าย
4. **Fallback**: ระหว่าง migrate เก็บ subdomain เดิมไว้ทำงานคู่กัน (Caddy config ทั้ง `admin.xxxx.com` และ `xxxx.com/admin`) — portal ลิงก์ไป path สำหรับ app ที่พร้อม, ไป subdomain สำหรับ app ที่ยังไม่พร้อม

## SSO / shared session

- ข้อดีของ path-based: ทุก app อยู่ domain เดียวกัน → cookie `Path=/` ใช้ร่วมกันได้ทุก app (ต้องให้แต่ละ app อ่าน cookie/token ชุดเดียวกัน)
- **แนวทางแนะนำ (phase 2)**: ใส่ IdP (Authentik หรือ Authelia) + Caddy `forward_auth` ดักทุก path — user login ครั้งเดียวที่หน้า portal แล้วเข้าได้ทุก app; app อ่าน user จาก header (`X-Forwarded-User`) หรือ OIDC token
- Phase 1 ทำ routing + portal ก่อน แล้วค่อยต่อ auth (ต้องรู้ก่อนว่าแต่ละ app รับ header/OIDC ได้ไหม)

## โครงสร้างไฟล์ที่จะสร้าง

```
caddy_route_path/
├── Dockerfile            # multi-stage: node build portal → caddy:2 + dist
├── docker-compose.yml    # service "gateway" + network gateway (external)
├── Caddyfile             # route ทุก path + subdomain เดิม (ช่วง migrate)
├── portal/
│   ├── package.json / vite.config.ts / index.html
│   └── src/{main.ts, App.vue, apps.json}   # tile launcher อ่าน config จาก apps.json
└── README.md             # วิธีให้ compose ของ app เดิม join network gateway
```

### Dockerfile (แนวคิด)
```dockerfile
FROM node:20-alpine AS portal-build
WORKDIR /app
COPY portal/ .
RUN npm ci && npm run build   # ออก /app/dist

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=portal-build /app/dist /srv/portal
# ถ้าจำเป็นต้อง rewrite response → เปลี่ยน base เป็น caddy:builder + xcaddy --with replace-response
```

### Caddyfile (แนวคิด)
```
xxxx.com {
    handle_path /admin/*   { reverse_proxy admin:3000 }
    handle_path /pos/*     { reverse_proxy pos:3000 }
    handle_path /account/* { reverse_proxy account:3000 }
    handle {
        root * /srv/portal
        try_files {path} /index.html   # SPA fallback
        file_server
    }
}
# ช่วง migrate: เก็บ subdomain เดิมไว้
admin.xxxx.com   { reverse_proxy admin:3000 }
pos.xxxx.com     { reverse_proxy pos:3000 }
account.xxxx.com { reverse_proxy account:3000 }
```

### docker-compose.yml (แนวคิด)
```yaml
services:
  gateway:
    build: .
    ports: ["80:80", "443:443"]
    volumes: [caddy_data:/data, caddy_config:/config]
    networks: [gateway]
networks:
  gateway:
    name: gateway          # app อื่น join ผ่าน external: true
volumes: {caddy_data: {}, caddy_config: {}}
```

### ฝั่ง compose ของ app เดิม (เช่น pos)
```yaml
services:
  pos:
    deploy:
      replicas: 3                 # scale เดิม — Caddy LB ให้อัตโนมัติผ่าน DNS round-robin
    networks:
      gateway:
        aliases: [pos]            # host name ที่ Caddy เรียก
    # เอา ports: ออกถ้าไม่ต้องเปิดตรง (Caddy ถือ 80/443 แทน)
networks:
  gateway:
    external: true
```

## ขั้นตอน implement

1. สร้าง `portal/` — Vue 3 + Vite, หน้า launcher อ่านรายการ app จาก `apps.json` (ชื่อ, path, icon, description)
2. สร้าง `Caddyfile`, `Dockerfile`, `docker-compose.yml`, `README.md`
3. เอกสารวิธีให้ compose ของ admin/pos/account join network `gateway` + ตั้ง alias + ตั้ง base path (ถ้า app รองรับ)
4. ทดสอบ local: `docker compose up`, จำลอง app ด้วย `whoami`/static nginx ตรวจ routing + strip prefix + multi-replica LB
5. Phase ถัดไป (ไม่ทำในรอบนี้): SSO ด้วย forward_auth + IdP, ปิด subdomain เดิมเมื่อทุก app migrate เสร็จ

## Risks / ข้อควรระวัง

- **App ที่ตั้ง base path ไม่ได้** คือ risk ใหญ่สุด — ต้องลองทีละตัว; ถ้าเจอ ใช้ replace-response plugin หรือคง subdomain ไว้
- **POS มี in-memory session?** ถ้ามี การ scale + round-robin จะทำ session หลุด → ต้องใช้ `lb_policy cookie` (sticky) หรือย้าย session ไป Redis (ทำให้อยู่แล้วจากการ scale เดิมน่าจะแก้มาแล้ว)
- **WebSocket/SSE** ใน app — `reverse_proxy` รองรับอัตโนมัติ แต่ถ้า app ผูก path WS แบบ absolute ต้องเพิ่ม route เฉพาะ
- **Cookie path** — app ที่ set cookie `Path=/admin` vs `Path=/` อาจชนกันเมื่อทำ SSO; กำหนดมาตรฐาน `Path=/` + prefix ชื่อ cookie
- **Port ชนกัน** — ตอนย้าย, app เดิมที่ bind 80/443 ต้องถอดออกก่อน up Caddy

## Verification

- `docker compose up -d` แล้ว `curl -H "Host: xxxx.com" http://localhost/admin/` ต้องได้ response จาก admin
- `docker compose up -d --scale pos=3` แล้ว curl /pos หลายครั้ง ต้องเห็น hostname หมุนเวียน
- เปิด `/` ได้หน้า portal, SPA refresh ที่ path ลึกไม่ 404
