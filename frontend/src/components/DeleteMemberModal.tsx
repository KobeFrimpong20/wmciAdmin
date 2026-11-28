import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Trash2, X } from 'lucide-react';
import { membersApi } from '../api/members';
import { Button } from './Button';

interface DeleteMemberModalProps {
  memberId: string;
  memberName: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteMemberModal({
  memberId,
  memberName,
  isOpen,
  onClose,
  onDeleted,
}: DeleteMemberModalProps) {
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const isExactMatch = typedName === memberName;

  const handleClose = () => {
    if (isDeleting) return;
    setTypedName('');
    setError('');
    onClose();
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExactMatch || isDeleting) return;

    setError('');
    setIsDeleting(true);
    try {
      await membersApi.deleteMember(memberId);
      setTypedName('');
      onDeleted();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to remove this member. Please try again.'
      );
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-member-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/45 backdrop-blur-[1px]"
      onMouseDown={e => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-lg p-6 sm:p-8 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2
              id="delete-member-title"
              className="font-heading text-2xl font-normal text-foreground"
            >
              Remove Member
            </h2>
            <p className="text-sm text-muted-foreground">
              This action permanently removes the member record.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            aria-label="Close removal confirmation"
            className="p-1 text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm text-foreground leading-relaxed pt-4 border-t border-border">
          Removing <span className="font-medium">{memberName}</span> will permanently delete their
          directory profile, assigned labels, and linked application snapshot(s). This cannot be
          undone.
        </p>

        <form onSubmit={handleConfirm} noValidate className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="confirm-member-name"
              className="block font-body text-sm text-foreground"
            >
              To confirm, type{' '}
              <code className="font-accent text-xs px-1.5 py-0.5 rounded-sm bg-danger-wash text-danger border border-danger-border select-all">
                {memberName}
              </code>{' '}
              below:
            </label>
            <input
              id="confirm-member-name"
              type="text"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              disabled={isDeleting}
              placeholder={memberName}
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-sm font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-danger transition-colors duration-150 disabled:opacity-50"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 text-sm text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-4 border-t border-border flex flex-wrap items-center justify-end gap-2.5">
            <Button variant="secondary" onClick={handleClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={!isExactMatch || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>Confirm Removal</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
