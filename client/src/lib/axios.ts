import axiosBase, { AxiosInstance } from 'axios';
// import { auth } from '@/auth';
// import { getSession } from 'next-auth/react';

// Create the base Axios instance
const axios: AxiosInstance = axiosBase.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add authentication token
// axios.interceptors.request.use(
//     async (config) => {
//         try {
//             // For server-side requests (in API routes, server components, etc.)
//             if (typeof window === 'undefined') {
//                 // Server-side: use the auth() function
//                 const session = await auth();
//                 if (session?.accessToken) {
//                     config.headers.Authorization = `Bearer ${session.accessToken}`;
//                 }
//             } else {
//                 // Client-side: use getSession() from next-auth/react
//                 const session = await getSession();
//                 if (session?.accessToken) {
//                     config.headers.Authorization = `Bearer ${session.accessToken}`;
//                 }
//             }
//         } catch (error) {
//             console.error('Error getting session for API request:', error);
//             // Continue with the request even if we can't get the session
//         }
        
//         return config;
//     },
//     (error) => {
//         return Promise.reject(error);
//     }
// );

// // Response interceptor to handle authentication errors
// axios.interceptors.response.use(
//     (response) => {
//         return response;
//     },
//     async (error) => {
//         const originalRequest = error.config;
        
//         // If we get a 401 and haven't already tried to refresh
//         if (error.response?.status === 401 && !originalRequest._retry) {
//             originalRequest._retry = true;
            
//             try {
//                 // For client-side, you might want to trigger a session refresh
//                 if (typeof window !== 'undefined') {
//                     // Trigger NextAuth session refresh
//                     const { signIn } = await import('next-auth/react');
//                     // You might want to redirect to login or show a notification
//                     console.warn('Session expired, please log in again');
//                     // Optionally redirect to login
//                     // window.location.href = '/auth/login';
//                 }
//             } catch (refreshError) {
//                 console.error('Error handling authentication error:', refreshError);
//             }
//         }
        
//         return Promise.reject(error);
//     }
// );

export default axios;