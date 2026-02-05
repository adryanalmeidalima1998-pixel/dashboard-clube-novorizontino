export { default } from "next-auth/middleware"

export const config = {
  // Protege todas as rotas exceto a página de login e a API de autenticação
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|competitions|logos).*)",
  ],
}
