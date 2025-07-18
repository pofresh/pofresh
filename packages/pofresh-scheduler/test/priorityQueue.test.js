const PriorityQueue = require('../lib/priorityQueue');

describe('PriorityQueue', () => {
  describe('createPriorityQueue', () => {
    test('should create a new priority queue instance', () => {
      const queue = PriorityQueue.createPriorityQueue();
      expect(queue).toBeDefined();
      expect(typeof queue.offer).toBe('function');
      expect(typeof queue.pop).toBe('function');
      expect(typeof queue.size).toBe('function');
      expect(typeof queue.peek).toBe('function');
    });
  });

  describe('offer', () => {
    test('should add elements to the queue', () => {
      const queue = PriorityQueue.createPriorityQueue();
      queue.offer(5);
      expect(queue.size()).toBe(1);
    });

    test('should maintain min-heap property', () => {
      const queue = PriorityQueue.createPriorityQueue();
      queue.offer(3);
      queue.offer(1);
      queue.offer(4);
      queue.offer(2);
      
      expect(queue.pop()).toBe(1);
      expect(queue.pop()).toBe(2);
      expect(queue.pop()).toBe(3);
      expect(queue.pop()).toBe(4);
    });

    test('should handle duplicate values', () => {
      const queue = PriorityQueue.createPriorityQueue();
      queue.offer(3);
      queue.offer(3);
      queue.offer(1);
      
      expect(queue.pop()).toBe(1);
      expect(queue.pop()).toBe(3);
      expect(queue.pop()).toBe(3);
    });

    test('should handle negative numbers', () => {
      const queue = PriorityQueue.createPriorityQueue();
      queue.offer(-1);
      queue.offer(-5);
      queue.offer(0);
      
      expect(queue.pop()).toBe(-5);
      expect(queue.pop()).toBe(-1);
      expect(queue.pop()).toBe(0);
    });

    test('should handle floating point numbers', () => {
      const queue = PriorityQueue.createPriorityQueue();
      queue.offer(3.14);
      queue.offer(2.71);
      queue.offer(1.41);
      
      expect(queue.pop()).toBe(1.41);
      expect(queue.pop()).toBe(2.71);
      expect(queue.pop()).toBe(3.14);
    });
  });

  describe('pop', () => {
    test('should return null for empty queue', () => {
      const queue = PriorityQueue.createPriorityQueue();
      expect(queue.pop()).toBeNull();
    });

    test('should return elements in priority order', () => {
      const queue = PriorityQueue.createPriorityQueue();
      queue.offer(10);
      queue.offer(5);
      queue.offer(15);
      
      expect(queue.pop()).toBe(5);
      expect(queue.pop()).toBe(10);
      expect(queue.pop()).toBe(15);
    });

    test('should decrease size after pop', () => {
      const queue = PriorityQueue.createPriorityQueue();
      queue.offer(1);
      queue.offer(2);
      queue.offer(3);
      
      expect(queue.size()).toBe(3);
      queue.pop();
      expect(queue.size()).toBe(2);
    });
  });

  describe('size', () => {
    test('should return 0 for empty queue', () => {
      const queue = PriorityQueue.createPriorityQueue();
      expect(queue.size()).toBe(0);
    });

    test('should return correct size after operations', () => {
      const queue = PriorityQueue.createPriorityQueue();
      expect(queue.size()).toBe(0);
      
      queue.offer(1);
      expect(queue.size()).toBe(1);
      
      queue.offer(2);
      expect(queue.size()).toBe(2);
      
      queue.pop();
      expect(queue.size()).toBe(1);
    });
  });

  describe('peek', () => {
    test('should return null for empty queue', () => {
      const queue = PriorityQueue.createPriorityQueue();
      expect(queue.peek()).toBeNull();
    });

    test('should return smallest element without removing', () => {
      const queue = PriorityQueue.createPriorityQueue();
      queue.offer(3);
      queue.offer(1);
      queue.offer(2);
      
      expect(queue.peek()).toBe(1);
      expect(queue.size()).toBe(3);
    });
  });

  describe('performance', () => {
    test('should handle large number of elements', () => {
      const queue = PriorityQueue.createPriorityQueue();
      const count = 1000;
      const values = [];
      
      // Generate random values
      for (let i = 0; i < count; i++) {
        const val = Math.random() * count;
        values.push(val);
        queue.offer(val);
      }
      
      // Verify they come out in order
      let prev = -Infinity;
      for (let i = 0; i < count; i++) {
        const current = queue.pop();
        expect(current).toBeGreaterThanOrEqual(prev);
        prev = current;
      }
      
      expect(queue.size()).toBe(0);
    });
  });
});