import Button from '@mui/material/Button';
import { themeColors } from '../lib/theme';

export default function AppButton({ sx, variant = 'contained', ...props }) {
  return (
    <Button
      variant={variant}
      sx={(theme) => ({
        borderRadius: 1.25,
        px: 2.15,
        py: 0.9,
        minHeight: 40,
        textTransform: 'none',
        fontWeight: 700,
        transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
        ...(variant === 'contained'
          ? {
              background: themeColors.accent,
              color: '#ffffff',
              boxShadow: `0 8px 18px ${themeColors.accent}40`,
              '&:hover': {
                transform: 'translateY(-1px)',
                background: themeColors.deepTeal,
                boxShadow: `0 11px 22px ${themeColors.accent}55`,
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
