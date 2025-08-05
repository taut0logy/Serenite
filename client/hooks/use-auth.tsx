// use-auth.tsx
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/providers/auth-provider';
import { VERIFY_PASSWORD } from '@/graphql/operations/mutations';
import { useMutation } from '@apollo/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function useAuth({
  required = false,
  verifiedRequired = false,
  redirectTo = '/auth/login',
  redirectIfFound = false,
} = {}) {
  const { user, isLoading, isAuthenticated, isVerified, hasPermission } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (required && !isAuthenticated) {
      router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }
    if (required && verifiedRequired && isAuthenticated && !isVerified) {
      router.push('/auth/verify-request');
      return;
    }
    if (redirectIfFound && isAuthenticated) {
      router.push('/dashboard');
      return;
    }
  }, [isLoading, isAuthenticated, isVerified, required, verifiedRequired, redirectTo, redirectIfFound, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
    isVerified,
    hasPermission,
  };
}

// Component for password confirmation dialog
function PasswordConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isLoading: boolean;
}) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onConfirm(password);
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              Please enter your password to continue
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? 'Verifying...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook version for use within components
export function useConfirmPassword() {
  const { user, isAuthenticated } = useAuthContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
  const [verifyPassword, { loading }] = useMutation(VERIFY_PASSWORD);

  const handlePasswordConfirm = async (password: string) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      setIsDialogOpen(false);
      return;
    }

    try {
      const { data } = await verifyPassword({
        variables: {
          userId: user.id,
          password: password,
        },
      });

      const result = data?.verifyPassword;

      if (result?.success) {
        toast.success('Password verified');
        setIsDialogOpen(false);
        
        // Execute the pending callback
        if (pendingCallback) {
          pendingCallback();
          setPendingCallback(null);
        }
      } else {
        toast.error(result?.message || 'Invalid password');
      }
    } catch (error) {
      console.error('Password verification error:', error);
      toast.error('Failed to verify password');
    }
  };

  const confirmPassword = (callback: () => void) => {
    if (!isAuthenticated) {
      toast.error('Please log in to continue');
      return;
    }

    setPendingCallback(() => callback);
    setIsDialogOpen(true);
  };

  const PasswordConfirmDialogComponent = () => (
    <PasswordConfirmDialog
      isOpen={isDialogOpen}
      onClose={() => {
        setIsDialogOpen(false);
        setPendingCallback(null);
      }}
      onConfirm={handlePasswordConfirm}
      isLoading={loading}
    />
  );

  return {
    confirmPassword,
    PasswordConfirmDialog: PasswordConfirmDialogComponent,
    isLoading: loading,
  };
}