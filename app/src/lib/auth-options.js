import { compare } from 'bcryptjs';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { query } from './db';

const providers = [
  CredentialsProvider({
    name: 'Username and Password',
    credentials: {
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.username || !credentials?.password) {
        return null;
      }

      const username = credentials.username.trim();

      const result = await query(
        `
          SELECT id, username, email, display_name, password_hash
          FROM users
          WHERE username = $1 AND provider = 'credentials'
          LIMIT 1
        `,
        [username]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const userRow = result.rows[0];

      const isPasswordValid = userRow.password_hash
        ? await compare(credentials.password, userRow.password_hash)
        : false;

      if (!isPasswordValid) {
        return null;
      }

      return {
        id: userRow.id,
        name: userRow.display_name || userRow.username,
        email: userRow.email,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  providers,
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await query(
          `
            INSERT INTO users (email, display_name, provider, provider_account_id)
            VALUES ($1, $2, 'google', $3)
            ON CONFLICT (provider, provider_account_id)
            DO UPDATE SET
              email = EXCLUDED.email,
              display_name = EXCLUDED.display_name,
              updated_at = NOW()
          `,
          [user.email || null, user.name || null, account.providerAccountId]
        );
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      } else if (token?.email) {
        const result = await query(
          `
            SELECT id
            FROM users
            WHERE email = $1
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [token.email]
        );

        if (result.rows[0]?.id) {
          token.userId = result.rows[0].id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.userId && session?.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
};
