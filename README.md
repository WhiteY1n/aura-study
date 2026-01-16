# Aura Notebook

Ứng dụng Next.js dùng Supabase cho xác thực, realtime và lưu trữ nguồn liệu.

## Yêu cầu
- Node.js 18+ và pnpm
- Tài khoản Supabase với một project đã tạo sẵn

## Cài đặt
```bash
pnpm install
```

## Cấu hình môi trường
1. Sao chép file `.env.example` thành `.env`.
2. Điền giá trị Supabase của bạn:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Các biến khác thêm sau tùy nhu cầu (service role, webhook, v.v.).

## Chạy dự án
```bash
pnpm dev
# ứng dụng chạy tại http://localhost:3000
```

## Build & chạy production
```bash
pnpm build
pnpm start
```

## Kiểm tra & lint
```bash
pnpm lint
```

## Triển khai
Có thể deploy lên Vercel (Next.js) hoặc bất kỳ hạ tầng Node phù hợp. Nhớ cấu hình biến môi trường giống `.env` trong môi trường triển khai.
