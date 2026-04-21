import { Box } from '@mui/material';

const DEFAULT_COLUMNS = {
  xs: '1fr',
  sm: 'repeat(2, minmax(0, 1fr))',
  md: 'repeat(3, minmax(0, 1fr))',
  xl: 'repeat(4, minmax(0, 1fr))',
};

export default function ThumbnailGrid({ children, columns = DEFAULT_COLUMNS, gap = { xs: 3, md: 4 }, sx = {} }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap,
        gridTemplateColumns: columns,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
