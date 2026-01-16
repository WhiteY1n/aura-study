import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // LƯU Ý: Không viết logic nào giữa createServerClient và supabase.auth.getUser().
  // Một sai sót nhỏ có thể khiến người dùng bị đăng xuất ngẫu nhiên rất khó debug.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Các route cần bảo vệ - chuyển về /auth nếu chưa đăng nhập
  const protectedPaths = ["/dashboard", "/project", "/settings"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // Người đã đăng nhập thì không cho vào trang /auth
  if (request.nextUrl.pathname === "/auth" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Nếu vào / thì chuyển về dashboard
  if (request.nextUrl.pathname === "/" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // QUAN TRỌNG: phải return nguyên supabaseResponse.
  return supabaseResponse;
}
