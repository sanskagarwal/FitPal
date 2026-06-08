import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

// Drives the Profile "Danger Zone" account-deletion flow: opening the confirm
// dialog, capturing the password and a typed confirmation, and calling the
// AuthContext delete action. Deletion is irreversible, so the dialog requires
// both the current password and typing the exact confirmation phrase.
export const CONFIRM_PHRASE = 'DELETE';

export const useDeleteAccount = () => {
  const { deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = password.length > 0 && confirmText === CONFIRM_PHRASE && !submitting;

  const openDialog = () => {
    setError('');
    setPassword('');
    setConfirmText('');
    setOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setOpen(false);
  };

  const confirmDelete = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    // On success the AuthContext clears the user, which unmounts the app back to
    // the auth page, so there is no success state to render here.
    const result = await deleteAccount(password);
    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
    }
  };

  return {
    open,
    password,
    setPassword,
    confirmText,
    setConfirmText,
    error,
    submitting,
    canSubmit,
    openDialog,
    closeDialog,
    confirmDelete,
  };
};
