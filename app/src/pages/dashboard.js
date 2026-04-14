import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getServerSession } from 'next-auth/next';
import { signOut } from 'next-auth/react';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import HikingIcon from '@mui/icons-material/Hiking';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { authOptions } from '../lib/auth-options';
import { query } from '../lib/db';

const ROLE_OPTIONS = ['user', 'admin', 'superUser'];
const LEVEL_OPTIONS = ['easy', 'moderate', 'challenging'];

export default function DashboardPage({ user, treks }) {
  const [items, setItems] = useState(treks);
  const [savingById, setSavingById] = useState({});
  const [trekMessage, setTrekMessage] = useState('');

  const [activeTab, setActiveTab] = useState('treks');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState('');
  const [updatingRoleById, setUpdatingRoleById] = useState({});
  const [draftRolesById, setDraftRolesById] = useState({});

  const canManage = useMemo(() => user?.role === 'superUser', [user?.role]);

  const fetchUsers = useCallback(
    async (search = '') => {
      if (!canManage) {
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

        const fetchedUsers = payload.users || [];
        setUsers(fetchedUsers);
        setDraftRolesById(
          fetchedUsers.reduce((acc, current) => {
            acc[current.id] = current.role || 'user';
            return acc;
          }, {})
        );

        if (search.trim()) {
          setUsersMessage(`Found ${fetchedUsers.length} matching users.`);
        }
      } catch (error) {
        setUsersMessage(error.message || 'Failed to fetch users');
      } finally {
        setUsersLoading(false);
      }
    },
    [canManage]
  );

  useEffect(() => {
    if (canManage && activeTab === 'users' && users.length === 0 && !usersLoading) {
      fetchUsers('');
    }
  }, [activeTab, canManage, users.length, usersLoading, fetchUsers]);

  const handleTrekFieldChange = (id, field, value) => {
    setItems((prev) => prev.map((trek) => (trek.id === id ? { ...trek, [field]: value } : trek)));
  };

  const handleSaveTrek = async (trekId) => {
    const trek = items.find((item) => item.id === trekId);
    if (!trek) {
      return;
    }

    setSavingById((prev) => ({ ...prev, [trekId]: true }));
    setTrekMessage('');

    try {
      const response = await fetch(`/api/treks/${trekId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trek.name,
          durationDays: Number(trek.durationDays),
          level: trek.level,
          region: trek.region,
          description: trek.description || '',
          isFeatured: Boolean(trek.isFeatured),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update trek');
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === trekId
            ? {
                ...item,
                name: payload.trek.name,
                durationDays: payload.trek.duration_days,
                level: payload.trek.level,
                region: payload.trek.region,
                description: payload.trek.description || '',
                isFeatured: payload.trek.is_featured,
              }
            : item
        )
      );

      setTrekMessage(`Updated trek details for ${payload.trek.name}.`);
    } catch (error) {
      setTrekMessage(error.message || 'Failed to update trek');
    } finally {
      setSavingById((prev) => ({ ...prev, [trekId]: false }));
    }
  };

  const saveUserRole = async (targetUserId) => {
    const selectedRole = draftRolesById[targetUserId];

    setUpdatingRoleById((prev) => ({ ...prev, [targetUserId]: true }));
    setUsersMessage('');

    try {
      const response = await fetch(`/api/users/${targetUserId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update user role');
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === targetUserId ? { ...item, role: payload.user.role } : item))
      );
      setDraftRolesById((prev) => ({ ...prev, [targetUserId]: payload.user.role }));
      setUsersMessage(`Updated role for ${payload.user.email || payload.user.username} to ${payload.user.role}.`);
    } catch (error) {
      setUsersMessage(error.message || 'Failed to update user role');
    } finally {
      setUpdatingRoleById((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const menuList = (
    <Box sx={{ width: 280, p: 2 }} role="presentation">
      <Typography variant="h6" sx={{ mb: 1 }}>
        Menu
      </Typography>
      <Stack spacing={1}>
        <Button
          component={Link}
          href="/"
          startIcon={<HomeIcon />}
          variant="outlined"
          onClick={() => setDrawerOpen(false)}
        >
          Home
        </Button>
        <Button
          startIcon={<HikingIcon />}
          variant={activeTab === 'treks' ? 'contained' : 'outlined'}
          onClick={() => {
            setActiveTab('treks');
            setDrawerOpen(false);
          }}
        >
          Trek Updates
        </Button>
        {canManage && (
          <Button
            startIcon={<ManageAccountsIcon />}
            variant={activeTab === 'users' ? 'contained' : 'outlined'}
            onClick={() => {
              setActiveTab('users');
              setDrawerOpen(false);
            }}
          >
            User Management
          </Button>
        )}
        <Divider sx={{ my: 1 }} />
        <Button
          color="inherit"
          startIcon={<LogoutIcon />}
          variant="outlined"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Sign out
        </Button>
      </Stack>
    </Box>
  );

  return (
    <>
      <Head>
        <title>Dashboard | NepalTrex</title>
      </Head>

      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(90deg, rgba(31,41,55,0.96) 0%, rgba(51,65,85,0.96) 100%)',
          color: '#fff7ed',
          borderBottom: '1px solid rgba(217,119,69,0.35)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            NepalTrex Dashboard
          </Typography>
          <Button
            component={Link}
            href="/"
            startIcon={<HomeIcon />}
            variant="outlined"
            sx={{ mr: 1, display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Home
          </Button>
          <Chip label={`Role: ${user?.role || 'user'}`} color="secondary" sx={{ color: '#102023' }} />
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {menuList}
      </Drawer>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            background: 'linear-gradient(145deg, #fffaf2 0%, #f8efe4 100%)',
            border: '1px solid rgba(148,163,184,0.3)',
            boxShadow: '0 18px 36px rgba(15, 23, 42, 0.14)',
          }}
        >
          <Typography variant="h4">Welcome, {user?.name || user?.email}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage treks and users from one place.
          </Typography>

          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mt: 2 }}
          >
            <Tab value="treks" label="Trek Updates" />
            {canManage && <Tab value="users" label="User Management" />}
          </Tabs>

          {activeTab === 'treks' && (
            <Box sx={{ mt: 2 }}>
              {canManage ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  As superUser, you can update all trek fields below.
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You can view trek information. Only superUsers can save trek changes.
                </Alert>
              )}

              {trekMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {trekMessage}
                </Alert>
              )}

              <Stack spacing={2}>
                {items.map((trek) => (
                  <Card
                    key={trek.id}
                    sx={{
                      background:
                        'linear-gradient(145deg, rgba(255,251,245,0.98) 0%, rgba(250,244,236,0.96) 100%)',
                    }}
                  >
                    <CardContent>
                      <Stack spacing={1.5}>
                        <TextField
                          label="Trek Name"
                          value={trek.name}
                          onChange={(event) => handleTrekFieldChange(trek.id, 'name', event.target.value)}
                          disabled={!canManage || Boolean(savingById[trek.id])}
                          fullWidth
                        />
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                          <TextField
                            label="Duration (days)"
                            type="number"
                            value={trek.durationDays}
                            onChange={(event) =>
                              handleTrekFieldChange(trek.id, 'durationDays', Number(event.target.value || 0))
                            }
                            disabled={!canManage || Boolean(savingById[trek.id])}
                            fullWidth
                            inputProps={{ min: 1 }}
                          />
                          <FormControl fullWidth size="small" disabled={!canManage || Boolean(savingById[trek.id])}>
                            <InputLabel id={`level-${trek.id}`}>Level</InputLabel>
                            <Select
                              labelId={`level-${trek.id}`}
                              label="Level"
                              value={trek.level}
                              onChange={(event) => handleTrekFieldChange(trek.id, 'level', event.target.value)}
                            >
                              {LEVEL_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Stack>
                        <TextField
                          label="Region"
                          value={trek.region}
                          onChange={(event) => handleTrekFieldChange(trek.id, 'region', event.target.value)}
                          disabled={!canManage || Boolean(savingById[trek.id])}
                          fullWidth
                        />
                        <TextField
                          label="Description"
                          multiline
                          minRows={4}
                          value={trek.description || ''}
                          onChange={(event) => handleTrekFieldChange(trek.id, 'description', event.target.value)}
                          disabled={!canManage || Boolean(savingById[trek.id])}
                          fullWidth
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={Boolean(trek.isFeatured)}
                              onChange={(event) =>
                                handleTrekFieldChange(trek.id, 'isFeatured', event.target.checked)
                              }
                              disabled={!canManage || Boolean(savingById[trek.id])}
                            />
                          }
                          label="Featured trek"
                        />
                        {canManage && (
                          <Button
                            variant="contained"
                            onClick={() => handleSaveTrek(trek.id)}
                            disabled={Boolean(savingById[trek.id])}
                          >
                            {savingById[trek.id] ? 'Saving...' : 'Save Trek'}
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {activeTab === 'users' && canManage && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                User Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Search users and update roles, including revoking admin or superUser access.
              </Typography>

              <Box
                component="form"
                sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}
                onSubmit={(event) => {
                  event.preventDefault();
                  fetchUsers(userSearch);
                }}
              >
                <TextField
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by username, email, or display name"
                  fullWidth
                  sx={{ flex: 1, minWidth: 240 }}
                />
                <Button variant="contained" type="submit" disabled={usersLoading}>
                  {usersLoading ? 'Searching...' : 'Search'}
                </Button>
                <Button
                  variant="outlined"
                  type="button"
                  disabled={usersLoading}
                  onClick={() => {
                    setUserSearch('');
                    fetchUsers('');
                  }}
                >
                  Reset
                </Button>
              </Box>

              {usersMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {usersMessage}
                </Alert>
              )}

              <Stack spacing={1.5}>
                {users.map((entry) => {
                  const isSaving = Boolean(updatingRoleById[entry.id]);
                  const currentDraft = draftRolesById[entry.id] || entry.role || 'user';
                  const isSelf = entry.id === user.id;

                  return (
                    <Card
                      key={entry.id}
                      sx={{
                        background:
                          'linear-gradient(145deg, rgba(255,251,245,0.98) 0%, rgba(250,244,236,0.96) 100%)',
                      }}
                    >
                      <CardContent>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={2}
                          justifyContent="space-between"
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1">
                              {entry.displayName || entry.username || 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {entry.email || 'N/A'}
                            </Typography>
                            <Chip label={`Current role: ${entry.role || 'user'}`} size="small" sx={{ mt: 1 }} />
                          </Box>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                              <InputLabel id={`role-input-${entry.id}`}>Role</InputLabel>
                              <Select
                                labelId={`role-input-${entry.id}`}
                                label="Role"
                                value={currentDraft}
                                onChange={(event) =>
                                  setDraftRolesById((prev) => ({ ...prev, [entry.id]: event.target.value }))
                                }
                                disabled={isSaving || isSelf}
                              >
                                {ROLE_OPTIONS.map((roleOption) => (
                                  <MenuItem key={roleOption} value={roleOption}>
                                    {roleOption}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Button
                              variant="contained"
                              disabled={isSaving || isSelf || currentDraft === entry.role}
                              onClick={() => saveUserRole(entry.id)}
                            >
                              {isSaving ? 'Saving...' : 'Update Role'}
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Paper>
      </Container>
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
      SELECT id, name, duration_days, level, region, description, is_featured
      FROM treks
      ORDER BY name ASC
    `
  );

  const treks = trekRows.rows.map((row) => ({
    id: row.id,
    name: row.name,
    durationDays: row.duration_days,
    level: row.level,
    region: row.region,
    description: row.description || '',
    isFeatured: row.is_featured,
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
