import IconButton from '@mui/material/IconButton';

export default function AppIconButton({ sx, tone = 'surface', ...props }) {
  return (
    <IconButton
      sx={(theme) => ({
        borderRadius: 3,
        border: '1px solid',
        borderColor: theme.palette.divider,
        transition: 'all 0.2s ease',
        ...(tone === 'primary'
          ? {
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: '#ffffff',
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 74%)`,
              },
            }
          : {
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }),
        ...(typeof sx === 'function' ? sx(theme) : sx),
      })}
      {...props}
    />
  );
}
