import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl
      if (pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname.startsWith("/api/auth")) {
        return true
      }
      if (pathname.startsWith("/trash")) {
        return !!auth
      }
      if (pathname.startsWith("/admin")) {
        return auth?.user?.role === "admin"
      }
      return !!auth
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.id = user.id
      }
      if (trigger === "update" && (session as { name?: string })?.name) {
        token.name = (session as { name: string }).name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
