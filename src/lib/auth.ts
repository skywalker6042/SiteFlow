import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import sql from '@/lib/db'

// Re-export from client-safe module for convenience
export type { UserPermissions } from '@/lib/permissions'
export { DEFAULT_WORKER_PERMISSIONS, LEAD_CREW_PERMISSIONS, BASIC_CREW_PERMISSIONS } from '@/lib/permissions'
import type { UserPermissions } from '@/lib/permissions'

export type AppUser = {
  id:           string
  email:        string
  platformRole: 'admin' | 'support' | 'org_user'
  orgId:        string | null
  role:         'owner' | 'worker' | null
  permissions:  UserPermissions
  workerId:     string | null
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string }
        if (!email || !password) return null

        const [row] = await sql`
          SELECT
            u.id, u.email, u.password_hash, u.platform_role,
            om.org_id, om.role, om.permissions, om.worker_id
          FROM users u
          LEFT JOIN org_members om ON om.user_id = u.id
          WHERE u.email = ${email.toLowerCase().trim()}
          ORDER BY
            CASE WHEN om.role = 'owner' THEN 0 ELSE 1 END,
            om.created_at ASC
          LIMIT 1
        `
        if (!row) return null

        const valid = await compare(password, row.password_hash)
        if (!valid) return null

        return {
          id:           row.id,
          email:        row.email,
          platformRole: row.platform_role as 'admin' | 'support' | 'org_user',
          orgId:        row.org_id ?? null,
          role:         (row.role ?? null) as 'owner' | 'worker' | null,
          permissions:  (row.permissions ?? {}) as UserPermissions,
          workerId:     row.worker_id ?? null,
        } satisfies AppUser
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // On first sign-in, user is the AppUser object from authorize()
      if (user) {
        const u = user as AppUser
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
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})

// Extend next-auth types
declare module 'next-auth' {
  interface Session {
    user: {
      id:           string
      email:        string
      name?:        string | null
      image?:       string | null
      platformRole: 'admin' | 'support' | 'org_user'
      orgId:        string | null
      role:         'owner' | 'worker' | null
      permissions:  UserPermissions
      workerId:     string | null
    }
  }
}
