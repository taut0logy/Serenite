import { gql } from "graphql-tag";

export const typeDefs = gql`

scalar DateTime
scalar JSON

enum Role {
  ADMIN
  USER
  HOST
  MANAGER
}

enum NotificationType {
  INFO
  WARNING
  ERROR
}

enum NotificationStatus {
  UNREAD
  READ
}

type User {
  id: ID!
  email: String!
  role: Role!
  createdAt: String!
  updatedAt: String!
  verified: Boolean!
  twoFactorEnabled: Boolean!
  hasPassword: Boolean
  profile: Profile
  questionnaireCompleted: Boolean!
}

type Profile {
  id: ID!
  firstName: String
  lastName: String
  dob: String
  bio: String
  avatarUrl: String
  userId: String!
  user: User!
  createdAt: String!
  updatedAt: String!
}

type Notification {
  id: ID!
  userId: String!
  type: NotificationType!
  message: String
  read: Boolean!
  createdAt: String!
  updatedAt: String
  user: User!
  status: NotificationStatus!
}

type NotificationsPayload {
  success: Boolean!
  message: String!
  notifications: [Notification!]!
  totalCount: Int!
  hasMore: Boolean!
}

input UpdateProfileInput {
  firstName: String
  lastName: String
  bio: String
  avatarUrl: String
  dob: String
}

type SimplePayload {
  success: Boolean!
  message: String!
}

type Query {
  # Current authenticated user
  me: User
  # User profile by ID
  profile(userId: String!): Profile
  # Paginated notifications
  notifications(userId: String!, offset: Int, limit: Int): NotificationsPayload!
}

type Mutation {
  # User profile management
  updateProfile(userId: String!, input: UpdateProfileInput!): SimplePayload!
}
`;