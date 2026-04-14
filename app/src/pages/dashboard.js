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
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import {
  Alert,
  AppBar,
  Box,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { authOptions } from '../lib/auth-options';
import { query } from '../lib/db';
import AppButton from '../components/AppButton';

const ROLE_OPTIONS = ['user', 'admin', 'superUser'];
const LEVEL_OPTIONS = ['easy', 'moderate', 'challenging'];

function parseWaypointsFromGeojson(routeGeojson) {
  if (!routeGeojson) return [];
  const parsed =
    typeof routeGeojson === 'string'
      ? (() => {
          try {
            return JSON.parse(routeGeojson);
          } catch {
            return null;
          }
        })()
      : routeGeojson;
  if (!parsed) return [];
  if (parsed.type === 'RouteWaypoints' && Array.isArray(parsed.waypoints)) {
    return parsed.waypoints;
  }
  if (parsed.type === 'LineString' && Array.isArray(parsed.coordinates)) {
    return parsed.coordinates.map(([lng, lat]) => [lat, lng, '']);
  }
  if (parsed.type === 'Feature' && parsed.geometry?.type === 'LineString') {
    return parsed.geometry.coordinates.map(([lng, lat]) => [lat, lng, '']);
  }
  return [];
}

function waypointsToRouteGeojson(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) return null;
  const valid = waypoints.filter(
    ([lat, lng]) => lat !== '' && lng !== '' && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))
  );
  if (valid.length === 0) return null;
  return { type: 'RouteWaypoints', waypoints: valid };
}

function normalizeRouteGeojson(routeGeojson) {
  if (!routeGeojson) {
    return null;
  }

  if (typeof routeGeojson === 'string') {
    try {
      return JSON.parse(routeGeojson);
    } catch {
      return null;
    }
  }

  if (typeof routeGeojson === 'object') {
    return routeGeojson;
  }

  return null;
}

function getRoutePointCount(routeGeojson) {
  const parsed = normalizeRouteGeojson(routeGeojson);

  if (!parsed || !parsed.type) {
    return 0;
  }

  if (parsed.type === 'RouteWaypoints' && Array.isArray(parsed.waypoints)) {
    return parsed.waypoints.length;
  }

  if (parsed.type === 'LineString') {
    return Array.isArray(parsed.coordinates) ? parsed.coordinates.length : 0;
  }

  if (parsed.type === 'MultiLineString') {
    return Array.isArray(parsed.coordinates)
      ? parsed.coordinates.reduce((count, line) => count + (Array.isArray(line) ? line.length : 0), 0)
      : 0;
  }

  return 0;
}

export default function DashboardPage({ user, treks }) {
  const [items, setItems] = useState(() =>
    treks.map((t) => ({ ...t, waypoints: parseWaypointsFromGeojson(t.routeGeojson) }))
  );
  const [editingById, setEditingById] = useState({});
  const [savingById, setSavingById] = useState({});
  const [trekMessage, setTrekMessage] = useState('');
  const [trekSearch, setTrekSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const [activeTab, setActiveTab] = useState('treks');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState('');
  const [updatingRoleById, setUpdatingRoleById] = useState({});
  const [draftRolesById, setDraftRolesById] = useState({});

  const canManage = useMemo(() => user?.role === 'superUser', [user?.role]);

  const availableRegions = useMemo(
    () => Array.from(new Set(items.map((trek) => trek.region).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const visibleItems = useMemo(() => {
    const query = trekSearch.trim().toLowerCase();

    const filtered = items.filter((trek) => {
      if (regionFilter !== 'all' && trek.region !== regionFilter) {
        return false;
      }

      if (levelFilter !== 'all' && trek.level !== levelFilter) {
        return false;
      }

      const routePoints = getRoutePointCount(trek.routeGeojson);
      if (routeFilter === 'with-route' && routePoints === 0) {
        return false;
      }

      if (routeFilter === 'missing-route' && routePoints > 0) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [trek.name, trek.region, trek.level, trek.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (sortBy === 'duration') {
        return ((Number(a.durationDays) || 0) - (Number(b.durationDays) || 0)) * direction;
      }

      if (sortBy === 'route') {
        return (getRoutePointCount(a.routeGeojson) - getRoutePointCount(b.routeGeojson)) * direction;
      }

      const left = String(a[sortBy] || '').toLowerCase();
      const right = String(b[sortBy] || '').toLowerCase();
      return left.localeCompare(right) * direction;
    });

    return sorted;
  }, [items, levelFilter, regionFilter, routeFilter, sortBy, sortDirection, trekSearch]);

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

  const handleWaypointChange = (trekId, rowIdx, colIdx, value) => {
    setItems((prev) =>
      prev.map((trek) => {
        if (trek.id !== trekId) return trek;
        const wps = [...(trek.waypoints || [])];
        const row = [...(wps[rowIdx] || ['', '', ''])];
        row[colIdx] = value;
        wps[rowIdx] = row;
        return { ...trek, waypoints: wps };
      })
    );
  };

  const handleAddWaypoint = (trekId) => {
    setItems((prev) =>
      prev.map((trek) =>
        trek.id === trekId ? { ...trek, waypoints: [...(trek.waypoints || []), ['', '', '']] } : trek
      )
    );
  };

  const handleRemoveWaypoint = (trekId, rowIdx) => {
    setItems((prev) =>
      prev.map((trek) =>
        trek.id === trekId
          ? { ...trek, waypoints: (trek.waypoints || []).filter((_, i) => i !== rowIdx) }
          : trek
      )
    );
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
          routeGeojson: waypointsToRouteGeojson(trek.waypoints),
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
                routeGeojson: payload.trek.route_geojson || null,
                waypoints: parseWaypointsFromGeojson(payload.trek.route_geojson),
              }
            : item
        )
      );

      setEditingById((prev) => ({ ...prev, [trekId]: false }));
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
        <AppButton
          component={Link}
          href="/"
          startIcon={<HomeIcon />}
          variant="outlined"
          onClick={() => setDrawerOpen(false)}
        >
          Home
        </AppButton>
        <AppButton
          startIcon={<HikingIcon />}
          variant={activeTab === 'treks' ? 'contained' : 'outlined'}
          onClick={() => {
            setActiveTab('treks');
            setDrawerOpen(false);
          }}
        >
          Trek Updates
        </AppButton>
        {canManage && (
          <AppButton
            startIcon={<ManageAccountsIcon />}
            variant={activeTab === 'users' ? 'contained' : 'outlined'}
            onClick={() => {
              setActiveTab('users');
              setDrawerOpen(false);
            }}
          >
            User Management
          </AppButton>
        )}
        <Divider sx={{ my: 1 }} />
        <AppButton
          color="inherit"
          startIcon={<LogoutIcon />}
          variant="outlined"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Sign out
        </AppButton>
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
        sx={{ backdropFilter: 'blur(8px)' }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            NepalTrex Dashboard
          </Typography>
          <AppButton
            component={Link}
            href="/"
            startIcon={<HomeIcon />}
            variant="outlined"
            sx={{ mr: 1, display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Home
          </AppButton>
          <Chip label={`Role: ${user?.role || 'user'}`} color="secondary" />
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {menuList}
      </Drawer>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper
          sx={(theme) => ({
            p: { xs: 2, md: 3 },
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(19,30,49,0.95) 0%, rgba(11,18,32,0.94) 100%)'
                : 'linear-gradient(145deg, #ffffff 0%, #f2fbf9 100%)',
            boxShadow: '0 18px 36px rgba(15, 23, 42, 0.14)',
          })}
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

              <Paper sx={{ p: 1.5, mb: 2 }}>
                <Stack spacing={1.2}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
                    <TextField
                      label="Search treks"
                      placeholder="Name, region, level, description"
                      value={trekSearch}
                      onChange={(event) => setTrekSearch(event.target.value)}
                      size="small"
                      fullWidth
                    />
                    <FormControl size="small" sx={{ minWidth: 170 }}>
                      <InputLabel id="region-filter-label">Region</InputLabel>
                      <Select
                        labelId="region-filter-label"
                        label="Region"
                        value={regionFilter}
                        onChange={(event) => setRegionFilter(event.target.value)}
                      >
                        <MenuItem value="all">All regions</MenuItem>
                        {availableRegions.map((region) => (
                          <MenuItem key={region} value={region}>
                            {region}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id="level-filter-label">Difficulty</InputLabel>
                      <Select
                        labelId="level-filter-label"
                        label="Difficulty"
                        value={levelFilter}
                        onChange={(event) => setLevelFilter(event.target.value)}
                      >
                        <MenuItem value="all">All levels</MenuItem>
                        {LEVEL_OPTIONS.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel id="route-filter-label">Route status</InputLabel>
                      <Select
                        labelId="route-filter-label"
                        label="Route status"
                        value={routeFilter}
                        onChange={(event) => setRouteFilter(event.target.value)}
                      >
                        <MenuItem value="all">All routes</MenuItem>
                        <MenuItem value="with-route">With route</MenuItem>
                        <MenuItem value="missing-route">Missing route</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel id="sort-by-label">Sort by</InputLabel>
                      <Select
                        labelId="sort-by-label"
                        label="Sort by"
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                      >
                        <MenuItem value="name">Name</MenuItem>
                        <MenuItem value="region">Region</MenuItem>
                        <MenuItem value="level">Difficulty</MenuItem>
                        <MenuItem value="duration">Duration</MenuItem>
                        <MenuItem value="route">Route points</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel id="sort-direction-label">Direction</InputLabel>
                      <Select
                        labelId="sort-direction-label"
                        label="Direction"
                        value={sortDirection}
                        onChange={(event) => setSortDirection(event.target.value)}
                      >
                        <MenuItem value="asc">Ascending</MenuItem>
                        <MenuItem value="desc">Descending</MenuItem>
                      </Select>
                    </FormControl>
                    <AppButton
                      variant="outlined"
                      onClick={() => {
                        setTrekSearch('');
                        setRegionFilter('all');
                        setLevelFilter('all');
                        setRouteFilter('all');
                        setSortBy('name');
                        setSortDirection('asc');
                      }}
                    >
                      Reset filters
                    </AppButton>
                  </Stack>
                </Stack>
              </Paper>

              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small" aria-label="Trek summary table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Region</TableCell>
                      <TableCell>Difficulty</TableCell>
                      <TableCell align="right">Duration</TableCell>
                      <TableCell>Route GeoJSON</TableCell>
                      <TableCell>Featured</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleItems.map((trek) => {
                      const routePoints = getRoutePointCount(trek.routeGeojson);

                      return (
                        <TableRow key={`summary-${trek.id}`} hover>
                          <TableCell>{trek.name}</TableCell>
                          <TableCell>{trek.region}</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{trek.level}</TableCell>
                          <TableCell align="right">{trek.durationDays} days</TableCell>
                          <TableCell>
                            {routePoints > 0 ? `Available (${routePoints} pts)` : 'Missing'}
                          </TableCell>
                          <TableCell>{trek.isFeatured ? 'Yes' : 'No'}</TableCell>
                          <TableCell sx={{ maxWidth: 340 }}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {trek.description || 'No description'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack spacing={2}>
                {visibleItems.map((trek) => {
                  const isEditing = Boolean(editingById[trek.id]);
                  const isSaving = Boolean(savingById[trek.id]);

                  return (
                    <Card
                      key={trek.id}
                      sx={{
                        background:
                          'linear-gradient(145deg, rgba(255,251,245,0.98) 0%, rgba(250,244,236,0.96) 100%)',
                      }}
                    >
                      <CardContent>
                        {!isEditing ? (
                          /* ── Collapsed summary ── */
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ sm: 'center' }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {trek.name}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={0.8}
                                sx={{ mt: 0.8, flexWrap: 'wrap', gap: 0.5 }}
                              >
                                <Chip size="small" label={trek.region} />
                                <Chip
                                  size="small"
                                  label={trek.level}
                                  sx={{ textTransform: 'capitalize' }}
                                />
                                <Chip size="small" label={`${trek.durationDays} days`} />
                                {trek.isFeatured && (
                                  <Chip size="small" color="warning" label="Featured" />
                                )}
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={
                                    (trek.waypoints || []).length > 0
                                      ? `Route: ${trek.waypoints.length} pts`
                                      : 'No route'
                                  }
                                />
                              </Stack>
                            </Box>
                            {canManage && (
                              <AppButton
                                variant="outlined"
                                onClick={() =>
                                  setEditingById((prev) => ({ ...prev, [trek.id]: true }))
                                }
                              >
                                Edit
                              </AppButton>
                            )}
                          </Stack>
                        ) : (
                          /* ── Expanded edit form ── */
                          <Stack spacing={1.5}>
                            <TextField
                              label="Trek Name"
                              value={trek.name}
                              onChange={(event) =>
                                handleTrekFieldChange(trek.id, 'name', event.target.value)
                              }
                              disabled={isSaving}
                              fullWidth
                            />
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              <TextField
                                label="Duration (days)"
                                type="number"
                                value={trek.durationDays}
                                onChange={(event) =>
                                  handleTrekFieldChange(
                                    trek.id,
                                    'durationDays',
                                    Number(event.target.value || 0)
                                  )
                                }
                                disabled={isSaving}
                                fullWidth
                                inputProps={{ min: 1 }}
                              />
                              <FormControl fullWidth size="small" disabled={isSaving}>
                                <InputLabel id={`level-${trek.id}`}>Level</InputLabel>
                                <Select
                                  labelId={`level-${trek.id}`}
                                  label="Level"
                                  value={trek.level}
                                  onChange={(event) =>
                                    handleTrekFieldChange(trek.id, 'level', event.target.value)
                                  }
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
                              onChange={(event) =>
                                handleTrekFieldChange(trek.id, 'region', event.target.value)
                              }
                              disabled={isSaving}
                              fullWidth
                            />
                            <TextField
                              label="Description"
                              multiline
                              minRows={4}
                              value={trek.description || ''}
                              onChange={(event) =>
                                handleTrekFieldChange(trek.id, 'description', event.target.value)
                              }
                              disabled={isSaving}
                              fullWidth
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={Boolean(trek.isFeatured)}
                                  onChange={(event) =>
                                    handleTrekFieldChange(
                                      trek.id,
                                      'isFeatured',
                                      event.target.checked
                                    )
                                  }
                                  disabled={isSaving}
                                />
                              }
                              label="Featured trek"
                            />

                            {/* ── Route Coordinates editor ── */}
                            <Box>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <Typography variant="subtitle2">Route Coordinates</Typography>
                                <AppButton
                                  size="small"
                                  variant="outlined"
                                  startIcon={<AddIcon />}
                                  onClick={() => handleAddWaypoint(trek.id)}
                                  disabled={isSaving}
                                >
                                  Add Point
                                </AppButton>
                              </Stack>
                              {(trek.waypoints || []).length === 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  No route coordinates yet. Add points above.
                                </Typography>
                              )}
                              <Stack spacing={1}>
                                {(trek.waypoints || []).map(([lat, lng, place], rowIdx) => (
                                  <Stack
                                    key={`wp-${trek.id}-${rowIdx}`}
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1}
                                    alignItems={{ sm: 'center' }}
                                  >
                                    <TextField
                                      label="Latitude"
                                      type="number"
                                      value={lat}
                                      onChange={(e) =>
                                        handleWaypointChange(trek.id, rowIdx, 0, e.target.value)
                                      }
                                      disabled={isSaving}
                                      size="small"
                                      sx={{ width: { sm: 140 } }}
                                      inputProps={{ step: 'any' }}
                                    />
                                    <TextField
                                      label="Longitude"
                                      type="number"
                                      value={lng}
                                      onChange={(e) =>
                                        handleWaypointChange(trek.id, rowIdx, 1, e.target.value)
                                      }
                                      disabled={isSaving}
                                      size="small"
                                      sx={{ width: { sm: 140 } }}
                                      inputProps={{ step: 'any' }}
                                    />
                                    <TextField
                                      label="Place name"
                                      value={place || ''}
                                      onChange={(e) =>
                                        handleWaypointChange(trek.id, rowIdx, 2, e.target.value)
                                      }
                                      disabled={isSaving}
                                      size="small"
                                      sx={{ flex: 1 }}
                                    />
                                    <AppButton
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      startIcon={<DeleteOutlineIcon />}
                                      onClick={() => handleRemoveWaypoint(trek.id, rowIdx)}
                                      disabled={isSaving}
                                      sx={{ minWidth: 90, flexShrink: 0 }}
                                    >
                                      Remove
                                    </AppButton>
                                  </Stack>
                                ))}
                              </Stack>
                            </Box>

                            <Stack direction="row" spacing={1}>
                              <AppButton
                                variant="contained"
                                onClick={() => handleSaveTrek(trek.id)}
                                disabled={isSaving}
                              >
                                {isSaving ? 'Saving...' : 'Save Trek'}
                              </AppButton>
                              <AppButton
                                variant="outlined"
                                onClick={() =>
                                  setEditingById((prev) => ({ ...prev, [trek.id]: false }))
                                }
                                disabled={isSaving}
                              >
                                Cancel
                              </AppButton>
                            </Stack>
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {visibleItems.length === 0 && (
                  <Alert severity="info">No treks match the current filters.</Alert>
                )}
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
                <AppButton variant="contained" type="submit" disabled={usersLoading}>
                  {usersLoading ? 'Searching...' : 'Search'}
                </AppButton>
                <AppButton
                  variant="outlined"
                  type="button"
                  disabled={usersLoading}
                  onClick={() => {
                    setUserSearch('');
                    fetchUsers('');
                  }}
                >
                  Reset
                </AppButton>
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
                            <AppButton
                              variant="contained"
                              disabled={isSaving || isSelf || currentDraft === entry.role}
                              onClick={() => saveUserRole(entry.id)}
                            >
                              {isSaving ? 'Saving...' : 'Update Role'}
                            </AppButton>
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
      SELECT id, name, duration_days, level, region, description, route_geojson, is_featured
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
    routeGeojson: row.route_geojson || null,
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
