// Edge-safe auth config — no DB imports.
// Used by middleware.ts to validate JWT tokens without touching Node.js-only modules.
import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import type { UserPermissions } from '@/lib/permissions'

// Duplicated here to avoid importing auth.ts (which imports db.ts → postgres → Node.js-only)
type AppUser = {
  id:           string
  email:        string
  platformRole: 'admin' | 'org_user'
  orgId:        string | null
  role:         'owner' | 'worker' | null
  permissions:  UserPermissions
  workerId:     string | null
}

export const authEdgeConfig: NextAuthConfig = {
  providers: [], // Credentials provider lives in auth.ts (Node.js only)
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as unknown as AppUser
        token.id           = u.id
        token.platformRole = u.platformRole
        token.orgId        = u.orgId
        token.role         = u.role
        token.permissions  = u.permissions
        token.workerId     = u.workerId
      }
      return token
    },
    session({ session, token }) {
      session.user.id           = token.id           as string
      session.user.platformRole = token.platformRole as AppUser['platformRole']
      session.user.orgId        = token.orgId        as string
      session.user.role         = token.role         as AppUser['role']
      session.user.permissions  = token.permissions  as UserPermissions
      session.user.workerId     = token.workerId     as string | null
      return session
    },
  },
  session: { strategy: 'jwt' },
}

export const { auth } = NextAuth(authEdgeConfig)
