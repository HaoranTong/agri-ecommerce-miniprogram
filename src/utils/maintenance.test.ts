import { getMaintenanceMessage, isMaintenancePayload } from './maintenance';

describe('maintenance', () => {
  it('detects maintenance payload', () => {
    expect(isMaintenancePayload(503, { code: 'maintenance' })).toBe(true);
    expect(isMaintenancePayload(503, { error_code: 'maintenance' })).toBe(true);
    expect(isMaintenancePayload(503, { message: '系统维护中，请稍后再试' })).toBe(true);
  });

  it('ignores non-maintenance payload', () => {
    expect(isMaintenancePayload(200, { code: 'maintenance' })).toBe(false);
    expect(isMaintenancePayload(503, { code: 'other' })).toBe(false);
  });

  it('returns default message', () => {
    expect(getMaintenanceMessage()).toBe('系统正在维护升级，请稍后再试。');
    expect(getMaintenanceMessage({ message: '维护中' })).toBe('维护中');
  });
});
