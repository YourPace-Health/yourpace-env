# Stage 1: Build the React application with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# คัดลอก package.json และ package-lock.json เพื่อติดตั้ง dependencies
COPY package*.json ./

RUN npm ci

# คัดลอก source code ทั้งหมด
COPY . .

# สร้าง production build
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# คัดลอก nginx configuration หากมี หรือเขียนทับไฟล์ default config
# เพื่อให้รองรับ Client-side routing (Single Page Application)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# คัดลอกไฟล์ build จาก stage builder ไปยัง nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
