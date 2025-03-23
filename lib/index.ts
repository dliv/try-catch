// lib/index.ts from https://github.com/dliv/try-catch
// Licensed as https://www.wtfpl.net/, do what you want, including removing attribution

export type OkResult<T> = {
    error: null;
    data: T;
};

export type ErrorResult = {
    error: Error;
    data: null;
};

type OkPair<T> = [T, null];

type ErrorPair = [null, Error];

type OkResultPair<T> = OkResult<T> & OkPair<T>;

type ErrorResultPair = ErrorResult & ErrorPair;

export type ResultPair<T> = OkResultPair<T> | ErrorResultPair;

/** makes an array object hybrid based on an initial { data, error } object */
export const asResultPair = <T = unknown>(result: ErrorResult | OkResult<T>): ResultPair<T> => {
    // preconditions, browser does not have a real assert
    const nullCount = (result.error ? 1 : 0) + (result.data ? 1 : 0);
    /* c8 ignore start */
    if (nullCount !== 1) {
        throw new TypeError(
            'try-catch library internal error - asResultPair() must have one of data xor error',
        );
    }
    /* c8 ignore stop */
    return Object.assign(
        [null, null],
        result.error ? { 1: result.error } : { 0: result.data },
        result,
    ) as ResultPair<T>;
};

export type Awaitable<T> =
    | T
    // await doesn't strictly require a Promise, e.g. it works with thenables
    | PromiseLike<T>;

/**
 * Handles async operations by converting thrown errors into returned values.
 * Similar to Go/Rust error handling patterns.
 *
 * @example
 * // Array destructuring
 * const [data, error] = await tryCatch(fetch('/api/users'));
 *
 * // Object destructuring
 * const { data, error } = await tryCatch(response.json());
 *
 * The return value can be accessed as an array (pair) or an object.
 *
 * @param val - Promise, value or thenable to process
 * @returns ResultPair that can be destructured as [data, error] or {data, error}
 */
export async function tryCatch<T = unknown>(val: Awaitable<T>): Promise<ResultPair<T>> {
    try {
        const data = await val;
        return asResultPair({ data, error: null });
    } catch (valError: unknown) {
        return asResultPair<never>({ data: null, error: asError(valError) });
    }
}

type SyncThunk<T> = () => T;

export function tryCatchSync<T = unknown>(val: T | SyncThunk<T>): ResultPair<T> {
    try {
        const data = typeof val === 'function' ? (val as SyncThunk<T>)() : val;
        return asResultPair({ data, error: null });
    } catch (valError: unknown) {
        return asResultPair<never>({ data: null, error: asError(valError) });
    }
}

/**
 * When you have something that might be an Error and you definitely want an error.
 * @param maybeError val to wrap if necessary (probably a caught value).
 * @returns an instance of Error with a `cause` if wrapped
 */
export function asError(maybeError: unknown): Error {
    const error =
        maybeError instanceof Error
            ? maybeError
            : new Error('wrapped Error because error value is not an instance of Error', {
                  cause: maybeError,
              });
    return error;
}
