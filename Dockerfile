# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Override Vite's base path. The default `base: '/spendwise/'` in vite.config.ts
# is set for GitHub Pages (suren-khatana.github.io/spendwise/). For Docker we
# serve from the origin root, so assets must be emitted at /assets/... — not
# /spendwise/assets/... — to match nginx's serving directory.
RUN npx tsc -b && npx vite build --base=/

# Production stage — serve static files with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Privacy/security hardening. The app makes zero outbound requests at
    # runtime, so connect-src 'none' is safe and turns any future XSS into a
    # dead-end (no exfiltration possible). 'unsafe-inline' on style-src is
    # needed for Radix/shadcn inline positioning styles.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), interest-cohort=()" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Note: any add_header here would shadow the server-level security
    # headers (nginx does not merge add_header across levels). `expires` uses
    # a separate mechanism and preserves inheritance.
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
    }
}
EOF
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
