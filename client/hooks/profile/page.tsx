'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import {  useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { useAuth, useConfirmPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  UPDATE_PROFILE,  
  DELETE_ACCOUNT 
} from '@/graphql/operations/mutations';
import { signOut } from 'next-auth/react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Image from 'next/image';

// Profile form schema
const profileFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function ProfilePage() {
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab') || 'details';

  return (
    <Suspense fallback={null}>
      <ProfilePageContent tab={tab} />
    </Suspense>
  );
}

const ProfilePageContent = ( { tab }:{tab:string}) => {
  const [activeTab, setActiveTab] = useState(tab || 'details');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();
  const { confirmPassword, PasswordConfirmDialog } = useConfirmPassword();
  
  // GraphQL mutations
  const [updateProfile] = useMutation(UPDATE_PROFILE);
  const [deleteAccount] = useMutation(DELETE_ACCOUNT);
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName, //|| user?.name?.split(' ')[0] || '',
      lastName: user?.lastName, // || user?.name?.split(' ').slice(1).join(' ') || '',
      bio: user?.bio,
      avatarUrl: user?.image || '',
    },
  });
  
  // Handle profile update
  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user?.id) return;
    
    setIsUpdating(true);
    try {
      const response = await updateProfile({
        variables: {
          userId: user.id,
          input: {
            firstName: data.firstName,
            lastName: data.lastName,
            bio: data.bio,
            avatarUrl: data.avatarUrl,
          },
        },
      });
      
      const result = response.data?.updateProfile;
      
      if (result && typeof result === 'object' && result?.success) {
        toast.success(result?.message || 'Profile updated successfully');

        // Refresh the session to get the updated user data
        await getSession();
        router.refresh();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Something went wrong while updating your profile');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    try {
      const response = await deleteAccount({
        variables: {
          userId: user.id,
        },
      });
      
      const result = response.data?.deleteAccount;

      if (result && result?.success) {
        toast.success(result?.message || 'Account deleted successfully');
        
        // Sign out user
        await signOut({ redirect: false });
        router.push('/auth/login');
      } else {
        toast.error('Failed to delete account');
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Something went wrong while deleting your account');
    }
  };

  const getUserInitials = () => {
        if (!user || !user.firstName || !user.lastName) return "U";
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    };

  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        avatarUrl: user.image || '',
      });
    }
  }, [user, profileForm]);
  
  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <h1 className="mb-6 text-3xl font-bold">My Profile</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Profile Details</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>
        
        {/* Profile Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details and public profile information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-full border">
                    {user?.image ? (
                      <Image
                        width={80}
                        height={80}
                        src={user.image}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xl font-bold text-primary">
                        {getUserInitials()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-medium">{user?.firstName} {user?.lastName}</h2>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us a little about yourself"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This will be displayed on your public profile.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="avatarUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/avatar.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the URL of your profile picture
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Danger Zone Tab */}
        <TabsContent value="danger">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                These actions cannot be undone. Please proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border border-destructive/30 p-4">
                  <h3 className="text-lg font-medium">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all of your data. This action cannot be undone.
                  </p>
                  <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="mt-4">
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove all of your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => confirmPassword(handleDeleteAccount)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <PasswordConfirmDialog />
    </div>
  );
}

// Wrap the component with auth protection
export default ProfilePage; 