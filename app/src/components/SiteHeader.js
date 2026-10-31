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
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
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
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 21, 36, 0.9)' : 'rgba(255, 251, 246, 0.9)',
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
                bgcolor: isCurrent(href) ? theme.palette.mode === 'dark' ? 'rgba(62, 197, 218, 0.15)' : 'rgba(21, 97, 109, 0.08)' : 'transparent',
                transition: 'all 160ms ease',
                '&:hover': { color: 'primary.main', bgcolor: theme.palette.mode === 'dark' ? 'rgba(62, 197, 218, 0.12)' : 'rgba(21, 97, 109, 0.06)' },
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
              <Avatar src={session.user?.image || undefined} alt={session.user?.name || session.user?.email || 'Account'} sx={{ width: 34, height: 34, bgcolor: 'primary.main', color: '#fffbf6', fontSize: 13, fontWeight: 800 }}>
                {initialsFromName(session.user?.name || session.user?.email)}
              </Avatar>
            </IconButton>
            <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
              <MenuItem component={Link} href="/profile" onClick={() => setUserMenuAnchor(null)}><PersonOutlineRoundedIcon fontSize="small" sx={{ mr: 1 }} />My profile</MenuItem>
              <MenuItem component={Link} href="/attempts" onClick={() => setUserMenuAnchor(null)}><WorkspacePremiumRoundedIcon fontSize="small" sx={{ mr: 1 }} />My trek achievements</MenuItem>
              <MenuItem component={Link} href="/guides/manage" onClick={() => setUserMenuAnchor(null)}><HikingRoundedIcon fontSize="small" sx={{ mr: 1 }} />Guide workspace</MenuItem>
              {isAdmin && <MenuItem component={Link} href="/admin" onClick={() => setUserMenuAnchor(null)}><HotelRoundedIcon fontSize="small" sx={{ mr: 1 }} />Host dashboard</MenuItem>}
              {session?.user?.role === 'superUser' && <MenuItem component={Link} href="/dashboard" onClick={() => setUserMenuAnchor(null)}><DashboardRoundedIcon fontSize="small" sx={{ mr: 1 }} />Platform dashboard</MenuItem>}
              <MenuItem onClick={() => signOut({ callbackUrl: '/' })}><LogoutRoundedIcon fontSize="small" sx={{ mr: 1 }} />Sign out</MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography component={Link} href="/auth/signin" variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 700, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>Sign in</Typography>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
