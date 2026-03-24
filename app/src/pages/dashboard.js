import Head from 'next/head';
import { getServerSession } from 'next-auth/next';
import { signOut } from 'next-auth/react';
import { authOptions } from '../lib/auth-options';

export default function DashboardPage({ user }) {
  return (
    <>
      <Head>
        <title>Dashboard | NepalTrex</title>
      </Head>
      <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>
        <h1>Dashboard</h1>
        <p>Signed in as {user?.name || user?.email}</p>
        <button onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: session.user,
    },
  };
}
