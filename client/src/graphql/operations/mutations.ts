import { gql } from '@apollo/client';

export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      user {
        id
        email
        role
        verified
        hasPassword
        profile {
          id
          firstName
          lastName
          avatarUrl
          bio
          dob
        }
      }
      success
      message
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!, $deviceToken: String) {
    login(email: $email, password: $password, deviceToken: $deviceToken) {
        success
        message
        requires2FA
        token
        tempToken
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

export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      success
      message
    }
  }
`;

export const VERIFY_PASSWORD = gql`
  mutation VerifyPassword($userId: String!, $password: String!) {
    verifyPassword(userId: $userId, password: $password) {
      success
      message
    }
  }
`;

export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email) {
      success
      message
    }
  }
`;


export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
      success
      message
    }
  }
`;

export const VERIFY_OTP = gql`
  mutation VerifyOtp(
    $userId: String!
    $otp: String!
    $tempToken: String!
    $trustDevice: Boolean
    $deviceName: String
    $deviceType: String
  ) {
    verifyOtp(
      userId: $userId
      otp: $otp
      tempToken: $tempToken
      trustDevice: $trustDevice
      deviceName: $deviceName
      deviceType: $deviceType
    ) {
      success
      message
      token
    }
  }
`;

export const VERIFY_BACKUP_CODE = gql`
  mutation VerifyBackupCode(
    $userId: String!
    $backupCode: String!
    $tempToken: String!
    $trustDevice: Boolean
    $deviceName: String
    $deviceType: String
  ) {
    verifyBackupCode(
      userId: $userId
      backupCode: $backupCode
      tempToken: $tempToken
      trustDevice: $trustDevice
      deviceName: $deviceName
      deviceType: $deviceType
    ) {
      success
      message
      token
    }
  }
`;

export const VERIFY_SESSION = gql`
  mutation VerifySession($token: String!) {
    verifySession(token: $token) {
        valid
        user {
          id
          email
          verified
          kycVerified
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

export const SOCIAL_AUTH = gql`
  mutation SocialAuth($input: SocialAuthInput!) {
    socialAuth(input: $input) {
        success
        message
        token
        user {
          id
          email
          role
          verified
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

// Add the check2FARequired mutation
export const CHECK_2FA_REQUIRED = gql`
  mutation Check2FARequired(
    $email: String!
    $password: String!
    $deviceToken: String
  ) {
    check2FARequired(
      email: $email
      password: $password
      deviceToken: $deviceToken
    ) {
        success
        message
        requires2FA
        token
        tempToken
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

export const RESEND_VERIFICATION_EMAIL = gql`
  mutation ResendVerificationEmail($email: String!) {
    resendVerificationEmail(email: $email) {
      success
      message
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($userId: String!, $input: UpdateProfileInput!) {
    updateProfile(userId: $userId, input: $input) {
        success
        message
    }
  }
`;

export const SET_PASSWORD = gql`
  mutation SetPassword($userId: String!, $password: String!) {
    setPassword(userId: $userId, password: $password) {
      success
      message
    }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($userId: String!, $currentPassword: String, $newPassword: String!) {
    changePassword(userId: $userId, currentPassword: $currentPassword, newPassword: $newPassword) {
        success
        message
      }
    }
`;

export const ENABLE_TWO_FACTOR = gql`
  mutation EnableTwoFactor($userId: String!) {
    enableTwoFactor(userId: $userId) {
      success
      message
      backupCodes
    }
  }
`;

export const DISABLE_TWO_FACTOR = gql`
  mutation DisableTwoFactor($userId: String!) {
    disableTwoFactor(userId: $userId) {
      success
      message
    }
  }
`;

export const REGENERATE_BACKUP_CODES = gql`
  mutation RegenerateBackupCodes($userId: String!) {
    regenerateBackupCodes(userId: $userId) {
      success
      message
      backupCodes
    }
  }
`;

export const REMOVE_TRUSTED_DEVICE = gql`
  mutation RemoveTrustedDevice($userId: String!, $deviceToken: String!) {
    removeTrustedDevice(userId: $userId, deviceToken: $deviceToken) {
      success
      message
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($userId: String!) {
    deleteAccount(userId: $userId) {
        success
        message
      }
    }
`;

export const LOGOUT = gql`
  mutation Logout($token: String!) {
    logout(token: $token) {
        success
        message
      }
    }
`;


export const CREATE_NOTIFICATION = gql`
  mutation CreateNotification($input: CreateNotificationInput!) {
    createNotification(input: $input) {
      id
      type
      message
      meta
      status
      createdAt
      user {
        id
      }
    }
  }
`;

export const MARK_NOTIFICATIONS_READ = gql`
  mutation MarkNotificationsRead($ids: [String!]!) {
    markNotificationsRead(ids: $ids) {
      success
      message
      notifications {
        id
        read
      }
    }
  }
`;

export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($id: String!) {
    deleteNotification(id: $id) {
      success
      message
    }
  }
`;

export const DELETE_ALL_NOTIFICATIONS = gql`
  mutation DeleteAllNotifications {
    deleteAllNotifications {
      success
      message
    }
  }
`;

export const CREATE_MEETING = gql`
  mutation CreateMeeting($input: CreateMeetingInput!) {
    createMeeting(input: $input) {
      id
      title
      description
      startTime
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
    }
  }
`;

export const UPDATE_MEETING = gql`
  mutation UpdateMeeting($id: String!, $input: UpdateMeetingInput!) {
    updateMeeting(id: $id, input: $input) {
      id
      title
      description
      startTime
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
    }
  }
`;

export const DELETE_MEETING = gql`
  mutation DeleteMeeting($id: String!) {
    deleteMeeting(id: $id)
  }
`;

export const ADD_MEETING_PARTICIPANT = gql`
  mutation AddMeetingParticipant($meetingId: String!, $userId: String!, $status: ParticipantStatus) {
    addMeetingParticipant(meetingId: $meetingId, userId: $userId, status: $status) {
      id
      meetingId
      userId
      status
    }
  }
`;

export const UPDATE_MEETING_PARTICIPANT = gql`
  mutation UpdateMeetingParticipant($id: String!, $status: ParticipantStatus!) {
    updateMeetingParticipant(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const REMOVE_MEETING_PARTICIPANT = gql`
  mutation RemoveMeetingParticipant($id: String!) {
    removeMeetingParticipant(id: $id) {
      id
      meetingId
    }
  }
`;

export const CREATE_MESSAGE = gql`
  mutation CreateMessage($input: CreateMessageInput!, $senderId: String!) {
    createMessage(input: $input, senderId: $senderId) {
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
  }
`;

export const CREATE_FEEDBACK = gql`
  mutation CreateFeedback($input: CreateFeedbackInput!) {
    createFeedback(input: $input) {
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
      meeting {
        id
        title
      }
    }
  }
`;

export const CREATE_CALENDAR_EVENT = gql`
  mutation CreateCalendarEvent($input: CreateCalendarEventInput!) {
    createCalendarEvent(input: $input) {
      id
      title
      description
      startTime
      endTime
      user {
        id
      }
    }
  }
`;

export const CREATE_REPORT = gql`
  mutation CreateReport($input: CreateReportInput!, $reporterId: String!) {
    createReport(input: $input, reporterId: $reporterId) {
      id
      reason
      createdAt
      reporter {
        id
        email
        profile {
          firstName
          lastName
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
          }
        }
      }
    }
  }
`;



export const SUBMIT_FEEDBACK = gql`
  mutation SubmitFeedback($input: FeedbackInput!) {
    submitFeedback(input: $input) {
      id
      meetingId
      rating
      comment
    }
  }
`;

export const REPORT_USER = gql`
  mutation ReportUser($input: ReportInput!) {
    reportUser(input: $input) {
      id
      meetingId
      reason
      details
    }
  }
`;

export const CREATE_MEETING_AGENDA_ITEM = gql`
  mutation CreateMeetingAgendaItem($input: CreateMeetingAgendaItemInput!) {
    createMeetingAgendaItem(input: $input) {
      id
      title
      description
      duration
      order
      meetingId
    }
  }
`;

export const UPDATE_MEETING_AGENDA_ITEM = gql`
  mutation UpdateMeetingAgendaItem($id: String!, $input: UpdateMeetingAgendaItemInput!) {
    updateMeetingAgendaItem(id: $id, input: $input) {
      id
      title
      description
      duration
      order
    }
  }
`;

export const DELETE_MEETING_AGENDA_ITEM = gql`
  mutation DeleteMeetingAgendaItem($id: String!) {
    deleteMeetingAgendaItem(id: $id)
  }
`;

export const UPDATE_MEETING_STATUS = gql`
  mutation UpdateMeetingStatus($id: String!, $status: MeetingStatus!) {
    updateMeetingStatus(id: $id, status: $status) {
      id
      status
      title
      startTime
    }
  }
`;

export const START_MEETING = gql`
  mutation StartMeeting($id: String!, $clientTimestamp: Float!) {
    startMeeting(id: $id, clientTimestamp: $clientTimestamp) {
      id
      status
      startTime
    }
  }
`;

export const END_MEETING = gql`
  mutation EndMeeting($id: String!) {
    endMeeting(id: $id) {
      id
      status
      endTime
    }
  }
`;

export const CANCEL_MEETING = gql`
  mutation CancelMeeting($id: String!) {
    cancelMeeting(id: $id) {
      id
      status
    }
  }
`;

export const ADD_PARTICIPANT = gql`
  mutation AddParticipant($meetingId: String!, $userId: String!) {
    addMeetingParticipant(meetingId: $meetingId, userId: $userId) {
      id
      meetingId
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
`;

export const UPDATE_PARTICIPANT_STATUS = gql`
  mutation UpdateParticipantStatus($id: String!, $status: ParticipantStatus!) {
    updateMeetingParticipant(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const REMOVE_PARTICIPANT = gql`
  mutation RemoveParticipant($id: String!) {
    removeParticipant(id: $id) {
      id
    }
  }
`;

export const MUTE_PARTICIPANT = gql`
  mutation MuteParticipant($participantId: String!) {
    muteParticipant(participantId: $participantId) {
      id
      userId
      meetingId
      status
    }
  }
`;

export const UNMUTE_PARTICIPANT = gql`
  mutation UnmuteParticipant($participantId: String!) {
    unmuteParticipant(participantId: $participantId) {
      id
      userId
      meetingId
      status
    }
  }
`;

export const ENABLE_PARTICIPANT_CAMERA = gql`
  mutation EnableParticipantCamera($participantId: String!) {
    enableParticipantCamera(participantId: $participantId) {
      id
      userId
      meetingId
      status
    }
  }
`;

export const SET_PARTICIPANT_CAMERA_OFF = gql`
  mutation SetParticipantCameraOff($participantId: String!) {
    setParticipantCameraOff(participantId: $participantId) {
      id
      userId
      meetingId
      status
    }
  }
`;

export const ACCEPT_MEETING_INVITATION = gql`
  mutation AcceptMeetingInvitation($participantId: String!) {
    updateMeetingParticipant(
      id: $participantId,
      status: ACCEPTED
    ) {
      id
      userId
      meetingId
      status
    }
  }
`;

export const DECLINE_MEETING_INVITATION = gql`
  mutation DeclineMeetingInvitation($participantId: String!) {
    updateMeetingParticipant(
      id: $participantId,
      status: DECLINED
    ) {
      id
      userId
      meetingId
      status
    }
  }
`;

export const INVITE_TO_MEETING = gql`
  mutation InviteToMeeting($meetingId: String!, $emails: [String!]!) {
    inviteToMeeting(meetingId: $meetingId, emails: $emails)
  }
`;

export const TEST_NOTIFICATION = gql`
  mutation TestNotification($userId: String!, $message: String!) {
    testNotification(userId: $userId, message: $message)
  }
`;

export const CREATE_POLL = gql`
  mutation CreatePoll($input: CreatePollInput!) {
    createPoll(input: $input) {
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

export const END_POLL = gql`
  mutation EndPoll($pollId: String!) {
    endPoll(pollId: $pollId) {
      id
      isActive
      endTime
    }
  }
`;

export const VOTE_POLL = gql`
  mutation VotePoll($input: VotePollInput!) {
    votePoll(input: $input) {
      id
      pollId
      optionIds
      userId
      createdAt
    }
  }
`;

export const START_RECORDING = gql`
  mutation StartRecording($input: StartRecordingInput!) {
    startRecording(input: $input) {
      id
      meetingId
      startedAt
      endedAt
      url
    }
  }
`;

export const STOP_RECORDING = gql`
  mutation StopRecording($recordingId: String!) {
    stopRecording(recordingId: $recordingId) {
      id
      endedAt
      url
    }
  }
`;

export const DELETE_RECORDING = gql`
  mutation DeleteRecording($recordingId: String!) {
    deleteRecording(recordingId: $recordingId) {
      id
    }
  }
`;

export const CREATE_AGENDA_ITEM = gql`
  mutation CreateAgendaItem($input: CreateAgendaItemInput!) {
    createAgendaItem(input: $input) {
      id
      title
      description
      duration
      order
      meetingId
    }
  }
`;

export const UPDATE_AGENDA_ITEM = gql`
  mutation UpdateAgendaItem($id: String!, $data: UpdateAgendaItemInput!) {
    updateAgendaItem(id: $id, data: $data) {
      id
      title
      description
      duration
      order
      meetingId
    }
  }
`;

export const DELETE_AGENDA_ITEM = gql`
  mutation DeleteAgendaItem($id: String!) {
    deleteAgendaItem(id: $id) {
      id
    }
  }
`;

export const REORDER_AGENDA_ITEMS = gql`
  mutation ReorderAgendaItems($meetingId: String!, $itemIds: [String!]!) {
    reorderAgendaItems(meetingId: $meetingId, itemIds: $itemIds) {
      id
      order
    }
  }
`;