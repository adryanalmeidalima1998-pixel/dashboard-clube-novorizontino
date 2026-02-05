import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        // Credenciais definidas pelo usuário
        if (
          credentials?.username === "bigdatanovorizontino" &&
          credentials?.password === "gremio123"
        ) {
          return { id: "1", name: "Comissão Técnica", email: "tecnico@novorizontino.com.br" }
        }
        return null
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "uma-chave-secreta-muito-segura-123",
})

export { handler as GET, handler as POST }
