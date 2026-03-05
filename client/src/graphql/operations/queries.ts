import { gql } from '@apollo/client';

// ── User ─────────────────────────────────────────────────────────────────────

export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      role
      verified
      hasPassword
      twoFactorEnabled
      questionnaireCompleted
      profile {
        id
        firstName
        lastName
        avatarUrl
        bio
        dob
      }
    }
  }
`;

// ── Profile ───────────────────────────────────────────────────────────────────

export const GET_PROFILE = gql`
  query GetProfile($userId: String!) {
    profile(userId: $userId) {
      id
      firstName
      lastName
      dob
      bio
      avatarUrl
      user {
        id
        email
      }
    }
  }
`;

// ── Notifications ─────────────────────────────────────────────────────────────

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($userId: String!, $offset: Int, $limit: Int) {
    notifications(userId: $userId, offset: $offset, limit: $limit) {
      success
      message
      notifications {
        id
        type
        message
        read
        status
        createdAt
      }
      totalCount
      hasMore
    }
  }
`;