import { gql } from '@apollo/client';

export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      role
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

export const GET_USER = gql`
  query GetUser($id: String!) {
    user(id: $id) {
      id
      email
      role
      profile {
        id
        firstName
        lastName
        avatarUrl
        bio
      }
    }
  }
`;

export const VERIFY_2FA_TOKEN = gql`
  query Verify2FAToken($token: String!) {
    verify2FAToken(token: $token) {
      valid
      user {
        id
        email
        verified
        role
        hasPassword
        profile {
          firstName
          lastName
          bio
          dob
          avatarUrl
        }
      }
    }
  }
`;

export const GET_TWO_FACTOR_STATUS = gql`
  query GetUserTwoFactorStatus($userId: String!) {
    getUserTwoFactorStatus(userId: $userId) {
      success
      twoFactorEnabled
    }
  }
`;

export const GET_BACKUP_CODES = gql`
  query GetBackupCodes($userId: String!) {
    getBackupCodes(userId: $userId) {
      success
      backupCodes
    }
  }
`;

export const GET_TRUSTED_DEVICES = gql`
  query GetTrustedDevices($userId: String!) {
    getTrustedDevices(userId: $userId) {
      success
      message
      devices {
        id
        deviceName
        deviceType
        deviceToken
        ipAddress
        lastUsed
        expiresAt
        createdAt
      }
    }
  }
`;

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

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($userId: String!) {
    notifications(userId: $userId) {
      edges {
        node {
          id
          type
          message
          read
          status
          createdAt
          meta
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_MEETING = gql`
  query GetMeeting($id: String!) {
    meeting(id: $id) {
      id
      title
      description
      startTime
      endTime
      status
      hostId
      host {
        id
        email
        profile {
          firstName
          lastName
        }
      }
      participants {
        id
        userId
        meetingId
        status
        user {
        id
          email
          profile {
            firstName
            lastName
          }
        }
      }
    }
  }
`;

export const GET_MEETINGS = gql`
  query GetMeetings($first: Int, $after: String) {
    meetings(first: $first, after: $after) {
      edges {
        node {
          id
          title
          description
          startTime
          status
          host {
            id
            email
            profile {
              firstName
              lastName
              avatarUrl
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      
    }
  }
`;

export const GET_USER_MEETINGS = gql`
  query GetUserMeetings(
    $userId: String!
    $first: Int
    $after: String
    $filter: MeetingFilter
    $sort: MeetingSort
    $sortDirection: MeetingSortDirection
  ) {
    userMeetings(
      userId: $userId
      first: $first
      after: $after
      filter: $filter
      sort: $sort
      sortDirection: $sortDirection
    ) {
      edges {
        node {
          id
          title
          description
          startTime
          endTime
          status
          hostId
          host {
            id
            email
            profile {
              firstName
              lastName
              avatarUrl
            }
          }
          participants {
            id
            userId
            status
            user {
              id
              email
              profile {
                firstName
                lastName
                avatarUrl
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_USER_HOSTED_MEETINGS = gql`
  query GetUserHostedMeetings(
    $userId: String!
    $first: Int
    $after: String
    $filter: MeetingFilter
    $sort: MeetingSort
    $sortDirection: MeetingSortDirection
  ) {
    userHostedMeetings(
      userId: $userId
      first: $first
      after: $after
      filter: $filter
      sort: $sort
      sortDirection: $sortDirection
    ) {
      edges {
        node {
          id
          title
          description
          startTime
          endTime
          status
          hostId
          host {
            id
            email
            profile {
              firstName
              lastName
              avatarUrl
            }
          }
          participants {
            id
            userId
            status
            user {
              id
              email
              profile {
                firstName
                lastName
                avatarUrl
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_MEETING_INVITATIONS = gql`
  query GetMeetingInvitations(
    $userId: String!
    $first: Int
    $after: String
    $status: ParticipantStatus
  ) {
    meetingParticipants(
      userId: $userId
      first: $first
      after: $after
      status: $status
    ) {
      edges {
        node {
          id
          status
          meeting {
            id
            title
            description
            startTime
            endTime
            status
            host {
              id
              email
              profile {
                firstName
                lastName
                avatarUrl
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_MEETING_PARTICIPANTS = gql`
  query GetMeetingParticipants($meetingId: String!, $first: Int, $after: String) {
    meetingParticipants(meetingId: $meetingId, first: $first, after: $after) {
      edges {
        node {
          id
          userId
          meetingId
          status
          user {
            id
            email
            profile {
              firstName
              lastName
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($meetingId: String!, $first: Int, $after: String) {
    messages(meetingId: $meetingId, first: $first, after: $after) {
      edges {
        node {
          id
          content
          createdAt
          sender {
            id
            email
            profile {
              firstName
              lastName
              avatarUrl
            }
          }
          attachments {
            id
            url
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      
    }
  }
`;

export const GET_FEEDBACKS = gql`
  query GetFeedbacks($meetingId: String!, $first: Int, $after: String) {
    feedbacks(meetingId: $meetingId, first: $first, after: $after) {
      edges {
        node {
          id
          rating
          comment
          createdAt
          user {
            id
            email
            profile {
              firstName
              lastName
              avatarUrl
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      
    }
  }
`;

export const GET_REPORTS = gql`
  query GetReports($meetingId: String!, $first: Int, $after: String) {
    reports(meetingId: $meetingId, first: $first, after: $after) {
      edges {
        node {
          id
          reason
          createdAt
          reporter {
            id
            email
            profile {
              firstName
              lastName
              avatarUrl
            }
          }
          targets {
            id
            reportedUser {
              id
              email
              profile {
                firstName
                lastName
                avatarUrl
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      
    }
  }
`;

export const GET_CALENDAR_EVENTS = gql`
  query GetCalendarEvents($userId: String!, $first: Int, $after: String) {
    calendarEvents(userId: $userId, first: $first, after: $after) {
      edges {
        node {
          id
          title
          description
          startTime
          endTime
          user {
            id
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      
    }
  }
`;

export const GET_MEETING_AGENDA_ITEMS = gql`
  query GetMeetingAgendaItems($meetingId: ID!) {
    meetingAgendaItems(meetingId: $meetingId) {
      id
      title
      description
      duration
      order
      meetingId
    }
  }
`;

export const GET_MEETING_AGENDA_ITEM = gql`
  query GetMeetingAgendaItem($id: String!) {
    meetingAgendaItem(id: $id) {
      id
      title
      description
      duration
      order
      meetingId
      createdAt
      updatedAt
    }
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($searchTerm: String!, $limit: Int) {
    searchUsers(searchTerm: $searchTerm, limit: $limit) {
      id
      email
      profile {
        firstName
        lastName
        avatarUrl
      }
    }
  }
`;

export const GET_POLL_RESULTS = gql`
  query GetPollResults($pollId: ID!) {
    pollResults(pollId: $pollId) {
      id
      meetingId
      question
      isAnonymous
      isMultipleChoice
      isActive
      createdById
      createdAt
      endTime
      options {
        id
        text
        votes
      }
      votes {
        id
        optionIds
        userId
        createdAt
      }
    }
  }
`;

export const GET_ACTIVE_POLLS = gql`
  query GetActivePolls($meetingId: ID!) {
    activePolls(meetingId: $meetingId) {
      id
      meetingId
      question
      isAnonymous
      isMultipleChoice
      isActive
      createdById
      createdAt
      endTime
      options {
        id
        text
        votes
      }
    }
  }
`;

export const GET_RECORDING = gql`
  query GetRecording($recordingId: ID!) {
    recording(recordingId: $recordingId) {
      id
      meetingId
      startedAt
      endedAt
      url
    }
  }
`;

export const GET_MEETING_RECORDINGS = gql`
  query GetMeetingRecordings($meetingId: ID!) {
    meetingRecordings(meetingId: $meetingId) {
      id
      meetingId
      startedAt
      endedAt
      url
    }
  }
`;

export const GET_MEETINGS_BY_HOST = gql`
  query GetMeetingsByHost($hostId: ID!, $take: Int, $skip: Int) {
    meetingsByHost(hostId: $hostId, take: $take, skip: $skip) {
      meetings {
        id
        title
        description
        startTime
        endTime
        status
        hostId
        host {
          id
          email
          profile {
            firstName
            lastName
          }
        }
        participants {
          id
          userId
          status
          user {
            id
            email
            profile {
              firstName
              lastName
            }
          }
        }
      }
      totalCount
    }
  }
`;