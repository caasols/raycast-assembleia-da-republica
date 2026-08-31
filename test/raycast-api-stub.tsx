/**
 * Stand-in for `@raycast/api` under vitest.
 *
 * The real package is injected by the Raycast runtime and exposes no resolvable
 * Node entry point, so Vite cannot load it even in order to mock it.
 * `vitest.config.ts` aliases the package to this file.
 *
 * The components render plain DOM so tests can drive the real command code:
 * type into a field, click an action, assert what the command did. One fidelity
 * detail is deliberate, because commands depend on it: `List` renders
 * `List.EmptyView` only when it has no `List.Item` children, matching Raycast,
 * which hides the empty view as soon as there are results.
 *
 * The stub covers only the API surface this extension actually uses, and grows
 * when a command needs more (CLAUDE.md §3) — it began as raycast-buzz's copy
 * and the 2026-08-20 audit trimmed the inherited Form/LocalStorage/Keyboard/
 * toast surface nothing here ever drove (context.md §6.3, PLAN C7).
 */
import { Children, isValidElement, useState } from "react";
import type { ReactNode } from "react";
import { vi } from "vitest";

/* ------------------------------------------------------------------ effects */

export const getPreferenceValues = vi.fn(() => ({}) as never);

export const Icon = new Proxy({}, { get: (_t, name) => String(name) }) as Record<string, string>;
export const Color = new Proxy({}, { get: (_t, name) => String(name) }) as Record<string, string>;

/*
 * No command here shows toasts — these three exist because **@raycast/utils
 * itself** calls them: usePromise's failure path reads environment.launchType,
 * compares it against LaunchType, and reports the error via
 * showToast(Toast.Style.Failure). Remove any of them and every rejected
 * promise becomes an unhandled error instead of reaching the component's
 * error branch — 19 failure-state tests found that out at once.
 */
export const LaunchType = { UserInitiated: "userInitiated", Background: "background" };

export const Toast = {
  Style: { Success: "success", Failure: "failure", Animated: "animated" },
};

export const showToast = vi.fn(async (options?: unknown) => options);

export const environment = {
  extensionName: "assembleia-da-republica",
  commandName: "test",
  isDevelopment: true,
  launchType: LaunchType.UserInitiated,
};

/* --------------------------------------------------------------------- Cache */

/**
 * An in-memory stand-in for Raycast's `Cache`, which `useCachedPromise` from
 * @raycast/utils constructs on mount. Without it every command using that hook
 * dies with "Cache is not a constructor" before rendering anything.
 *
 * `subscribe` returns its unsubscriber and notifies on write, because the hook
 * relies on both to re-render when a cached value lands.
 */
type CacheSubscriber = (key: string | undefined, data: string | undefined) => void;

// Every instance is tracked so `__resetCaches` can clear them all. Necessary
// because @raycast/utils holds a module-level Cache: without a reset, a value
// cached by one test leaks into the next and a "still loading" assertion sees
// the previous test's data.
const cacheInstances = new Set<Cache>();

export function __resetCaches(): void {
  for (const instance of cacheInstances) {
    instance.clear();
  }
}

export class Cache {
  private readonly store = new Map<string, string>();
  private readonly subscribers = new Set<CacheSubscriber>();

  constructor(_options?: { namespace?: string; capacity?: number }) {
    cacheInstances.add(this);
  }

  // Arrow properties rather than prototype methods: useCachedPromise pulls
  // these off the instance and calls them detached, which would leave `this`
  // undefined on a normal method.
  private readonly notify = (key: string | undefined, data: string | undefined): void => {
    for (const subscriber of this.subscribers) {
      subscriber(key, data);
    }
  };

  readonly get = (key: string): string | undefined => this.store.get(key);

  readonly has = (key: string): boolean => this.store.has(key);

  readonly set = (key: string, data: string): void => {
    this.store.set(key, data);
    this.notify(key, data);
  };

  readonly remove = (key: string): boolean => {
    const existed = this.store.delete(key);
    this.notify(key, undefined);
    return existed;
  };

  readonly clear = (_options?: { notifySubscribers?: boolean }): void => {
    this.store.clear();
    this.notify(undefined, undefined);
  };

  readonly subscribe = (subscriber: CacheSubscriber): (() => void) => {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  };

  get isEmpty(): boolean {
    return this.store.size === 0;
  }
}

/* ------------------------------------------------------------------ shared */

// Renders any icon prop as a plain string attribute so tests can assert on
// them without caring whether the value is a raw emoji or one of the `Icon.X`
// proxy strings.
function iconAttr(icon: unknown): string | undefined {
  if (icon === undefined || icon === null) return undefined;
  // Raycast accepts a bare Icon as well as the `{ source, tintColor }` form,
  // and the tinted form is how a list conveys status. Stringifying it whole
  // yields "[object Object]", which no test can meaningfully assert on, so the
  // two fields are joined instead.
  if (typeof icon === "object") {
    // `fallback` is included because it is load-bearing for remote images: the
    // deputy photo endpoint redirects to a CDN that 404s when no photo exists,
    // and without a fallback those rows render broken. A test cannot assert
    // what it cannot see, so it is serialised alongside source and tint.
    const { source, tintColor, fallback } = icon as {
      source?: unknown;
      tintColor?: unknown;
      fallback?: unknown;
    };
    return [source, tintColor, fallback === undefined ? undefined : `fallback:${String(fallback)}`]
      .filter((part) => part !== undefined && part !== null)
      .map(String)
      .join(" ");
  }
  return String(icon);
}

/* --------------------------------------------------------------------- List */

function ListItem(props: {
  title?: string;
  subtitle?: string | { value?: string | null; tooltip?: string | null };
  actions?: ReactNode;
  detail?: ReactNode;
  accessories?: { text?: string; date?: Date; tag?: unknown; icon?: unknown; tooltip?: string }[];
  icon?: unknown;
  // The stub does no native filtering, so keywords are serialised rather than
  // matched against: mutation testing showed every command's keywords could be
  // emptied without a test noticing, because the stub accepted the prop and
  // rendered nothing — the same invisibility `fallback` had before D57.
  keywords?: string[];
}) {
  return (
    <div
      data-testid="list-item"
      data-title={props.title}
      data-subtitle={typeof props.subtitle === "object" ? (props.subtitle?.value ?? "") : props.subtitle}
      // The real subtitle can carry its own tooltip, and for the vote tally
      // that tooltip is the only thing explaining what the numbers mean.
      data-subtitle-tooltip={typeof props.subtitle === "object" ? (props.subtitle?.tooltip ?? "") : undefined}
      data-icon={iconAttr(props.icon)}
      data-keywords={props.keywords?.join(" ")}
      data-accessories={props.accessories?.map((a) => a.text ?? (a.date ? a.date.toISOString() : "")).join(" ")}
      // The vote tally renders as bare numbers; its tooltip is the only thing
      // that says what they mean, so a test has to be able to see it.
      data-accessory-tooltips={props.accessories
        ?.map((a) => a.tooltip ?? "")
        .filter(Boolean)
        .join(" | ")}
    >
      {props.actions}
      {props.detail}
    </div>
  );
}

function ListEmptyView(props: { title?: string; description?: string; actions?: ReactNode; icon?: unknown }) {
  return (
    <div
      data-testid="empty-view"
      data-title={props.title}
      data-description={props.description}
      data-icon={iconAttr(props.icon)}
    >
      {props.actions}
    </div>
  );
}

/**
 * `List.Item.Detail`. Raycast renders the detail pane only for the selected
 * item; the stub renders it inline for whichever items declare one, so a test
 * can assert the markdown a row would show without driving selection, which
 * jsdom cannot reproduce.
 */
function ListItemDetail(props: { markdown?: string; isLoading?: boolean; metadata?: ReactNode }) {
  return (
    <div data-testid="item-detail" data-markdown={props.markdown} data-loading={String(Boolean(props.isLoading))}>
      {props.metadata}
    </div>
  );
}

/**
 * `List.Item.Detail.Metadata` and its `TagList`. Added for the vote bar, which
 * is the first thing here that needs structured, *coloured* detail rather than
 * markdown: a tag's colour is the whole point, and markdown cannot carry one.
 *
 * Each tag exposes its text and colour as attributes so a test can assert that
 * a party is tinted for the side it actually took — the assertion that matters,
 * and the one a markdown-only stub could not make.
 */
function MetadataTagListItem(props: { text: string; color?: unknown }) {
  return <span data-testid="tag" data-text={props.text} data-color={String(props.color ?? "")} />;
}

function MetadataTagList(props: { title: string; children?: ReactNode }) {
  return (
    <div data-testid="tag-list" data-title={props.title}>
      {props.children}
    </div>
  );
}

function MetadataLabel(props: { title: string; text?: string }) {
  return <div data-testid="metadata-label" data-title={props.title} data-text={props.text} />;
}

function DetailMetadata(props: { children?: ReactNode }) {
  return <div data-testid="metadata">{props.children}</div>;
}

/**
 * `List.Dropdown`, Raycast's search-bar accessory. Rendered as a real `<select>`
 * so a test can change it the way a user would, rather than reaching into the
 * command's state. Like Raycast, it selects its first item by default, so a
 * dropdown with no items yields an empty value rather than a phantom one.
 */
function ListDropdown(props: {
  tooltip?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  children?: ReactNode;
}) {
  const items: { value: string; title: string }[] = [];
  const collectItems = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === ListDropdownItem) {
        items.push(child.props as { value: string; title: string });
      } else if (child.type === ListDropdownSection) {
        collectItems((child.props as { children?: ReactNode }).children);
      }
    });
  };
  collectItems(props.children);

  return (
    <select
      data-testid="dropdown"
      data-tooltip={props.tooltip}
      value={props.value ?? props.defaultValue ?? items[0]?.value ?? ""}
      onChange={(e) => props.onChange?.(e.target.value)}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.title}
        </option>
      ))}
    </select>
  );
}

function ListDropdownItem(props: { value: string; title: string }) {
  return <option value={props.value}>{props.title}</option>;
}

function ListDropdownSection(props: { title?: string; children?: ReactNode }) {
  return <optgroup label={props.title}>{props.children}</optgroup>;
}

export function List(props: {
  children?: ReactNode;
  isLoading?: boolean;
  isShowingDetail?: boolean;
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  onSearchTextChange?: (text: string) => void;
  throttle?: boolean;
  filtering?: boolean | { keepSectionOrder: boolean };
  searchBarAccessory?: ReactNode;
  pagination?: { pageSize: number; hasMore: boolean; onLoadMore: () => void };
}) {
  const items: ReactNode[] = [];
  const emptyViews: ReactNode[] = [];

  Children.forEach(props.children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === ListEmptyView) {
      emptyViews.push(child);
    } else {
      items.push(child);
    }
  });

  return (
    <div
      data-testid="list"
      data-loading={String(Boolean(props.isLoading))}
      data-showing-detail={String(Boolean(props.isShowingDetail))}
      data-navigation-title={props.navigationTitle}
      // Whether Raycast itself would be filtering this list, per the documented
      // default in SearchBarInterface: `filtering` is false when
      // onSearchTextChange is specified and true otherwise, unless set
      // explicitly. The stub cannot perform that filtering, but this makes the
      // premise assertable, so a view whose empty-state copy is written for
      // native filtering can pin that it still has it.
      data-native-filtering={String(
        props.filtering === undefined ? props.onSearchTextChange === undefined : Boolean(props.filtering),
      )}
    >
      {props.searchBarAccessory}
      {/* Raycast calls `onLoadMore` when the user scrolls to the bottom, which
          jsdom cannot reproduce. Rendering it as a button when `hasMore` lets a
          test trigger the same call the way a scroll would, and its absence is
          itself assertable — "there is no more to load". */}
      {props.pagination?.hasMore && (
        <button
          data-testid="load-more"
          data-page-size={String(props.pagination.pageSize)}
          onClick={() => props.pagination?.onLoadMore()}
        />
      )}
      <input
        data-testid="search-bar"
        placeholder={props.searchBarPlaceholder}
        onChange={(e) => props.onSearchTextChange?.(e.target.value)}
      />
      {/* Raycast hides the empty view as soon as there is at least one item. */}
      {items.length > 0 ? items : emptyViews}
    </div>
  );
}

MetadataTagList.Item = MetadataTagListItem;
DetailMetadata.TagList = MetadataTagList;
DetailMetadata.Label = MetadataLabel;
ListItemDetail.Metadata = DetailMetadata;
ListItem.Detail = ListItemDetail;
ListDropdown.Item = ListDropdownItem;
ListDropdown.Section = ListDropdownSection;
List.Dropdown = ListDropdown;
List.Item = ListItem;
List.EmptyView = ListEmptyView;

/* ------------------------------------------------------------------- Detail */

/**
 * `Detail`, Raycast's full-pane markdown view — what `Action.Push` navigates to.
 * The markdown is exposed as an attribute rather than rendered, because these
 * tests assert what a view *says*, not how Raycast lays it out.
 */
export function Detail(props: {
  markdown?: string;
  isLoading?: boolean;
  navigationTitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      data-testid="detail"
      data-markdown={props.markdown}
      data-loading={String(Boolean(props.isLoading))}
      data-navigation-title={props.navigationTitle}
    >
      {props.actions}
    </div>
  );
}

/* ------------------------------------------------------------------ Actions */

export function ActionPanel(props: { children?: ReactNode; title?: string }) {
  return <div data-testid="action-panel">{props.children}</div>;
}

export function Action(props: { title: string; onAction?: () => void; icon?: unknown }) {
  return (
    <button
      data-testid="action"
      data-title={props.title}
      data-icon={iconAttr(props.icon)}
      onClick={() => props.onAction?.()}
    >
      {props.title}
    </button>
  );
}

function ActionPush(props: { title: string; target: ReactNode; icon?: unknown }) {
  const [pushed, setPushed] = useState(false);
  if (pushed) return <div data-testid="pushed-view">{props.target}</div>;
  return (
    <button
      data-testid="action"
      data-title={props.title}
      data-kind="push"
      data-icon={iconAttr(props.icon)}
      onClick={() => setPushed(true)}
    >
      {props.title}
    </button>
  );
}

function ActionCopyToClipboard(props: { title: string; content: string }) {
  return (
    <button data-testid="action" data-title={props.title} data-kind="copy" data-content={props.content}>
      {props.title}
    </button>
  );
}

Action.Push = ActionPush;
Action.CopyToClipboard = ActionCopyToClipboard;
Action.OpenInBrowser = (props: { title?: string; url: string }) => (
  <button data-testid="action" data-title={props.title} data-kind="open-in-browser" data-url={props.url} />
);
