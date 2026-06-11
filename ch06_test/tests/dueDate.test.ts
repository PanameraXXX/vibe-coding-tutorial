// isValidDueDate 校验函数 —— 5 个用例
import { describe, it, expect } from 'vitest';
import { isValidDueDate } from '../../ch05_manual_todolist/todolist/server/src/types/todo.ts';

describe('isValidDueDate', () => {
  it('合法 YYYY-MM-DD 返回 true', () => {
    expect(isValidDueDate('2026-06-10')).toBe(true);
  });

  it('格式不对（缺前导 0）返回 false', () => {
    expect(isValidDueDate('2026-6-1')).toBe(false);
  });

  it('真实不存在的日期（2 月 30 日）返回 false', () => {
    expect(isValidDueDate('2026-02-30')).toBe(false);
  });

  it('非字符串返回 false', () => {
    expect(isValidDueDate(null)).toBe(false);
    expect(isValidDueDate(undefined)).toBe(false);
    expect(isValidDueDate(20260610)).toBe(false);
  });

  it('完全无意义字符串返回 false', () => {
    expect(isValidDueDate('明天')).toBe(false);
    expect(isValidDueDate('')).toBe(false);
  });
});
