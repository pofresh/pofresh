import { describe, expect, it } from 'vitest';
import taskManager from '../../lib/common/manager/taskManager.js';

// set timeout for test
taskManager.timeout = 100;

const WAIT_TIME = 200;

describe('#taskManager', () => {
    it('should add task and execute it', done => {
        const key = 'key-1';
        const fn = task => {
            taskCount++;
            task.done();
        };
        const onTimeout = () => {
            expect.fail('should not timeout.');
        };
        let taskCount = 0;

        taskManager.addTask(key, fn, onTimeout);

        setTimeout(() => {
            expect(taskCount).toBe(1);
            done();
        }, WAIT_TIME);
    });

    it('should fire timeout callback if task timeout', done => {
        const key = 'key-1';
        const fn = _task => {
            taskCount++;
        };
        const onTimeout = () => {
            timeoutCount++;
        };
        let taskCount = 0;
        let timeoutCount = 0;

        taskManager.addTask(key, fn, onTimeout);

        setTimeout(() => {
            expect(taskCount).toBe(1);
            expect(timeoutCount).toBe(1);
            done();
        }, WAIT_TIME);
    });

    it('should not fire timeout after close the task', done => {
        const key = 'key-1';
        const fn = _task => {
            taskCount++;
        };
        const onTimeout = () => {
            timeoutCount++;
        };
        let taskCount = 0;
        let timeoutCount = 0;

        taskManager.addTask(key, fn, onTimeout);

        process.nextTick(() => {
            taskManager.closeQueue(key, true);

            setTimeout(() => {
                expect(taskCount).toBe(1);
                expect(timeoutCount).toBe(0);
                done();
            }, WAIT_TIME);
        });
    });

    it('should be ok to remove a queue not exist', () => {
        const key = 'key-n';
        taskManager.closeQueue(key, true);
    });
});
