import { gql } from '@apollo/client';

// ── Profile ───────────────────────────────────────────────────────────────────

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($userId: String!, $input: UpdateProfileInput!) {
    updateProfile(userId: $userId, input: $input) {
      success
      message
    }
  }
`;