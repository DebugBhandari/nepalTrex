import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SignpostRoundedIcon from '@mui/icons-material/SignpostRounded';
import HikingRoundedIcon from '@mui/icons-material/HikingRounded';
import AppButton from './AppButton';
import NepalTrexLogo from './NepalTrexLogo';

function initialsFromName(value) {
  const parts = String(value || 'Nepal Trex').trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || 'N'}${parts[1]?.[0] || 'T'}`.toUpperCase();
}

const navItems = [
  { label: 'Discover treks', href: '/', icon: MapRoundedIcon },
  { label: 'Find stays', href: '/stays', icon: HotelRoundedIcon },
  { label: 'Find guides', href: '/guides', icon: HikingRoundedIcon },
];

export default function SiteHeader() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const isAdmin = ['admin', 'superUser'].includes(session?.user?.role);

  const isCurrent = (href) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={(theme) => ({
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(3, 4, 94, 0.86)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Toolbar
        sx={{
          maxWidth: 1320,
          width: '100%',
          minHeight: { xs: 64, md: 74 },
          mx: 'auto',
          px: { xs: 2, md: 3 },
          gap: { xs: 1, md: 2 },
        }}
      >
        <Box component={Link} href="/" aria-label="NepalTrex home" sx={{ display: 'flex', alignItems: 'center', width: { xs: 106, sm: 128 }, flexShrink: 0 }}>
          <NepalTrexLogo width={150} />
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, ml: 1 }}>
          {navItems.map(({ label, href }) => (
            <Box
              key={href}
              component={Link}
              href={href}
              sx={(theme) => ({
                px: 1.4,
                py: 0.8,
                borderRadius: 1.5,
                fontSize: 14,
                fontWeight: isCurrent(href) ? 800 : 600,
                color: isCurrent(href) ? 'primary.main' : 'text.secondary',
                bgcolor: isCurrent(href) ? theme.palette.mode === 'dark' ? 'rgba(72,202,228,0.15)' : 'rgba(0,119,182,0.08)' : 'transparent',
                transition: 'all 160ms ease',
                '&:hover': { color: 'primary.main', bgcolor: theme.palette.mode === 'dark' ? 'rgba(72,202,228,0.12)' : 'rgba(0,119,182,0.06)' },
              })}
            >
              {label}
            </Box>
          ))}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {status === 'authenticated' ? (
          <>
            <IconButton onClick={(event) => setUserMenuAnchor(event.currentTarget)} aria-label="Open account menu" sx={{ p: 0.45, ml: 0.25 }}>
              <Avatar src={session.user?.image || undefined} alt={session.user?.name || session.user?.email || 'Account'} sx={{ width: 34, height: 34, bgcolor: 'primary.main', color: '#fff', fontSize: 13, fontWeight: 800 }}>
                {initialsFromName(session.user?.name || session.user?.email)}
              </Avatar>
            </IconButton>
            <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
              <MenuItem component={Link} href="/profile" onClick={() => setUserMenuAnchor(null)}><PersonOutlineRoundedIcon fontSize="small" sx={{ mr: 1 }} />My profile</MenuItem>
              {isAdmin && <MenuItem component={Link} href="/admin" onClick={() => setUserMenuAnchor(null)}><HotelRoundedIcon fontSize="small" sx={{ mr: 1 }} />Host dashboard</MenuItem>}
              {session?.user?.role === 'superUser' && <MenuItem component={Link} href="/dashboard" onClick={() => setUserMenuAnchor(null)}><DashboardRoundedIcon fontSize="small" sx={{ mr: 1 }} />Platform dashboard</MenuItem>}
              <MenuItem onClick={() => signOut({ callbackUrl: '/' })}><LogoutRoundedIcon fontSize="small" sx={{ mr: 1 }} />Sign out</MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography component={Link} href="/auth/signin" variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 700, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>Sign in</Typography>
            <AppButton component={Link} href="/auth/signup" size="small">Start planning</AppButton>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
