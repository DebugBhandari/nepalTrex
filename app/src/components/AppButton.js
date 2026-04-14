import Button from '@mui/material/Button';

export default function AppButton({ sx, variant = 'contained', ...props }) {
  return (
    <Button
      variant={variant}
      sx={{
        borderRadius: 999,
        px: 2,
        py: 0.9,
        textTransform: 'none',
        fontWeight: 700,
        ...(variant === 'contained'
          ? {
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              color: '#0b1220',
              '&:hover': {
                background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
              },
            }
          : {
              borderColor: 'rgba(148, 163, 184, 0.55)',
            }),
        ...sx,
      }}
      {...props}
    />
  );
}
