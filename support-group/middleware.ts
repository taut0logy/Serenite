import authConfig from "@/auth.config";
import NextAuth from "next-auth";

import {
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
  authRoutes,
  apiAuthPrefix,
} from "@/routes";

const { auth } = NextAuth(authConfig);
export default auth((req) => {
  const { nextUrl } = req;
  const isLogged = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  if(isApiAuthRoute) {
    return null;
  }

  if(isAuthRoute) {
    if(isLogged) {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return null;
  }

  
  // req.auth
})
 
// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
}