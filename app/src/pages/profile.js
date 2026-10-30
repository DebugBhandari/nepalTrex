import { getServerSession } from 'next-auth/next';
import { authOptions } from '../lib/auth-options';
import { query } from '../lib/db';

function normalizeHandle(value) {
  return String(value || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

export default function ProfileRedirect() {
  return null;
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.id) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=%2Fprofile',
        permanent: false,
      },
    };
  }

  const result = await query(
    `SELECT username, display_name, email FROM users WHERE id = $1 LIMIT 1`,
    [session.user.id]
  );
  const row = result.rows[0];
  const handle = normalizeHandle(row?.username || row?.display_name || row?.email?.split('@')[0]);

  return {
    redirect: {
      destination: `/user/${encodeURIComponent(handle)}`,
      permanent: false,
    },
  };
}