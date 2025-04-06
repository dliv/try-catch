# try-catch

Treat errors as values like Go, Rust, React hooks, etc.

[![npm version](https://img.shields.io/npm/v/@dliv/try-catch.svg)](https://www.npmjs.com/package/@dliv/try-catch)
[![License: WTFPL](https://img.shields.io/badge/license-WTFPL-blue)](https://www.wtfpl.net/)

```typescript
import { tryCatch } from '@dliv/try-catch';

// Using array destructuring (Go-style)
async function fetchUserWithArray(id: string) {
    const [user, err] = await tryCatch(fetchUserFromAPI(id));

    if (err) {
        console.error('Failed to fetch user:', err);
        return null;
    }

    return user;
}

// Using object destructuring
async function fetchUserWithObject(id: string) {
    const { data, error } = await tryCatch(fetchUserFromAPI(id));

    if (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }

    return data;
}
```

Yes: that one method is a mind reader.

## Install

```bash
npm i @dliv/try-catch
```

### Benefits

- ✅ Keeps your happy path unindented and pairs well with guard clauses
- ✅ Dual access pattern (array destructuring or object properties)
- ✅ Simple: no dependencies, less than 100 LOC, 100% branch coverage, [copy-pastable single-file](./lib/index.ts)
- ✅ Type Safety and Runtime Safety - the `error` is always an instance of `Error`

## Error Handling Comparison

### Traditional try/catch

With a traditional `try ... catch` you have a choice between losing context around what
threw or lots of boilerplate wrapping individual calls.

```typescript
async function fetchUserData(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw response;
        }
        return await response.json();
    } catch (error) {
        // what threw? hopefully `error` is detailed (but it might not even be an Error)
        console.error('Error:', error);
        return null;
    }
}
```

### With try-catch

```typescript
async function fetchUserData(userId) {
    const [response] = await tryCatch(fetch(`/api/users/${userId}`));
    const [json] = await tryCatch(response?.ok ? response.json() : null);
    return json;
}
```

Or if you need fine grained error handling

```typescript
async function fetchUserData(userId) {
    const [response, fetchError] = await tryCatch(fetch(`/api/users/${userId}`));
    if (fetchError) {
        console.error('Fetch error:', fetchError);
        return null;
    }

    if (!response.ok) {
        console.error('Response not okay:', response.status);
        return null;
    }

    const [json, jsonError] = await tryCatch(response.json());
    if (jsonError) {
        console.error('JSON parsing error:', jsonError);
        return null;
    }

    return json;
}
```

## Inspiration

- The errors as values approach in [Go](https://go.dev/blog/errors-are-values) and [Rust](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html)
- Popular React libraries like this [TanStack](https://tanstack.com/query/latest/docs/framework/react/examples/basic) example: `const { status, data, error, isFetching } = usePosts()`
- YouTube videos by [AirShip](https://www.youtube.com/watch?v=ITogH7lJTyE) and [Theo](https://www.youtube.com/watch?v=Y6jT-IkV0VM)
- LoDash's [attempt](https://lodash.com/docs/4.17.15#attempt) to do this for sync code (comparable to our `tryCatchSync`)

## API

### `tryCatch<T>(val: Awaitable<T>): Promise<ResultPair<T>>`

Accepts a value, Promise, or thenable and returns a Promise containing a result pair / struct.

```typescript
// With Promise
const [data, error] = await tryCatch(fetch('/api/data'));

// With direct value (automatically wrapped in a resolved Promise)
const [data, error] = await tryCatch(42);
```

### `tryCatchSync<T>(val: T | (() => T)): ResultPair<T>`

Synchronous version that accepts a value or function and returns a result pair immediately.

```typescript
// With function that might throw
const [data, error] = tryCatchSync(() => JSON.parse(jsonString));

// With direct value
const [data, error] = tryCatchSync(42);
```

### Return Type: `ResultPair<T>`

The return value can be accessed in two ways:

1. Array destructuring: `const [data, error] = await tryCatch(...)`
2. Object properties: `const { data, error } = await tryCatch(...)`

If successful:

- `data` contains the returned value
- `error` is `null`

If an error occurs:

- `data` is `null`
- `error` contains the Error object (non-Error values are wrapped in an Error with the original as `cause`)

### `asError(maybeError: unknown): Error`

Utility function that ensures a value is an Error instance. If the value is already an Error, it's returned as-is. Otherwise, it's wrapped in a new Error with the original value as `cause`.

```typescript
try {
    // something that might throw
} catch (e) {
    const error = asError(e); // guaranteed to be an Error instance
    console.error(error);
}
```

## License

[WTFPL](https://www.wtfpl.net/)

Less formally: Do what you want. The [index.ts](./lib/index.ts) is short and dependency free: copy/paste/change.
