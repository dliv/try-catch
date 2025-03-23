// lib/magic.ts from https://github.com/dliv/try-catch
// Licensed as https://www.wtfpl.net/, do what you want, including removing attribution

import { asError, asResultPair, Awaitable, ErrorResult, OkResult, ResultPair } from './index.js';

/** for instance check so we can passthrough ResultPairs */
class MagicResultPair extends Array {}

// like the main `asResultPair` but returns an instance of MagicResultPair
const asMagicResultPair = <T = unknown>(result: ErrorResult | OkResult<T>): ResultPair<T> => {
    const magic = new MagicResultPair();
    const regular = asResultPair(result) satisfies ResultPair<T>;
    Object.assign(magic, regular);
    return magic as unknown as ResultPair<T>;
};

export type NestableThunk<T> = () => Awaitable<T> | NestableThunk<T>;

/**
 * Tries too hard.
 */
// tries harder to completely resolve nested values and unify sync vs async behavior
// this is probably too much magic and it would require a lot more type complexity to automatically get the correct return type
export async function tryMagic<In = unknown, Out = In>(
    valOrThunk: Awaitable<In> | NestableThunk<In>,
): Promise<ResultPair<Out>> {
    try {
        const awaited = await valOrThunk;
        if (typeof awaited === 'function') {
            return await tryMagic((awaited as NestableThunk<Out>)());
        }
        if (awaited instanceof Error) {
            throw awaited;
        }
        if (valOrThunk instanceof MagicResultPair) {
            return valOrThunk as unknown as ResultPair<Out>;
        }
        const result = asMagicResultPair({ data: awaited, error: null }) satisfies ResultPair<In>;
        // the types allow nesting / recursion in the argument but do not unpack it in the return type
        return result as ResultPair<Out>;
    } catch (valError: unknown) {
        return asMagicResultPair<never>({ data: null, error: asError(valError) });
    }
}
