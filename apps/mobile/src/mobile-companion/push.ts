// Termora mobile companion — phase 1 push-permission model.
//
// Pure TypeScript: models the notification permission/registration state without
// importing expo-notifications. Push delivery stays gated until the relay/push
// gateway contract exists; this state machine only records what the OS reported.

export type PushPermissionStatus = 'undetermined' | 'granted' | 'denied'

export interface PushPermissionState {
  status: PushPermissionStatus
  /** Whether the OS still allows asking again after a denial. */
  canAskAgain: boolean
  /** Device token returned by the push provider, once registered. */
  deviceToken: string | null
  /** True only after a device token was accepted by the push provider. */
  registered: boolean
}

export const INITIAL_PUSH_STATE: PushPermissionState = {
  status: 'undetermined',
  canAskAgain: true,
  deviceToken: null,
  registered: false,
}

export interface PushPermissionDecision {
  status: PushPermissionStatus
  canAskAgain: boolean
}

/**
 * Applies an OS permission decision. Leaving `granted` clears any stale device
 * token so a revoked permission can never look registered.
 */
export function applyPushPermission(
  state: PushPermissionState,
  decision: PushPermissionDecision,
): PushPermissionState {
  if (decision.status !== 'granted') {
    return { ...state, status: decision.status, canAskAgain: decision.canAskAgain, deviceToken: null, registered: false }
  }
  return { ...state, status: 'granted', canAskAgain: decision.canAskAgain }
}

/** Whether the app may show the OS prompt again. */
export function canRequestPushPermission(state: PushPermissionState): boolean {
  if (state.status === 'granted') return false
  return state.canAskAgain
}

/** Records a device token, but only while permission is granted. */
export function applyDeviceToken(state: PushPermissionState, token: string): PushPermissionState {
  if (state.status !== 'granted' || token.length === 0) return state
  return { ...state, deviceToken: token, registered: true }
}

export interface PushReadiness {
  ready: boolean
  reason: string
}

/**
 * Reports whether push delivery can be claimed. It cannot be "ready" until
 * permission is granted, a token is present, and the registration succeeded —
 * and the relay/push gateway is still roadmap, so callers must treat this as
 * a local precondition, not a shipped feature.
 */
export function describePushReadiness(state: PushPermissionState): PushReadiness {
  if (state.status === 'undetermined') {
    return { ready: false, reason: 'permission not requested' }
  }
  if (state.status === 'denied') {
    return { ready: false, reason: state.canAskAgain ? 'permission denied' : 'permission blocked' }
  }
  if (!state.deviceToken) {
    return { ready: false, reason: 'no device token registered' }
  }
  return { ready: state.registered, reason: state.registered ? 'registered locally' : 'registration pending' }
}
