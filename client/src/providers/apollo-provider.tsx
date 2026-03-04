"use client";

import { ApolloProvider, NormalizedCacheObject } from "@apollo/client";
import { useApollo } from "../lib/apollo-client";
import { ReactNode } from "react";

interface ApolloWrapperProps {
    children: ReactNode;
    initialApolloState?: NormalizedCacheObject | undefined;
}

/**
 * Apollo Client provider for GraphQL operations.
 * Auth is handled via cookies (same-domain /api/graphql).
 * No Bearer token needed — the NextAuth session cookie is sent automatically.
 */
export default function ApolloWrapper({
    children,
    initialApolloState,
}: ApolloWrapperProps) {
    const client = useApollo(initialApolloState);
    return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
