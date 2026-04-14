import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { getServerSession } from 'next-auth/next';
import { signOut } from 'next-auth/react';
import { authOptions } from '../lib/auth-options';
import { query } from '../lib/db';

export default function DashboardPage({ user, treks }) {
  const [items, setItems] = useState(treks);
  const [savingById, setSavingById] = useState({});
  const [trekMessage, setTrekMessage] = useState('');

  const [activeTab, setActiveTab] = useState('treks');
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState('');
  const [updatingRoleById, setUpdatingRoleById] = useState({});

  const canEditTreks = useMemo(() => user?.role === 'superUser', [user?.role]);

  const fetchUsers = async (search = '') => {
    if (!canEditTreks) {
      return;
    }

    setUsersLoading(true);
    setUsersMessage('');

    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await fetch(`/api/users?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch users');
      }

      setUsers(payload.users || []);
      if (search.trim()) {
        setUsersMessage(`Found ${(payload.users || []).length} matching users.`);
      }
    } catch (error) {
      setUsersMessage(error.message || 'Failed to fetch users');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (canEditTreks && activeTab === 'users' && users.length === 0 && !usersLoading) {
      fetchUsers('');
    }
  }, [activeTab, canEditTreks, users.length, usersLoading]);

  const handleDescriptionChange = (id, value) => {
    setItems((prev) => prev.map((trek) => (trek.id === id ? { ...trek, description: value } : trek)));
  };

  const handleSave = async (trekId) => {
    const trek = items.find((item) => item.id === trekId);
    if (!trek) {
      return;
    }

    setSavingById((prev) => ({ ...prev, [trekId]: true }));
    setTrekMessage('');

    try {
      const response = await fetch(`/api/treks/${trekId}/description`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: trek.description || '' }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update description');
      }

      setTrekMessage(`Updated description for ${trek.name}.`);
    } catch (error) {
      setTrekMessage(error.message || 'Failed to update description');
    } finally {
      setSavingById((prev) => ({ ...prev, [trekId]: false }));
    }
  };

  const upgradeRole = async (targetUserId, nextRole) => {
    setUpdatingRoleById((prev) => ({ ...prev, [targetUserId]: true }));
    setUsersMessage('');

    try {
      const response = await fetch(`/api/users/${targetUserId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: nextRole }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update user role');
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === targetUserId ? { ...item, role: payload.user.role } : item))
      );
      setUsersMessage(`Updated role to ${nextRole} for ${payload.user.email || payload.user.username}.`);
    } catch (error) {
      setUsersMessage(error.message || 'Failed to update user role');
    } finally {
      setUpdatingRoleById((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const renderTreksTab = () => (
    <div style={{ marginTop: '1rem' }}>
      <h2>Trek Descriptions</h2>
      {!canEditTreks && (
        <p style={{ color: '#5c5f66' }}>
          Only superUsers can edit trek descriptions. You can still view all entries.
        </p>
      )}
      {trekMessage && <p style={{ color: '#1a7f37' }}>{trekMessage}</p>}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {items.map((trek) => (
          <article
            key={trek.id}
            style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '1rem' }}
          >
            <h3 style={{ marginTop: 0 }}>{trek.name}</h3>
            <p style={{ margin: '0.4rem 0' }}>
              <strong>Region:</strong> {trek.region}
            </p>
            <p style={{ margin: '0.4rem 0' }}>
              <strong>Difficulty:</strong> {trek.level}
            </p>
            <label htmlFor={`desc-${trek.id}`} style={{ display: 'block', marginBottom: '0.4rem' }}>
              Description
            </label>
            <textarea
              id={`desc-${trek.id}`}
              rows={4}
              value={trek.description || ''}
              onChange={(event) => handleDescriptionChange(trek.id, event.target.value)}
              disabled={!canEditTreks || Boolean(savingById[trek.id])}
              style={{ width: '100%', padding: '0.6rem' }}
            />
            {canEditTreks && (
              <button
                style={{ marginTop: '0.6rem' }}
                onClick={() => handleSave(trek.id)}
                disabled={Boolean(savingById[trek.id])}
              >
                {savingById[trek.id] ? 'Saving...' : 'Save description'}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );

  const renderUsersTab = () => {
    if (!canEditTreks) {
      return null;
    }

    return (
      <div style={{ marginTop: '1rem' }}>
        <h2>User Management</h2>
        <p style={{ color: '#5c5f66' }}>Search users and upgrade them to admin or superUser.</p>

        <form
          style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem' }}
          onSubmit={(event) => {
            event.preventDefault();
            fetchUsers(userSearch);
          }}
        >
          <input
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Search by username, email, or name"
            style={{ flex: 1, padding: '0.6rem' }}
          />
          <button type="submit" disabled={usersLoading}>
            {usersLoading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={() => {
              setUserSearch('');
              fetchUsers('');
            }}
            disabled={usersLoading}
          >
            Reset
          </button>
        </form>

        {usersMessage && <p style={{ color: '#1a7f37' }}>{usersMessage}</p>}

        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {users.map((entry) => (
            <article
              key={entry.id}
              style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '0.9rem' }}
            >
              <p style={{ margin: '0.2rem 0' }}>
                <strong>Name:</strong> {entry.displayName || entry.username || 'N/A'}
              </p>
              <p style={{ margin: '0.2rem 0' }}>
                <strong>Email:</strong> {entry.email || 'N/A'}
              </p>
              <p style={{ margin: '0.2rem 0' }}>
                <strong>Role:</strong> {entry.role || 'user'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => upgradeRole(entry.id, 'admin')}
                  disabled={Boolean(updatingRoleById[entry.id]) || entry.role === 'admin' || entry.role === 'superUser'}
                >
                  Make admin
                </button>
                <button
                  onClick={() => upgradeRole(entry.id, 'superUser')}
                  disabled={Boolean(updatingRoleById[entry.id]) || entry.role === 'superUser'}
                >
                  Make superUser
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Dashboard | NepalTrex</title>
      </Head>
      <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>
        <h1>Dashboard</h1>
        <p>Signed in as {user?.name || user?.email}</p>
        <p>Role: {user?.role || 'user'}</p>
        <button onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={() => setActiveTab('treks')}
            style={{
              background: activeTab === 'treks' ? '#111827' : '#e5e7eb',
              color: activeTab === 'treks' ? '#ffffff' : '#111827',
            }}
          >
            Trek Updates
          </button>
          {canEditTreks && (
            <button
              onClick={() => setActiveTab('users')}
              style={{
                background: activeTab === 'users' ? '#111827' : '#e5e7eb',
                color: activeTab === 'users' ? '#ffffff' : '#111827',
              }}
            >
              User Management
            </button>
          )}
        </div>

        {activeTab === 'treks' && renderTreksTab()}
        {activeTab === 'users' && renderUsersTab()}
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=%2Fdashboard',
        permanent: false,
      },
    };
  }

  const trekRows = await query(
    `
      SELECT id, name, region, level, description
      FROM treks
      ORDER BY name ASC
    `
  );

  const treks = trekRows.rows.map((row) => ({
    id: row.id,
    name: row.name,
    region: row.region,
    level: row.level,
    description: row.description || '',
  }));

  return {
    props: {
      user: {
        ...session.user,
        role: session.user?.role || 'user',
      },
      treks,
    },
  };
}
