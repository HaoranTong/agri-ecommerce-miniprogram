import Decimal from 'decimal.js';

/**
 * 安全的除法运算
 * 用于解决 JavaScript 浮点数精度问题
 * 例：decimalDiv(100, 0.02) 返回 5000（而非浮点数精度问题的结果）
 * 
 * @param a 被除数
 * @param b 除数
 * @param digits 保留小数位数（默认不限制）
 * @returns 除法结果
 */
export const decimalDiv = (
  a: number | string,
  b: number | string,
  digits?: number
): number => {
  const result = new Decimal(a).div(new Decimal(b));
  return digits !== undefined ? parseFloat(result.toFixed(digits)) : result.toNumber();
};

/**
 * 安全的乘法运算
 * 用于解决 JavaScript 浮点数精度问题
 * 例：decimalMult(100.05, 0.1) 返回 10.005（而非精度丢失的结果）
 * 
 * @param a 乘数
 * @param b 被乘数
 * @param digits 保留小数位数（默认不限制）
 * @returns 乘法结果
 */
export const decimalMult = (
  a: number | string,
  b: number | string,
  digits?: number
): number => {
  const result = new Decimal(a).mul(new Decimal(b));
  return digits !== undefined ? parseFloat(result.toFixed(digits)) : result.toNumber();
};

/**
 * 安全的减法运算（支持多个数字）
 * 用于解决 JavaScript 浮点数精度问题
 * 例：decimalSub(100, 0.01, 0.02) 返回 99.97
 * 
 * @param args 要相减的数字序列
 * @returns 减法结果
 */
export const decimalSub = (...args: (number | string)[]): number => {
  if (args.length === 0) return 0;
  let result = new Decimal(args[0]);
  for (let i = 1; i < args.length; i++) {
    result = result.sub(new Decimal(args[i]));
  }
  return result.toNumber();
};

/**
 * 安全的加法运算（支持多个数字）
 * 用于解决 JavaScript 浮点数精度问题
 * 例：decimalAdd(0.1, 0.2, 0.3) 返回 0.6（而非 0.6000000000000001）
 * 
 * @param args 要相加的数字序列
 * @returns 加法结果
 */
export const decimalAdd = (...args: (number | string)[]): number => {
  if (args.length === 0) return 0;
  let result = new Decimal(args[0]);
  for (let i = 1; i < args.length; i++) {
    result = result.add(new Decimal(args[i]));
  }
  return result.toNumber();
};

/**
 * 格式化为指定小数位的字符串
 * 用于金额和积分的显示
 * 
 * @param value 要格式化的数值
 * @param digits 小数位数（默认 2）
 * @returns 格式化后的字符串
 */
export const toDecimalFixed = (
  value: number | string,
  digits: number = 2
): string => {
  return new Decimal(value).toFixed(digits);
};

/**
 * 四舍五入到指定小数位
 * 用于中间计算结果的舍入
 * 
 * @param value 要舍入的数值
 * @param digits 小数位数（默认 2）
 * @returns 舍入后的数字
 */
export const decimalRound = (
  value: number | string,
  digits: number = 2
): number => {
  return parseFloat(new Decimal(value).toFixed(digits));
};

/**
 * 比较两个数字是否相等（考虑精度）
 * 
 * @param a 数字 A
 * @param b 数字 B
 * @param digits 比较精度（默认 2）
 * @returns 是否相等
 */
export const decimalEqual = (
  a: number | string,
  b: number | string,
  digits: number = 2
): boolean => {
  const aFixed = new Decimal(a).toFixed(digits);
  const bFixed = new Decimal(b).toFixed(digits);
  return aFixed === bFixed;
};

/**
 * 比较两个数字的大小
 * 
 * @param a 数字 A
 * @param b 数字 B
 * @returns -1 (a < b)、0 (a === b) 或 1 (a > b)
 */
export const decimalCompare = (
  a: number | string,
  b: number | string
): number => {
  return new Decimal(a).comparedTo(new Decimal(b));
};
