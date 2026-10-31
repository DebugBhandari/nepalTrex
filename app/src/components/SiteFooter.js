import Link from 'next/link';
import { Box, Container, Paper, Typography } from '@mui/material';
import NepalTrexLogo from './NepalTrexLogo';

export default function SiteFooter() {
  return (
    <Box component="footer" id="about" sx={{ pb: { xs: 3, md: 4 } }}>
      <Container maxWidth="xl">
        <Paper
          sx={(theme) => ({
            p: { xs: 2.4, md: 3.2 },
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(130deg, rgba(173,193,120,0.3), rgba(86,71,61,0.96) 55%, rgba(108,88,76,0.96))'
                : 'linear-gradient(130deg, rgba(173,193,120,0.14), rgba(255,255,255,0.98) 52%, rgba(240,234,210,0.98))',
            border: '1px solid',
            borderColor: 'divider',
          })}
        >
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 2.5, md: 2 },
              gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' },
            }}
          >
            <Box>
              <Box component={Link} href="/" aria-label="NepalTrex home" sx={{ display: 'inline-flex', width: 170, mb: 1.1 }}>
                <NepalTrexLogo width={170} />
              </Box>
              <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
                NepalTrex helps international trekkers compare routes, understand elevation and pacing, and find suitable stays around each trekking corridor in Nepal.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.7, fontWeight: 700 }}>
                Contact
              </Typography>
              <Typography color="text.secondary">buddhavtrex@gmail.com</Typography>
              <Typography color="text.secondary">Chitwan, Nepal</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>bhandarideepakdev@gmail.com</Typography>
              <Typography color="text.secondary">Helsinki, Finland</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.7, fontWeight: 700 }}>
                Explore
              </Typography>
              <Typography component={Link} href="/" color="text.secondary" sx={{ display: 'block', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Everest Region
              </Typography>
              <Typography component={Link} href="/" color="text.secondary" sx={{ display: 'block', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Annapurna Region
              </Typography>
              <Typography component={Link} href="/" color="text.secondary" sx={{ display: 'block', textDecoration: 'none', '&:hover': { color: 'primary.main' } }}>
                Langtang Region
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}