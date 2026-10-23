import Button from '@mui/material/Button';

export default function AppButton({ sx, variant = 'contained', ...props }) {
  return (
    <Button
      variant={variant}
      sx={(theme) => ({
        borderRadius: 999,
        px: 2.15,
        py: 0.9,
        minHeight: 40,
        textTransform: 'none',
        fontWeight: 700,
        transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
        ...(variant === 'contained'
          ? {
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: '#ffffff',
              '&:hover': {
                transform: 'translateY(-1px)',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 74%)`,
              },
            }
          : {
              borderColor: theme.palette.divider,
              '&:hover': { transform: 'translateY(-1px)' },
            }),
        ...(typeof sx === 'function' ? sx(theme) : sx),
      })}
      {...props}
    />
  );
}
