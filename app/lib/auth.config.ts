import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { connectToDatabase } from '@/app/lib/mongodb'
import User from '@/models/User'
import { verifyPassword, hashPassword } from '@/app/lib/crypto'

export const { handlers, auth } = NextAuth({
  trustHost: true,
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    Google({
      async profile(profile) {
        await connectToDatabase()
        const email = profile.email
        let user = email ? await User.findOne({ email }) : null
        if (!user && email) {
          user = await User.create({ email, name: profile.name, image: profile.picture })
        }
        return {
          id: String(user?._id || profile.sub),
          name: user?.name || profile.name,
          email: user?.email || email,
          image: user?.image || profile.picture
        }
      }
    }),
    Credentials({
      async authorize({ email, password, name }) {
        if (!email || !password) return null
        const emailStr = String(email)
        await connectToDatabase()
        let user = await User.findOne({ email: emailStr })
        if (!user) {
          // User doesn't exist - this should not happen in login flow
          // Signup should be handled separately via /api/auth/signup
          return null
        }
        if (user.passwordHash) {
          const ok = await verifyPassword(String(password), user.passwordHash)
          if (!ok) return null
          return { id: String(user._id), name: user.name, email: user.email }
        }
        // User exists but no password - set password (for migration)
        user.passwordHash = await hashPassword(String(password))
        await user.save()
        return { id: String(user._id), name: user.name, email: user.email }
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = (user as any).id
      return token
    },
    async session({ session, token }) {
      (session as any).userId = (token as any).userId
      return session
    }
  }
})

