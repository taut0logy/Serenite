"use client";

import { ApolloProvider, NormalizedCacheObject } from "@apollo/client";
import { useApollo } from "../lib/apollo-client";
import { ReactNode, useEffect } from "react";
import { useSession } from 'next-auth/react';
import { setAuthToken } from '@/lib/apollo-client';                                                                                                                                                             

interface ApolloWrapperProps {
    children: ReactNode;
    initialApolloState?: NormalizedCacheObject | undefined;
}

/**
 * Apollo Client provider for GraphQL operations
 * This component wraps the application to provide Apollo Client context
 */
export default function ApolloWrapper({ children, initialApolloState }: ApolloWrapperProps) {
    const { data: session, status } = useSession();
    const client = useApollo(initialApolloState);
    useEffect(() => {
      //console.log("Apollo session: ", session)
        // Use the token from NextAuth session
        const token = session?.accessToken;
        
        if (token) {
          setAuthToken(token);
        } else {
          setAuthToken(null);
        }
      }, [session, status]);

    return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
