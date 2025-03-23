// test/index.test.ts from https://github.com/dliv/try-catch
// Licensed as https://www.wtfpl.net/, do what you want, including removing attribution

import assert from 'node:assert';
import { test } from 'node:test';

import { ResultPair, tryCatch, tryCatchSync } from '../lib/index';

export type Check<T = unknown> = {
    actual: ResultPair<T>;
    expectedData: T | null;
    expectedError: Error | null;
};

export const check = <T = unknown>({ actual, expectedData, expectedError }: Check<T>) => {
    // as pair
    {
        const [data, error] = actual;
        assert.deepStrictEqual([data, error], [expectedData, expectedError]);
        assert(actual instanceof Array);
    }
    // as object
    {
        const { data, error } = actual;
        assert.deepStrictEqual({ data, error }, { data: expectedData, error: expectedError });
        assert(Object.prototype.hasOwnProperty.call(actual, 'data'));
        assert(Object.prototype.hasOwnProperty.call(actual, 'error'));
    }
};

test('resolved promise is okay', async () => {
    const p = Promise.resolve(42);
    const actual = await tryCatch(p);
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
});

test('rejected promise is error', async () => {
    const p = Promise.reject(new Error('42'));
    const actual = await tryCatch(p);
    check({
        actual,
        expectedData: null,
        expectedError: new Error('42'),
    });
});

// testing types via satisfies - no need to actually execute this function
(async function typeAssertions() {
    const result = await tryCatch(42);
    // as object
    {
        const { data, error } = result;
        if (data) {
            data satisfies number;
            error satisfies null;
        }
        if (error) {
            data satisfies null;
            error satisfies Error;
        }
    }
    // as pair
    {
        const [data, error] = result;
        if (data) {
            data satisfies number;
            error satisfies null;
        }
        if (error) {
            data satisfies null;
            error satisfies Error;
        }
    }
});

test('promise rejected with non error returns error as error', async () => {
    const p = Promise.reject('42');
    const actual = await tryCatch(p);
    check({
        actual,
        expectedData: null,
        expectedError: new Error('wrapped Error because error value is not an instance of Error', {
            cause: '42',
        }),
    });
});

// similar to _.attempt
test('ok sync thunk is ok', () => {
    const actual = tryCatchSync(() => 42);
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
});

test('sync value is okay', async () => {
    const actual = await tryCatch(42);
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
    assert.deepStrictEqual(actual, tryCatchSync(42));
});

// similar to _.attempt
test('error thrown in thunk is error', () => {
    const t = () => {
        throw new Error('42');
    };
    const actual = tryCatchSync(t);
    check({
        actual,
        expectedData: null,
        expectedError: new Error('42'),
    });
});

// --- thenables - okay as long as we get for free, `await` works with PromiseLike

test('ok thenable is ok', async () => {
    const makeThenable = (value: number) => {
        // from MDN example: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#thenables
        const aThenable = {
            then(onFulfilled: any) {
                onFulfilled({
                    // The thenable is fulfilled with another thenable
                    then(onFulfilled: any) {
                        onFulfilled(value);
                    },
                });
            },
        };
        return aThenable as unknown as PromiseLike<number>;
    };

    const thenable = makeThenable(42);
    const actual = await tryCatch(thenable);
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
});

test('error thenable is error', async () => {
    const makeThenable = (value: unknown) => {
        // from MDN example: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#thenables
        const aThenable = {
            then(onFulfilled: any) {
                onFulfilled({
                    // The thenable is fulfilled with another thenable
                    then(_: unknown, onRejected: any) {
                        onRejected(new Error(String(value)));
                    },
                });
            },
        };
        return aThenable;
    };

    const thenable = makeThenable(42);
    const actual = await tryCatch(thenable);
    check({
        actual,
        expectedData: null,
        expectedError: new Error('42'),
    });
});
