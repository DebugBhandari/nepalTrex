import { compare } from 'bcryptjs';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { query } from './db';

const SUPERUSER_EMAIL = 'bhandarideepakdev@gmail.com';

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
          SELECT id, username, email, display_name, password_hash, role, is_banned
          FROM users
          WHERE (username = $1 OR LOWER(email) = LOWER($1)) AND provider = 'credentials'
          LIMIT 1
        `,
        [username]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const userRow = result.rows[0];

      if (userRow.is_banned) {
        return null;
      }

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
        role: userRow.role || 'user',
        isBanned: Boolean(userRow.is_banned),
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
      const normalizedEmail = (user?.email || '').trim().toLowerCase();

      if (normalizedEmail) {
        const existingUser = await query(
          `
            SELECT id, is_banned
            FROM users
            WHERE LOWER(email) = $1
               OR (provider = $2 AND provider_account_id = $3)
            ORDER BY created_at DESC
            LIMIT 1
          `,
          [normalizedEmail, account?.provider || '', account?.providerAccountId || '']
        );

        if (existingUser.rows[0]?.is_banned) {
          return false;
        }
      }

      if (account?.provider === 'google') {
        const role = normalizedEmail === SUPERUSER_EMAIL ? 'superUser' : 'user';

        await query(
          `
            INSERT INTO users (email, display_name, provider, provider_account_id, role)
            VALUES ($1, $2, 'google', $3, $4)
            ON CONFLICT (provider, provider_account_id)
            DO UPDATE SET
              email = EXCLUDED.email,
              display_name = EXCLUDED.display_name,
              role = EXCLUDED.role,
              updated_at = NOW()
          `,
          [user.email || null, user.name || null, account.providerAccountId, role]
        );

        if (normalizedEmail === SUPERUSER_EMAIL) {
          await query(
            `
              UPDATE users
              SET role = 'superUser', updated_at = NOW()
              WHERE LOWER(email) = $1
            `,
            [normalizedEmail]
          );
        }
      }

      if (user?.email?.trim().toLowerCase() === SUPERUSER_EMAIL) {
        await query(
          `
            UPDATE users
            SET role = 'superUser', updated_at = NOW()
            WHERE LOWER(email) = $1
          `,
          [SUPERUSER_EMAIL]
        );
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role || token.role || 'user';
        token.isBanned = Boolean(user.isBanned);
      } else if (token?.email) {
        const result = await query(
          `
            SELECT id, role, is_banned
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

        if (result.rows[0]?.role) {
          token.role = result.rows[0].role;
        }

        token.isBanned = Boolean(result.rows[0]?.is_banned);
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.userId && session?.user) {
        session.user.id = token.userId;
        session.user.role = token.role || 'user';
        session.user.isBanned = Boolean(token.isBanned);

        const result = await query(
          `
            SELECT display_name, profile_image_url
            FROM users
            WHERE id = $1
            LIMIT 1
          `,
          [token.userId]
        );

        if (result.rows[0]?.display_name) {
          session.user.name = result.rows[0].display_name;
        }

        if (result.rows[0]?.profile_image_url) {
          session.user.image = result.rows[0].profile_image_url;
        }
      }
      return session;
    },
  },
};
