export interface User {
  id: string;
  email: string;
  name?: string;
  firstName: string,
  lastName: string,
  dob?: string, 
  bio?: string,
  image?: string;
  role?: string;
  email_verified?: boolean;
}
