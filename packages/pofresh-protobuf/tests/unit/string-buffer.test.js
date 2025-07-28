import { describe, it, expect } from 'vitest';

function joinTest(num) {
  let arr = [];
  for (let i = 0; i < num; i++) {
    arr.push(i + '');
  }

  let start = Date.now();
  let str = '';

  for (let i = 0; i < num; i++) {
    str += arr[i];
  }

  let end = Date.now();
  const time1 = end - start;

  start = Date.now();
  const joinArr = [];
  for (let i = 0; i < num; i++) {
    joinArr.push(arr[i]);
  }
  const str1 = joinArr.join('');
  end = Date.now();
  const time2 = end - start;

  return { time1, time2, str, str1 };
}

describe('String Buffer Performance Tests', () => {
  it('should compare string concatenation vs array join for 100 items', () => {
    const result = joinTest(100);
    expect(result.str).toBe(result.str1);
    console.log('Test count: 100, concat time:', result.time1, 'ms, join time:', result.time2, 'ms');
  });

  it('should compare string concatenation vs array join for 50000 items', () => {
    const result = joinTest(50000);
    expect(result.str).toBe(result.str1);
    console.log('Test count: 50000, concat time:', result.time1, 'ms, join time:', result.time2, 'ms');
  });

  it('should compare string concatenation vs array join for 100000 items', () => {
    const result = joinTest(100000);
    expect(result.str).toBe(result.str1);
    console.log('Test count: 100000, concat time:', result.time1, 'ms, join time:', result.time2, 'ms');
  });

  it('should compare string concatenation vs array join for 200000 items', () => {
    const result = joinTest(200000);
    expect(result.str).toBe(result.str1);
    console.log('Test count: 200000, concat time:', result.time1, 'ms, join time:', result.time2, 'ms');
  });
});