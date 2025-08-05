import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { authResolvers } from './auth.resolvers';

export const resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  
  Query: {
    ...authResolvers.Query,
  },
  
  Mutation: {
    ...authResolvers.Mutation,
  },
};