import { afterAll, afterEach, beforeAll } from 'vitest'
import { assertNoPendingMocks, installFetchMock, restoreFetch } from './fetchMock'

beforeAll(() => installFetchMock())
afterEach(() => assertNoPendingMocks())
afterAll(() => restoreFetch())
