// test/magic.test.ts from https://github.com/dliv/try-catch
// Licensed as https://www.wtfpl.net/, do what you want, including removing attribution

import { test } from 'node:test';

import { NestableThunk, tryMagic } from '../lib/magic';
import { check } from './index.test';

test('resolved promise is okay', async () => {
    const actual = await tryMagic(Promise.resolve(42));
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
});

// similar to _.attempt
test('ok thunk is ok', async () => {
    const t = () => 42;
    const actual = await tryMagic(t);
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
});

test('sync value is okay', async () => {
    const actual = await tryMagic(42);
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
});

test('ok result is okay', async () => {
    const firstActual = await tryMagic(42);
    const actual = await tryMagic<typeof firstActual, number>(firstActual);
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
});

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
    const actual = await tryMagic(thenable);
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
});

test('nested ok thunk is ok', async () => {
    const makeNestedThunk = (value: number) => {
        const thunk = () => () => Promise.resolve(() => () => value);
        return thunk as unknown as NestableThunk<number>;
    };

    const nested = makeNestedThunk(42);
    const actual = await tryMagic(nested);
    check({
        actual,
        expectedData: 42,
        expectedError: null,
    });
});

test('rejected promise is error', async () => {
    const e = new Error('42');
    const p = Promise.reject(e);
    const actual = await tryMagic(p);
    check({
        actual,
        expectedData: null,
        expectedError: e,
    });
});

test('promise rejected with non error returns error as error', async () => {
    const p = Promise.reject('42');
    const actual = await tryMagic(p);
    check({
        actual,
        expectedData: null,
        expectedError: new Error('wrapped Error because error value is not an instance of Error', {
            cause: '42',
        }),
    });
});

// similar to _.attempt
test('error thrown in thunk is error', async () => {
    const t = () => {
        throw new Error('42');
    };
    const actual = await tryMagic(t);
    check({
        actual,
        expectedData: null,
        expectedError: new Error('42'),
    });
});

test('sync error value is error', async () => {
    const actual = await tryMagic(new Error('42'));
    check({
        actual,
        expectedData: null,
        expectedError: new Error('42'),
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
    const actual = await tryMagic(thenable);
    check({
        actual,
        expectedData: null,
        expectedError: new Error('42'),
    });
});

test('nested error thunk is error', async () => {
    const makeNestedThunk = (value: unknown) => () => () =>
        Promise.resolve(() => () => Promise.reject(new Error(String(value))));

    const nested = makeNestedThunk(42);
    const actual = await tryMagic(nested);
    check({
        actual,
        expectedData: null,
        expectedError: new Error('42'),
    });
});
