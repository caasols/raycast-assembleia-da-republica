/**
 * Shared vitest setup: registers the jest-dom matchers (toHaveAttribute,
 * toBeInTheDocument, ...) used by the component tests. Adding matchers is
 * environment-agnostic, so this is safe for the node-environment tests too.
 */
import { beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { __resetCaches } from "./raycast-api-stub";

/**
 * `useCachedPromise` keeps a module-level `Cache`, which outlives an individual
 * test. Without this reset a value cached by one test satisfies the next one
 * before its own promise settles — so a test asserting an empty state, or a
 * loading state, silently passes on the *previous* test's data. Clearing it
 * here rather than per-file means no test has to remember.
 */
beforeEach(__resetCaches);
