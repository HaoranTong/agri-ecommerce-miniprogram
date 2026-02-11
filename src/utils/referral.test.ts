import { parseReferrerFromScene } from './referral';

describe('parseReferrerFromScene', () => {
  test('returns empty on empty input', () => {
    expect(parseReferrerFromScene('')).toBe('');
    expect(parseReferrerFromScene()).toBe('');
  });

  test('parses giftcard scene with rc', () => {
    expect(parseReferrerFromScene('gc_foo_rc_U123ABCD')).toBe('U123ABCD');
  });

  test('parses rc_ prefix', () => {
    expect(parseReferrerFromScene('rc_U999ZZZZ')).toBe('U999ZZZZ');
  });

  test('accepts plain referral code', () => {
    expect(parseReferrerFromScene('U114YPSD')).toBe('U114YPSD');
  });

  test('returns empty for unrelated scene', () => {
    expect(parseReferrerFromScene('invite/promo')).toBe('');
  });
});
