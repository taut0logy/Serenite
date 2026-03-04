import {
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject,
  createHttpLink,
  from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

let client: ApolloClient<NormalizedCacheObject> | null = null;

function createApolloClient() {
  // Cookie-based auth: same-domain /api/graphql receives the NextAuth JWT cookie automatically.
  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || "api/graphql",
    credentials: "include", // send session cookie on every request
  });

  // Error handling link
  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
        );
      });
    }
    if (networkError) {
      console.error(`[Network error]: ${networkError}`);
    }
  });

  // Create Apollo Client instance
  return new ApolloClient({
    link: from([errorLink, httpLink]),
    //cache: new InMemoryCache(),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            userMeetings: {
              // Merge function for paginated queries
              keyArgs: ['userId'],
              merge(existing, incoming, { args }) {
                // Handle first page or no existing data
                if (!existing || !args?.after) {
                  return incoming;
                }

                // For subsequent pages, merge the edges
                return {
                  ...incoming,
                  edges: [...existing.edges, ...incoming.edges],
                };
              },
            },
            meetingParticipants: {
              keyArgs: ['userId', 'meetingId', 'status'],
              merge(existing, incoming, { args }) {
                if (!existing || !args?.after) {
                  return incoming;
                }

                return {
                  ...incoming,
                  edges: [...existing.edges, ...incoming.edges],
                };
              },
            }
          }
        }
      }
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
        errorPolicy: "all",
      },
      query: {
        fetchPolicy: "cache-first",
        errorPolicy: "all",
      },
      mutate: {
        errorPolicy: "all",
      },
    },
  });
}

export function initializeApollo(initialState: NormalizedCacheObject | null = null) {
  const _client = client ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client,
  // the initial state gets hydrated here
  if (initialState) {
    // Get existing cache, loaded during client side data fetching
    const existingCache = _client.extract();

    // Restore the cache using the data passed from getStaticProps/getServerSideProps
    // combined with the existing cached data
    _client.cache.restore({ ...existingCache, ...initialState });
  }

  // For SSG and SSR always create a new Apollo Client
  if (typeof window === 'undefined') return _client;

  // Create the Apollo Client once in the client
  if (!client) client = _client;
  return _client;
}


export function useApollo(initialState: NormalizedCacheObject | null = null) {
  return initializeApollo(initialState);
}

// Helper function to get client instance
export const getClient = () => {
  if (!client) client = createApolloClient();
  return client;
}

// setAuthToken is no longer used (browser uses cookie auth).
// Kept here only for potential server-side calls via getAuthenticatedClient.

/**
 * Get Apollo client with a specific auth token for server-side calls.
 * Use this in NextAuth callbacks where ApolloWrapper isn't available
 * and a Bearer token is needed to authenticate with the GraphQL route.
 */
export const getAuthenticatedClient = (token: string) => {
  // Create a one-time client with the token
  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || "api/graphql",
  });

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) => {
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
        );
      });
    }
    if (networkError) {
      console.error(`[Network error]: ${networkError}`);
    }
  });

  const authLink = setContext(async (_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: `Bearer ${token}`,
      },
    };
  });

  return new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: "network-only", // Always fetch fresh for auth checks
        errorPolicy: "all",
      },
      mutate: {
        errorPolicy: "all",
      },
    },
  });
};
