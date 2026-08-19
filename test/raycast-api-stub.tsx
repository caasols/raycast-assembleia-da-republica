/**
 * Stand-in for `@raycast/api` under vitest.
 *
 * The real package is injected by the Raycast runtime and exposes no resolvable
 * Node entry point, so Vite cannot load it even in order to mock it.
 * `vitest.config.ts` aliases the package to this file.
 *
 * The components render plain DOM so tests can drive the real command code:
 * type into a field, click an action, assert what the command did. Two fidelity
 * details are deliberate, because commands depend on them:
 *
 * - `List` renders `List.EmptyView` only when it has no `List.Item` children,
 *   matching Raycast, which hides the empty view as soon as there are results.
 * - `Form.Dropdown` selects its first item by default, as Raycast does, so a
 *   dropdown with no items yields an empty value rather than a phantom one.
 *
 * Side-effecting APIs (`showToast`, `popToRoot`, ...) are `vi.fn()` mocks that
 * tests import straight from "@raycast/api" and assert against.
 */
import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { vi } from "vitest";

/* ------------------------------------------------------------------ effects */

export const showToast = vi.fn(async (options?: unknown) => options);
export const popToRoot = vi.fn(async () => undefined);
export const openExtensionPreferences = vi.fn(async () => undefined);
export const showHUD = vi.fn(async () => undefined);
export const getPreferenceValues = vi.fn(() => ({}) as never);

// Resolves `true` by default so a command that gates a destructive action
// behind `confirmAlert` keeps working in tests that don't care about the
// prompt; a test asserting the cancel path overrides this per-call.
export const confirmAlert = vi.fn(async (_options?: unknown) => true);

export const Alert = {
  ActionStyle: { Default: "default", Cancel: "cancel", Destructive: "destructive" },
};

export const Toast = {
  Style: { Success: "success", Failure: "failure", Animated: "animated" },
};

export const LaunchType = { UserInitiated: "userInitiated", Background: "background" };

// A stable, module-level pair rather than one minted per call, so tests can
// import `pop`/`push` directly and assert on them the same way they do `showToast`.
export const push = vi.fn();
export const pop = vi.fn();
export const useNavigation = () => ({ push, pop });

export const Icon = new Proxy({}, { get: (_t, name) => String(name) }) as Record<string, string>;
export const Color = new Proxy({}, { get: (_t, name) => String(name) }) as Record<string, string>;

// A trimmed stand-in for the real `Keyboard.Shortcut.Common` table. The
// package's .d.ts only declares the shape (no values) and ships no runtime
// JS to read them from, so these values are taken from Raycast's own
// documentation instead. Consequence: the `Common.*` assertions in
// src/set-status.test.tsx verify this stub's table, not the command's actual
// choice of shortcut, since the "real" values here are simply what we typed
// in based on the docs. Extend with more entries if a command starts using
// them; only New/Edit are needed today.
export const Keyboard = {
  Shortcut: {
    Common: {
      New: { macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } },
      Edit: { macOS: { modifiers: ["cmd"], key: "e" }, Windows: { modifiers: ["ctrl"], key: "e" } },
    },
  },
};

// @raycast/utils' usePromise reads environment.launchType before reporting a
// failure, so it has to be present or every rejected promise becomes an
// unhandled error instead of reaching the component's error branch.
export const environment = {
  extensionName: "buzz",
  commandName: "test",
  isDevelopment: true,
  launchType: LaunchType.UserInitiated,
};

/* ------------------------------------------------------------- LocalStorage */

// An in-memory stand-in behind the real async API. `__resetLocalStorage` lets a
// test start from a clean slate without reaching into module internals.
const localStorageData = new Map<string, string>();

export const LocalStorage = {
  async getItem<T = string>(key: string): Promise<T | undefined> {
    return localStorageData.get(key) as T | undefined;
  },
  async setItem(key: string, value: string | number | boolean): Promise<void> {
    localStorageData.set(key, String(value));
  },
  async removeItem(key: string): Promise<void> {
    localStorageData.delete(key);
  },
  async clear(): Promise<void> {
    localStorageData.clear();
  },
};

export function __resetLocalStorage(): void {
  localStorageData.clear();
}

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

/* ------------------------------------------------------------- form plumbing */

type FormValues = Record<string, string>;

const FormContext = createContext<{
  values: FormValues;
  setValue: (id: string, value: string) => void;
} | null>(null);

function useFormContext() {
  return useContext(FormContext);
}

/* ------------------------------------------------------------------ shared */

// Renders any icon/shortcut prop as a plain string attribute so tests can
// assert on them without caring whether the value is a raw emoji or one of
// the `Icon.X` proxy strings.
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

type SimpleShortcut = { modifiers?: string[]; key?: string };

function formatSimpleShortcut(shortcut?: SimpleShortcut): string | undefined {
  if (!shortcut) return undefined;
  return [...(shortcut.modifiers ?? []), shortcut.key].filter(Boolean).join("+");
}

// A `Keyboard.Shortcut` is either the simple `{ modifiers, key }` form or a
// per-platform `{ macOS, Windows }` form (used whenever an extension declares
// more than one platform, per @raycast's `no-ambiguous-platform-shortcut`
// rule). Rendered as "<macOS>/<Windows>" so both halves are assertable.
function shortcutAttr(shortcut: unknown): string | undefined {
  if (!shortcut || typeof shortcut !== "object") return undefined;
  const s = shortcut as SimpleShortcut & { macOS?: SimpleShortcut; Windows?: SimpleShortcut; windows?: SimpleShortcut };
  if (s.macOS || s.Windows || s.windows) {
    return [formatSimpleShortcut(s.macOS), formatSimpleShortcut(s.Windows ?? s.windows)].filter(Boolean).join("/");
  }
  return formatSimpleShortcut(s);
}

/* --------------------------------------------------------------------- List */

function ListItem(props: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  detail?: ReactNode;
  accessories?: { text?: string; date?: Date; tag?: unknown; icon?: unknown }[];
  icon?: unknown;
  section?: string;
  // Accepted so extensions can pass real Raycast keywords through unchanged;
  // the stub does no native filtering, so there is nothing to match against here.
  keywords?: string[];
}) {
  return (
    <div
      data-testid="list-item"
      data-title={props.title}
      data-subtitle={props.subtitle}
      data-icon={iconAttr(props.icon)}
      data-section={props.section}
      data-accessories={props.accessories?.map((a) => a.text ?? (a.date ? a.date.toISOString() : "")).join(" ")}
    >
      {props.actions}
      {props.detail}
    </div>
  );
}

function ListEmptyView(props: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  section?: string;
  icon?: unknown;
}) {
  return (
    <div
      data-testid="empty-view"
      data-title={props.title}
      data-description={props.description}
      data-icon={iconAttr(props.icon)}
      data-section={props.section}
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
function ListItemDetail(props: { markdown?: string; isLoading?: boolean }) {
  return (
    <div data-testid="item-detail" data-markdown={props.markdown} data-loading={String(Boolean(props.isLoading))} />
  );
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

function ListSection(props: { title?: string; children?: ReactNode }) {
  return (
    <div data-testid="list-section" data-title={props.title}>
      {props.children}
    </div>
  );
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
  actions?: ReactNode;
  searchBarAccessory?: ReactNode;
}) {
  const items: ReactNode[] = [];
  const emptyViews: ReactNode[] = [];

  // Recurses one level into `List.Section`, tagging each collected child with
  // its enclosing section's title (as a `section` prop `ListItem`/`ListEmptyView`
  // render into `data-section`) so tests can assert section structure that
  // would otherwise be invisible once children are flattened.
  const collect = (nodes: ReactNode, section?: string) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === ListEmptyView) {
        emptyViews.push(section ? cloneElement(child, { section } as Record<string, unknown>) : child);
      } else if (child.type === ListSection) {
        const sectionProps = child.props as { children?: ReactNode; title?: string };
        collect(sectionProps.children, sectionProps.title);
      } else {
        items.push(section ? cloneElement(child, { section } as Record<string, unknown>) : child);
      }
    });
  };
  collect(props.children);

  return (
    <div
      data-testid="list"
      data-loading={String(Boolean(props.isLoading))}
      data-showing-detail={String(Boolean(props.isShowingDetail))}
      data-navigation-title={props.navigationTitle}
      // The stub does no actual filtering (native Raycast filtering is not
      // something jsdom can reproduce), so this pins the prop a command passes
      // rather than the filtering behaviour itself: it exists so a regression
      // that drops `filtering` back to Raycast's onSearchTextChange default
      // (false) is still caught, even though what that default actually does
      // to the rendered list is not something this stub can show.
      data-filtering={String(Boolean(props.filtering))}
      // Whether Raycast itself would be filtering this list, per the documented
      // default in SearchBarInterface: `filtering` is false when
      // onSearchTextChange is specified and true otherwise, unless set
      // explicitly. The stub still cannot perform that filtering, but this
      // makes the premise assertable, so a view whose empty-state copy is
      // written for native filtering can pin that it still has it.
      data-native-filtering={String(
        props.filtering === undefined ? props.onSearchTextChange === undefined : Boolean(props.filtering),
      )}
    >
      {props.searchBarAccessory}
      <input
        data-testid="search-bar"
        placeholder={props.searchBarPlaceholder}
        onChange={(e) => props.onSearchTextChange?.(e.target.value)}
      />
      {/* Raycast hides the empty view as soon as there is at least one item. */}
      {items.length > 0 ? items : emptyViews}
      {/* The List's own ActionPanel: Raycast's fallback when no item is
          selected, including when its native filtering has hidden every row. */}
      {props.actions === undefined ? null : <div data-testid="list-actions">{props.actions}</div>}
    </div>
  );
}

ListItem.Detail = ListItemDetail;
ListDropdown.Item = ListDropdownItem;
ListDropdown.Section = ListDropdownSection;
List.Dropdown = ListDropdown;
List.Item = ListItem;
List.EmptyView = ListEmptyView;
List.Section = ListSection;

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
  metadata?: ReactNode;
}) {
  return (
    <div
      data-testid="detail"
      data-markdown={props.markdown}
      data-loading={String(Boolean(props.isLoading))}
      data-navigation-title={props.navigationTitle}
    >
      {props.actions}
      {props.metadata}
    </div>
  );
}

/* --------------------------------------------------------------------- Form */

function FormTextField(props: { id: string; title?: string; placeholder?: string; defaultValue?: string }) {
  const ctx = useFormContext();
  useEffect(() => {
    ctx?.setValue(props.id, props.defaultValue ?? "");
    // Registering the initial value once mirrors Raycast, where every declared
    // field is present in the submitted values even when untouched.
  }, []);
  return (
    <input
      data-testid={`field-${props.id}`}
      aria-label={props.title}
      placeholder={props.placeholder}
      defaultValue={props.defaultValue}
      onChange={(e) => ctx?.setValue(props.id, e.target.value)}
    />
  );
}

function FormTextArea(props: { id: string; title?: string; placeholder?: string; defaultValue?: string }) {
  const ctx = useFormContext();
  useEffect(() => {
    ctx?.setValue(props.id, props.defaultValue ?? "");
  }, []);
  return (
    <textarea
      data-testid={`field-${props.id}`}
      aria-label={props.title}
      placeholder={props.placeholder}
      onChange={(e) => ctx?.setValue(props.id, e.target.value)}
    />
  );
}

function FormDropdownItem(props: { value: string; title?: string; keywords?: string[] }) {
  return (
    <option value={props.value} data-keywords={props.keywords?.join(" ")}>
      {props.title}
    </option>
  );
}

function FormDropdown(props: {
  id: string;
  title?: string;
  children?: ReactNode;
  defaultValue?: string;
  placeholder?: string;
  onSearchTextChange?: (text: string) => void;
  onChange?: (value: string) => void;
}) {
  const ctx = useFormContext();
  const values: string[] = [];
  Children.forEach(props.children, (child) => {
    if (isValidElement<{ value: string }>(child)) values.push(child.props.value);
  });
  const first = values[0] ?? "";
  // Honour an explicit defaultValue when it names a real item, matching Raycast;
  // otherwise fall back to preselecting the first item, as before.
  const selected = props.defaultValue !== undefined && values.includes(props.defaultValue) ? props.defaultValue : first;

  useEffect(() => {
    ctx?.setValue(props.id, selected);
  }, [selected]);

  return (
    <>
      {/* Raycast's dropdown owns a search field. Supplying onSearchTextChange
          there turns its native filtering off and hands the query to the
          extension, so the stub exposes that field as a sibling input rather
          than nesting it in the select, which would be invalid markup. */}
      <input
        data-testid={`field-${props.id}-search`}
        placeholder={props.placeholder}
        onChange={(e) => props.onSearchTextChange?.(e.target.value)}
      />
      <select
        data-testid={`field-${props.id}`}
        aria-label={props.title}
        defaultValue={selected}
        onChange={(e) => {
          ctx?.setValue(props.id, e.target.value);
          props.onChange?.(e.target.value);
        }}
      >
        {props.children}
      </select>
    </>
  );
}

FormDropdown.Item = FormDropdownItem;

export function Form(props: {
  children?: ReactNode;
  actions?: ReactNode;
  isLoading?: boolean;
  navigationTitle?: string;
}) {
  const [values, setValues] = useState<FormValues>({});
  const setValue = (id: string, value: string) => setValues((prev) => ({ ...prev, [id]: value }));

  return (
    <FormContext.Provider value={{ values, setValue }}>
      <div data-testid="form" data-loading={String(Boolean(props.isLoading))}>
        {props.children}
        {props.actions}
      </div>
    </FormContext.Provider>
  );
}

Form.TextField = FormTextField;
Form.TextArea = FormTextArea;
Form.Dropdown = FormDropdown;
Form.Description = (props: { text?: string }) => <p data-testid="form-description">{props.text}</p>;
Form.Separator = () => <hr data-testid="form-separator" />;

/* ------------------------------------------------------------------ Actions */

export function ActionPanel(props: { children?: ReactNode; title?: string }) {
  return <div data-testid="action-panel">{props.children}</div>;
}

ActionPanel.Section = (props: { children?: ReactNode; title?: string }) => (
  <div data-testid="action-panel-section">{props.children}</div>
);

export function Action(props: {
  title: string;
  onAction?: () => void;
  icon?: unknown;
  shortcut?: unknown;
  style?: unknown;
}) {
  return (
    <button
      data-testid="action"
      data-title={props.title}
      data-icon={iconAttr(props.icon)}
      data-shortcut={shortcutAttr(props.shortcut)}
      data-style={props.style === undefined ? undefined : String(props.style)}
      onClick={() => props.onAction?.()}
    >
      {props.title}
    </button>
  );
}

Action.Style = { Regular: "regular", Destructive: "destructive" };

function ActionPush(props: { title: string; target: ReactNode; icon?: unknown; shortcut?: unknown }) {
  const [pushed, setPushed] = useState(false);
  if (pushed) return <div data-testid="pushed-view">{props.target}</div>;
  return (
    <button
      data-testid="action"
      data-title={props.title}
      data-kind="push"
      data-icon={iconAttr(props.icon)}
      data-shortcut={shortcutAttr(props.shortcut)}
      onClick={() => setPushed(true)}
    >
      {props.title}
    </button>
  );
}

function ActionCopyToClipboard(props: { title: string; content: string; shortcut?: unknown }) {
  return (
    <button data-testid="action" data-title={props.title} data-kind="copy" data-content={props.content}>
      {props.title}
    </button>
  );
}

function ActionSubmitForm(props: { title: string; onSubmit: (values: FormValues) => void; icon?: unknown }) {
  const ctx = useFormContext();
  return (
    <button
      data-testid="submit"
      data-title={props.title}
      data-kind="submit"
      onClick={() => props.onSubmit(ctx?.values ?? {})}
    >
      {props.title}
    </button>
  );
}

function ActionOpen(props: { title: string; target: string; icon?: unknown; shortcut?: unknown }) {
  return (
    <button
      data-testid="action"
      data-title={props.title}
      data-kind="open"
      data-target={props.target}
      data-icon={iconAttr(props.icon)}
      data-shortcut={shortcutAttr(props.shortcut)}
    >
      {props.title}
    </button>
  );
}

Action.Push = ActionPush;
Action.CopyToClipboard = ActionCopyToClipboard;
Action.SubmitForm = ActionSubmitForm;
Action.OpenInBrowser = (props: { title?: string; url: string }) => (
  <button data-testid="action" data-title={props.title} data-kind="open-in-browser" data-url={props.url} />
);
Action.Open = ActionOpen;
