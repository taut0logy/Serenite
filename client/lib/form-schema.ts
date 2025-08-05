import * as z from 'zod';

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters long.' }),
  
  fullname: z
    .string()
    .min(3, { message: 'Full Name must be at least 3 characters long.' }),
  
  email: z
    .string()
    .email({ message: 'Please enter a valid email address.' }),
  
  role: z
    .string()
    .min(1, { message: 'Role is required.' }),
  
  mobile: z
    .string()
    .regex(/^\+?\d{10,15}$/, { message: 'Please enter a valid mobile number.' }),
  
  division: z
    .string()
    .min(1, { message: 'Please select a division.' }),
  
  district: z
    .string()
    .min(1, { message: 'Please select a district.' }),
  
  upzilla: z
    .string()
    .min(1, { message: 'Please select an upzilla.' }),
  
  avatar: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true; // It's optional

      // Regular expression to match relative paths starting with /avatars/ and valid image extensions
      const relativePathRegex = /^\/avatars\/.+\.(png|jpg|jpeg|svg)$/i;

      // Regular expression to match absolute URLs with valid image extensions
      const absoluteUrlRegex = /^https?:\/\/.+\.(png|jpg|jpeg|svg)$/i;

      return relativePathRegex.test(value) || absoluteUrlRegex.test(value);
    }, { message: 'Please provide a valid avatar URL.' }),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
