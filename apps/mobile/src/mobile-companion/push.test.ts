import { describe, it, expect } from 'vitest'
import {
  INITIAL_PUSH_STATE,
  applyDeviceToken,
  applyPushPermission,
  canRequestPushPermission,
  describePushReadiness,
} from './push.js'

describe('applyPushPermission', () => {
  it('records a granted decision', () => {
    const next = applyPushPermission(INITIAL_PUSH_STATE, { status: 'granted', canAskAgain: false })
    expect(next.status).toBe('granted')
    expect(next.canAskAgain).toBe(false)
  })

  it('clears a stale token when permission is revoked', () => {
    const granted = applyDeviceToken(
      applyPushPermission(INITIAL_PUSH_STATE, { status: 'granted', canAskAgain: false }),
      'device-token',
    )
    const denied = applyPushPermission(granted, { status: 'denied', canAskAgain: false })
    expect(denied.deviceToken).toBeNull()
    expect(denied.registered).toBe(false)
  })
})

describe('canRequestPushPermission', () => {
  it('allows asking only while undetermined/denied and re-askable', () => {
    expect(canRequestPushPermission(INITIAL_PUSH_STATE)).toBe(true)
    expect(
      canRequestPushPermission({ ...INITIAL_PUSH_STATE, status: 'denied', canAskAgain: true }),
    ).toBe(true)
    expect(
      canRequestPushPermission({ ...INITIAL_PUSH_STATE, status: 'denied', canAskAgain: false }),
    ).toBe(false)
    expect(
      canRequestPushPermission({ ...INITIAL_PUSH_STATE, status: 'granted', canAskAgain: false }),
    ).toBe(false)
  })
})

describe('applyDeviceToken', () => {
  it('only registers while permission is granted', () => {
    expect(applyDeviceToken(INITIAL_PUSH_STATE, 'token').registered).toBe(false)
    const granted = applyPushPermission(INITIAL_PUSH_STATE, { status: 'granted', canAskAgain: true })
    expect(applyDeviceToken(granted, '').registered).toBe(false)
    const registered = applyDeviceToken(granted, 'token')
    expect(registered.deviceToken).toBe('token')
    expect(registered.registered).toBe(true)
  })
})

describe('describePushReadiness', () => {
  it('is not ready before the prompt is shown', () => {
    expect(describePushReadiness(INITIAL_PUSH_STATE)).toEqual({
      ready: false,
      reason: 'permission not requested',
    })
  })

  it('distinguishes denied from permanently blocked', () => {
    expect(
      describePushReadiness({ ...INITIAL_PUSH_STATE, status: 'denied', canAskAgain: true }).reason,
    ).toBe('permission denied')
    expect(
      describePushReadiness({ ...INITIAL_PUSH_STATE, status: 'denied', canAskAgain: false }).reason,
    ).toBe('permission blocked')
  })

  it('is not ready without a device token', () => {
    const granted = applyPushPermission(INITIAL_PUSH_STATE, { status: 'granted', canAskAgain: false })
    expect(describePushReadiness(granted)).toEqual({
      ready: false,
      reason: 'no device token registered',
    })
  })

  it('is ready only once a device token is registered', () => {
    const granted = applyPushPermission(INITIAL_PUSH_STATE, { status: 'granted', canAskAgain: false })
    expect(describePushReadiness(applyDeviceToken(granted, 'token'))).toEqual({
      ready: true,
      reason: 'registered locally',
    })
  })
})
