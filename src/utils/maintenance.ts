type MaintenancePayload = {
  code?: string;
  message?: string;
  error_code?: string;
};

export const isMaintenancePayload = (statusCode: number, payload?: MaintenancePayload) => {
  if (statusCode !== 503 || !payload) return false;
  const code = (payload.code || payload.error_code || '').toLowerCase();
  if (code === 'maintenance') return true;
  const message = payload.message || '';
  return message.includes('维护');
};

export const getMaintenanceMessage = (payload?: MaintenancePayload) => {
  return payload?.message || '系统正在维护升级，请稍后再试。';
};
