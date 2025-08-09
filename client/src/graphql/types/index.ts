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
  hashedPassword: String
  role: Role!
  createdAt: String!
  updatedAt: String!
  verified: Boolean!
  verificationToken: String
  resetToken: String
  resetTokenExpiry: String
  twoFactorEnabled: Boolean!
  hasPassword: Boolean
  profile: Profile
  trustedDevices: [TrustedDevice!]
  sessions: [Session!]
  twoFactorAuth: TwoFactorAuth
  kycVerified: Boolean
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

type Session {
  id: ID!
  token: String!
  userId: String!
  expiresAt: String!
  createdAt: String!
  user: User
}

type TrustedDevice {
  id: ID!
  userId: String!
  deviceToken: String!
  deviceName: String!
  deviceType: String
  ipAddress: String
  lastUsed: String!
  expiresAt: String!
  createdAt: String!
  user: User
}

type TwoFactorAuth {
  id: ID!
  userId: String!
  secret: String
  otpBackupCodes: [String!]!
  createdAt: String!
  updatedAt: String!
  user: User
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

# Auth response payloads
type AuthPayload {
  success: Boolean!
  message: String!
  user: User
  token: String
  requires2FA: Boolean
  tempToken: String
}

type LoginPayload {
  success: Boolean!
  message: String!
  user: User
  token: String
  requires2FA: Boolean
  tempToken: String
}

type VerifyPayload {
  valid: Boolean
  user: User
  token: String
}

type SimplePayload {
  success: Boolean!
  message: String!
}

type TwoFactorPayload {
  success: Boolean!
  message: String!
  secret: String
  backupCodes: [String!]
}

type TwoFactorStatusPayload {
  success: Boolean!
  twoFactorEnabled: Boolean
}

type OtpVerifyPayload {
  success: Boolean!
  message: String!
  token: String
}

type BackupCodesPayload {
  success: Boolean!
  message: String!
  backupCodes: [String!]
}

type TrustedDevicesPayload {
  success: Boolean!
  message: String!
  devices: [TrustedDevice!]
}

type KycPayload {
  success: Boolean!
  message: String!
  user: User
}

# Input types
input RegisterInput {
  email: String!
  password: String!
  firstName: String!
  lastName: String!
}

input SocialAuthInput {
  email: String!
  provider: String!
  providerId: String!
  name: String!
  firstName: String
  lastName: String
  avatarUrl: String
}

input UpdateProfileInput {
  firstName: String
  lastName: String
  bio: String
  avatarUrl: String
  dob: String
}

input DeviceInfoInput {
  name: String!
  type: String
  ip: String
}

input KycVerifyInput {
  userId: String!
  kycVerified: Boolean!
}

type Query {
  me: User
  user(id: String!): User
  users: [User!]!
  profile(userId: String!): Profile
  getTrustedDevices(userId: String!): TrustedDevicesPayload!
  getUserTwoFactorStatus(userId: String!): TwoFactorStatusPayload!
  verify2faToken(token: String!): VerifyPayload!
  getBackupCodes(userId: String!): BackupCodesPayload!
  notifications(userId: String!, offset: Int = 0, limit: Int = 10): NotificationsPayload!
}

type NotificationsPayload {
  success: Boolean!
  message: String!
  notifications: [Notification!]!
  totalCount: Int!
  hasMore: Boolean!
}

type Mutation {
  # Session verification
  verifySession(token: String!): VerifyPayload!
  # Account creation and verification
  register(input: RegisterInput!): AuthPayload!
  resendVerificationEmail(email: String!): SimplePayload!
  verifyEmail(token: String!): SimplePayload!
  setPassword(userId: String!, password: String!): SimplePayload!
  verifyPassword(userId: String!, password: String!): SimplePayload!

  # Authentication
  login(email: String!, password: String!, deviceToken: String): LoginPayload!
  logout(token: String!): SimplePayload!

  # Password management
  forgotPassword(email: String!): SimplePayload!
  resetPassword(token: String!, password: String!): SimplePayload!
  changePassword(
    userId: String!
    currentPassword: String
    newPassword: String!
  ): SimplePayload!

  # Social authentication
  socialAuth(input: SocialAuthInput!): AuthPayload!
  linkAccount(
    userId: String!
    provider: String!
    providerId: String!
  ): SimplePayload! # Two-factor authentication
  enableTwoFactor(userId: String!): TwoFactorPayload!
  disableTwoFactor(userId: String!): SimplePayload!
  generateAndSendOtp(userId: String!): SimplePayload!
  check2FARequired(
    email: String!
    password: String!
    deviceToken: String
  ): AuthPayload!
  verifyOtp(
    userId: String!
    otp: String!
    tempToken: String!
    trustDevice: Boolean
    deviceName: String
    deviceType: String
    ipAddress: String
  ): OtpVerifyPayload!
  verifyBackupCode(
    userId: String!
    backupCode: String!
    tempToken: String!
    trustDevice: Boolean
    deviceName: String
    deviceType: String
    ipAddress: String
  ): OtpVerifyPayload!
  regenerateBackupCodes(userId: String!): BackupCodesPayload!

  # KYC
  verifyKyc(input: KycVerifyInput!): KycPayload!

  # Trusted devices
  trustDevice(
    userId: String!
    deviceName: String!
    ipAddress: String
    deviceType: String
  ): SimplePayload!
  removeTrustedDevice(userId: String!, deviceToken: String!): SimplePayload!

  # User profile management
  updateProfile(userId: String!, input: UpdateProfileInput!): SimplePayload!
  deleteAccount(userId: String!): SimplePayload!
}
`