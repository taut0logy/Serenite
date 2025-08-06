'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {  useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { 
  CHANGE_PASSWORD, 
} from '@/graphql/operations/mutations';

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function PasswordChangePage() {
    const [isChangingPassword, setIsChangingPassword] = useState(false);

      const [changePassword] = useMutation(CHANGE_PASSWORD);

      const { user } = useAuth();
      const router = useRouter();

       const passwordForm = useForm<PasswordFormValues>({
          resolver: zodResolver(passwordFormSchema),
          defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          },
        });

        const onPasswordSubmit = async (data: PasswordFormValues) => {
            if (!user?.id) return;
            
            setIsChangingPassword(true);
            try {
              const response = await changePassword({
                variables: {
                  userId: user.id,
                  currentPassword: data.currentPassword,
                  newPassword: data.newPassword,
                },
              });
              
              const result = response.data?.changePassword;
              
              if (result && typeof result === 'object' && result?.success) {
                toast.success(result?.message || 'Password changed successfully');
                passwordForm.reset();
                
                // Sign out user
                await signOut({ redirect: false });
                router.push('/auth/login');
              } else {
                toast.error('Failed to change password');
              }
            } catch (error) {
              console.error('Password change error:', error);
              toast.error('Something went wrong while changing your password');
            } finally {
              setIsChangingPassword(false);
            }
          };
  return (
    <div className="container py-10 px-4 mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-8 w-8" />
        </Link>
        <h1 className="text-3xl font-bold">Security Settings</h1>
      </div>
      <Card>
            <CardHeader>
              <CardTitle>Password & Security</CardTitle>
              <CardDescription>
                Update your password and manage your account security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4">
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? 'Updating Password...' : 'Change Password'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
    </div>
  );
}
