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
              background: 'linear-gradient(135deg, #0f766e 0%, #285A48 100%)',
              color: '#ffffff',
              '&:hover': {
                background: 'linear-gradient(135deg, #128779 0%, #2f6a55 100%)',
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
