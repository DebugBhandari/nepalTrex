import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import AppButton from './AppButton';

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', destructive = false, onClose, onConfirm, loading = false }) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><DialogContentText>{description}</DialogContentText></DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton variant="outlined" onClick={onClose} disabled={loading}>Cancel</AppButton>
        <AppButton onClick={onConfirm} disabled={loading} sx={destructive ? { bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } } : undefined}>{loading ? 'Working…' : confirmLabel}</AppButton>
      </DialogActions>
    </Dialog>
  );
}