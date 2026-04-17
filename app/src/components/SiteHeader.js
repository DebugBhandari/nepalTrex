import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import PersonIcon from '@mui/icons-material/Person';
import FavoriteIcon from '@mui/icons-material/Favorite';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Toolbar,
  Typography,
} from '@mui/material';
import AppButton from './AppButton';
import { useCart } from '../hooks/useCart';
import NepalTrexLogo from './NepalTrexLogo';

function initialsFromName(value) {
  const text = String(value || '').trim();
  if (!text) return 'NT';
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return `${first}${second}`.toUpperCase() || first.toUpperCase() || 'NT';
}

function normalizeHandle(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

export default function SiteHeader() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { cart, isHydrated, getCartTotals } = useCart();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [wishlistAnchor, setWishlistAnchor] = useState(null);
  const [ordersAnchor, setOrdersAnchor] = useState(null);
  const [wishlistTreks, setWishlistTreks] = useState([]);
  const [headerOrders, setHeaderOrders] = useState([]);
  const previousPendingCountRef = useRef(0);
  const knownUserOrderStatusesRef = useRef(new Map());

  const isAdminOrSuperUser = ['admin', 'superUser'].includes(session?.user?.role || '');
  const isSuperUser = session?.user?.role === 'superUser';
  const isUserMenuOpen = Boolean(userMenuAnchor);
  const isOrdersOpen = Boolean(ordersAnchor);
  const profileHandle = normalizeHandle(session?.user?.name || (session?.user?.email || '').split('@')[0]);
  const visibleHeaderOrders = isAdminOrSuperUser
    ? headerOrders.filter((o) => o.status === 'pending')
    : headerOrders;

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      fetch('/api/users/wishlist')
        .then((r) => r.json())
        .then((data) => setWishlistTreks(data.treks || []))
        .catch(() => setWishlistTreks([]));
    } else {
      setWishlistTreks([]);
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setHeaderOrders([]);
      previousPendingCountRef.current = 0;
      knownUserOrderStatusesRef.current = new Map();
      return;
    }

    let active = true;
    const role = session?.user?.role || 'user';

    const poll = async () => {
      try {
        if (['admin', 'superUser'].includes(role)) {
          const res = await fetch('/api/orders');
          if (!res.ok) return;
          const data = await res.json();
          if (!active) return;
          setHeaderOrders(data.orders || []);
          previousPendingCountRef.current = (data.orders || []).filter((o) => o.status === 'pending').length;
          return;
        }

        const res = await fetch('/api/orders/my');
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        const orders = data.orders || [];
        setHeaderOrders(orders);
        const nextStatuses = new Map();
        orders.forEach((o) => nextStatuses.set(String(o.id), o.status));
        knownUserOrderStatusesRef.current = nextStatuses;
      } catch {
        // keep quiet on poll failure
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [status, session?.user?.role]);

  const openOrderFromMenu = (orderId) => {
    const target = isAdminOrSuperUser
      ? `/admin?orderId=${encodeURIComponent(orderId)}`
      : `/user/${profileHandle}?orderId=${encodeURIComponent(orderId)}`;
    setOrdersAnchor(null);
    router.push(target);
  };

  return (
    <AppBar position="sticky" elevation={0} sx={{ backdropFilter: 'blur(8px)' }}>
      <Toolbar>
        <Box
          component={Link}
          href="/"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, minWidth: 0, textDecoration: 'none' }}
        >
          <NepalTrexLogo width={120} />
        </Box>
        <Box sx={{ flexGrow: 1 }} />

        {/* Cart */}
        {isHydrated && (
          <IconButton
            color="inherit"
            component={Link}
            href="/stays/checkout"
            aria-label="Open cart"
            sx={{ mr: 0.5, width: 42, height: 42 }}
          >
            <Badge badgeContent={getCartTotals().totalItems} color="error" max={99}>
              <ShoppingCartIcon sx={{ fontSize: 24 }} />
            </Badge>
          </IconButton>
        )}

        {/* Wishlist */}
        <IconButton
          color="inherit"
          onClick={(event) => {
            if (status !== 'authenticated') {
              router.push('/auth/signin');
              return;
            }
            setWishlistAnchor(event.currentTarget);
          }}
          aria-label="Open wishlist"
          sx={{ mr: 0.5, width: 42, height: 42 }}
        >
          <Badge badgeContent={wishlistTreks.length} color="error" max={99}>
            <FavoriteIcon sx={{ fontSize: 24, color: wishlistTreks.length > 0 ? '#ef4444' : 'inherit' }} />
          </Badge>
        </IconButton>

        {status === 'authenticated' && (
          <>
            <IconButton
              color="inherit"
              onClick={(event) => setOrdersAnchor(event.currentTarget)}
              aria-label="Open orders"
              sx={{ mr: 0.5, width: 42, height: 42 }}
            >
              <Badge
                badgeContent={
                  isAdminOrSuperUser
                    ? headerOrders.filter((o) => o.status === 'pending').length
                    : headerOrders.filter((o) => !['completed', 'declined', 'cancelled'].includes(o.status)).length
                }
                color="error"
                max={99}
              >
                <NotificationsNoneIcon sx={{ fontSize: 24 }} />
              </Badge>
            </IconButton>

            <Menu
              anchorEl={ordersAnchor}
              open={isOrdersOpen}
              onClose={() => setOrdersAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { width: 360, maxWidth: 'calc(100vw - 24px)' } }}
            >
              <MenuItem disabled sx={{ opacity: 1, fontWeight: 700 }}>
                {isAdminOrSuperUser ? 'Pending Orders' : 'Your Orders'} ({visibleHeaderOrders.length})
              </MenuItem>
              <Divider />
              {visibleHeaderOrders.length === 0 ? (
                <MenuItem disabled>No orders available.</MenuItem>
              ) : (
                visibleHeaderOrders.map((order) => (
                  <MenuItem
                    key={order.id}
                    onClick={() => openOrderFromMenu(order.id)}
                    sx={{ whiteSpace: 'normal', alignItems: 'flex-start' }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{order.stayName || 'Order'}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {order.customerName || 'Guest'} · {order.quantity} item{order.quantity === 1 ? '' : 's'} · NPR {Number(order.totalPrice || 0).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'capitalize' }}>
                        {order.status}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Menu>
          </>
        )}

        {/* Wishlist popover */}
        <Popover
          open={Boolean(wishlistAnchor)}
          anchorEl={wishlistAnchor}
          onClose={() => setWishlistAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { width: 310, maxHeight: 420, display: 'flex', flexDirection: 'column', borderRadius: 2 } }}
        >
          <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FavoriteIcon sx={{ color: '#ef4444', fontSize: 18 }} />
            <Typography variant="subtitle1" fontWeight={700}>
              Wishlist · {wishlistTreks.length} saved
            </Typography>
          </Box>
          <Divider />
          {wishlistTreks.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No treks saved yet. Click the heart on any trek to save it.
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding sx={{ overflow: 'auto', flex: 1 }}>
              {wishlistTreks.map((trek) => (
                <ListItem
                  key={trek.slug}
                  divider
                  component={Link}
                  href={`/treks/${trek.slug}`}
                  onClick={() => setWishlistAnchor(null)}
                  sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }}
                >
                  <ListItemText
                    primary={trek.name || trek.slug}
                    secondary={[trek.region, trek.level, trek.durationDays ? `${trek.durationDays} days` : null].filter(Boolean).join(' · ')}
                    primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Popover>

        {/* User menu */}
        {status === 'authenticated' ? (
          <>
            <IconButton
              color="inherit"
              onClick={(event) => setUserMenuAnchor(event.currentTarget)}
              sx={(theme) => ({
                border: '1px solid',
                borderColor: theme.palette.divider,
                borderRadius: 999,
                p: 0.25,
                width: 42,
                height: 42,
              })}
              aria-label="Open user menu"
            >
              <Avatar
                src={session?.user?.image || ''}
                alt={session?.user?.name || session?.user?.email || 'User'}
                sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}
              >
                {initialsFromName(session?.user?.name || session?.user?.email)}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={userMenuAnchor}
              open={isUserMenuOpen}
              onClose={() => setUserMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem component={Link} href="/" onClick={() => setUserMenuAnchor(null)}>
                <HomeIcon fontSize="small" style={{ marginRight: 8 }} />
                Home
              </MenuItem>
              <MenuItem component={Link} href="/stays" onClick={() => setUserMenuAnchor(null)}>
                <HotelRoundedIcon fontSize="small" style={{ marginRight: 8 }} />
                Stays
              </MenuItem>
              <MenuItem component={Link} href={`/user/${profileHandle}`} onClick={() => setUserMenuAnchor(null)}>
                <PersonIcon fontSize="small" style={{ marginRight: 8 }} />
                Profile
              </MenuItem>
              {isSuperUser && (
                <MenuItem component={Link} href="/dashboard" onClick={() => setUserMenuAnchor(null)}>
                  <DashboardIcon fontSize="small" style={{ marginRight: 8 }} />
                  Super Dashboard
                </MenuItem>
              )}
              {isAdminOrSuperUser && (
                <MenuItem component={Link} href="/admin" onClick={() => setUserMenuAnchor(null)}>
                  <DashboardIcon fontSize="small" style={{ marginRight: 8 }} />
                  Admin Dashboard
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  signOut({ callbackUrl: '/' });
                }}
              >
                <LogoutIcon fontSize="small" style={{ marginRight: 8 }} />
                Sign out
              </MenuItem>
            </Menu>
          </>
        ) : (
          <AppButton component={Link} href="/auth/signin" startIcon={<LoginIcon />} variant="outlined" size="small">
            Sign in
          </AppButton>
        )}
      </Toolbar>
    </AppBar>
  );
}
