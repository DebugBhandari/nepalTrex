import { Box, Typography } from '@mui/material';

export default function EmptyState({ title, description, action }) {
  return (
    <Box sx={(theme) => ({ py: 5, px: 3, textAlign: 'center', border: `1px dashed ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.default' })}>
      <Typography variant="h6" fontWeight={800}>{title}</Typography>
      {description && <Typography color="text.secondary" sx={{ mt: 0.75, mb: action ? 2 : 0 }}>{description}</Typography>}
      {action}
    </Box>
  );
}