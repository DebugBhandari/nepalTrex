import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AppButton from '../../components/AppButton';
import SiteHeader from '../../components/SiteHeader';
import { useCart } from '../../hooks/useCart';

export default function CheckoutPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const { cart, updateItemQuantity, removeFromCart, removeStayFromCart, clearCart } = useCart();
  const [bookingForms, setBookingForms] = useState({}); // { staySlug: { customerName, email, phone, notes } }
  const [submittingStay, setSubmittingStay] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, staySlug: null });

  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/stays/checkout')}`);
    }
  }, [status, router]);

  useEffect(() => {
    // Load user profile to pre-fill forms
    if (status !== 'authenticated') return;
    
    let active = true;
    fetch('/api/users/profile')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const profile = data?.profile || {};
        // Pre-fill all forms with user's profile
        const defaultForm = {
          customerName: profile.name || '',
          customerEmail: profile.email || '',
          customerPhone: '',
          notes: '',
        };
        const forms = {};
        Object.keys(cart).forEach((slug) => {
          forms[slug] = { ...defaultForm };
        });
        setBookingForms(forms);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [status, Object.keys(cart).length]);

  const handleUpdateForm = (staySlug, field, value) => {
    setBookingForms((prev) => ({
      ...prev,
      [staySlug]: {
        ...prev[staySlug],
        [field]: value,
      },
    }));
  };

  const handleConfirmOrder = async (staySlug) => {
    const stayCart = cart[staySlug];
    const form = bookingForms[staySlug];

    if (!form?.customerName || !form?.customerPhone) {
      setError('Please fill in Name and Phone for all items before confirming.');
      return;
    }

    setSubmittingStay(staySlug);
    setError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stayId: stayCart.stayId,
          items: stayCart.items,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          notes: form.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Remove this stay from cart
      removeStayFromCart(staySlug);
      setSuccessMessage(`Order confirmed for ${stayCart.stayName}!`);

      // Auto-clear success message after 3 seconds
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    } catch (err) {
      setError(err.message || 'Failed to place order');
    } finally {
      setSubmittingStay(null);
      setConfirmDialog({ open: false, staySlug: null });
    }
  };

  if (status === 'loading') {
    return (
      <>
        <Head>
          <title>Checkout | NepalTrex</title>
        </Head>
        <SiteHeader />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography>Loading...</Typography>
        </Container>
      </>
    );
  }

  const stays = Object.entries(cart);
  const isEmpty = stays.length === 0;

  return (
    <>
      <Head>
        <title>Checkout | NepalTrex</title>
      </Head>

      <SiteHeader />

      <Box sx={{ minHeight: '60vh', py: 4, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
            Checkout
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Review your items from each stay and confirm orders individually.
          </Typography>

          {isEmpty ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Your cart is empty.
              </Typography>
              <AppButton
                component={Link}
                href="/"
                variant="contained"
              >
                Continue Shopping
              </AppButton>
            </Paper>
          ) : (
            <>
              {successMessage && (
                <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ mb: 2 }}>
                  {successMessage}
                </Alert>
              )}

              {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Stack spacing={3}>
                {stays.map(([staySlug, stayCart]) => {
                  const form = bookingForms[staySlug] || {};
                  const subtotal = stayCart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

                  return (
                    <Card key={staySlug} sx={{ border: '1px solid', borderColor: 'divider' }}>
                      <CardContent>
                        {/* Stay header */}
                        <Box sx={{ mb: 2.5 }}>
                          <Typography variant="h6" fontWeight={700}>
                            {stayCart.stayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {stayCart.items.length} item{stayCart.items.length === 1 ? '' : 's'}
                          </Typography>
                        </Box>

                        <Divider sx={{ mb: 2.5 }} />

                        {/* Items */}
                        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                          {stayCart.items.map((item, index) => (
                            <Paper key={index} variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2" fontWeight={700}>
                                    {item.menuItemName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.menuItemCategory}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <TextField
                                    label="Qty"
                                    type="number"
                                    size="small"
                                    inputProps={{ min: 1 }}
                                    value={item.quantity}
                                    onChange={(e) => updateItemQuantity(staySlug, index, e.target.value)}
                                    sx={{ width: 80 }}
                                  />
                                  <Typography variant="body2" fontWeight={700} sx={{ minWidth: 100, textAlign: 'right' }}>
                                    NPR {(item.unitPrice * item.quantity).toLocaleString()}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ mt: 0.8, display: 'flex', justifyContent: 'flex-end' }}>
                                <AppButton
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => removeFromCart(staySlug, index)}
                                >
                                  Remove
                                </AppButton>
                              </Box>
                            </Paper>
                          ))}
                        </Stack>

                        {/* Subtotal */}
                        <Box sx={{ py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Subtotal
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color="primary.main">
                            NPR {subtotal.toLocaleString()}
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 2.5 }} />

                        {/* Booking form */}
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                          Booking Details
                        </Typography>

                        <Stack spacing={1.5} sx={{ mb: 2 }}>
                          <TextField
                            label="Your Name *"
                            fullWidth
                            size="small"
                            value={form.customerName || ''}
                            onChange={(e) => handleUpdateForm(staySlug, 'customerName', e.target.value)}
                          />
                          <TextField
                            label="Email (optional)"
                            fullWidth
                            size="small"
                            type="email"
                            value={form.customerEmail || ''}
                            onChange={(e) => handleUpdateForm(staySlug, 'customerEmail', e.target.value)}
                          />
                          <TextField
                            label="Phone *"
                            fullWidth
                            size="small"
                            value={form.customerPhone || ''}
                            onChange={(e) => handleUpdateForm(staySlug, 'customerPhone', e.target.value)}
                          />
                          <TextField
                            label="Special Requests (optional)"
                            fullWidth
                            size="small"
                            multiline
                            minRows={2}
                            value={form.notes || ''}
                            onChange={(e) => handleUpdateForm(staySlug, 'notes', e.target.value)}
                          />
                        </Stack>

                        {/* Confirm button */}
                        <AppButton
                          variant="contained"
                          fullWidth
                          disabled={submittingStay === staySlug || !form.customerName || !form.customerPhone}
                          onClick={() => setConfirmDialog({ open: true, staySlug })}
                        >
                          {submittingStay === staySlug ? 'Confirming...' : `Confirm Order for ${stayCart.stayName}`}
                        </AppButton>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>

              {stays.length > 0 && (
                <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <AppButton variant="outlined" onClick={() => router.back()}>
                    Continue Shopping
                  </AppButton>
                  <AppButton variant="contained" onClick={() => clearCart()}>
                    Clear Cart
                  </AppButton>
                </Box>
              )}
            </>
          )}
        </Container>
      </Box>

      {/* Confirmation dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, staySlug: null })}>
        <DialogTitle>Confirm Order?</DialogTitle>
        <DialogContent>
          <Typography>
            Please review your booking details. The host will contact you to confirm.
          </Typography>
        </DialogContent>
        <DialogActions>
          <AppButton variant="outlined" onClick={() => setConfirmDialog({ open: false, staySlug: null })}>
            Cancel
          </AppButton>
          <AppButton
            variant="contained"
            onClick={() => handleConfirmOrder(confirmDialog.staySlug)}
            disabled={submittingStay !== null}
          >
            Confirm
          </AppButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
