# Stage 1: Build the Go application
FROM golang:1.26-alpine AS builder

WORKDIR /app

# ติดตั้ง git และ CA certificates เพื่อใช้ใน Go module และ network request
RUN apk update && apk add --no-cache git ca-certificates

# คัดลอก go.mod และ go.sum
COPY go.mod go.sum ./

# ดาวน์โหลด dependencies
RUN go mod download

# คัดลอก source code ทั้งหมด
COPY . .

# คอมไพล์โปรแกรม Go เป็นแบบ static binary
RUN CGO_ENABLED=0 GOOS=linux go build -o youpace .

# Stage 2: Minimal runtime image
FROM alpine:latest

WORKDIR /app

# ติดตั้ง CA certificates และ tzdata (จำเป็นสำหรับการวิเคราะห์เวลาและเชื่อมต่อภายนอก)
RUN apk --no-cache add ca-certificates tzdata

# คัดลอก binary จาก stage builder
COPY --from=builder /app/youpace .

# เปิดพอร์ตตามที่ backend ใช้
EXPOSE 8080

# สั่งรันแอปพลิเคชัน
CMD ["./youpace"]
