import { writable } from "svelte/store";

export interface Snippet {
  id: string;
  label: string;
  code: string;
}

const STORAGE_KEY = "pedro_action_snippets";

export const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: "panels-debug",
    label: "Panels Debug",
    code: 'panelsTelemetry.debug("Status", "Message");',
  },
  {
    id: "telemetry-data",
    label: "Telemetry Data",
    code: 'telemetry.addData("Status", "Message");',
  },
  {
    id: "pose",
    label: "Pose",
    code: 'panelsTelemetry.debug("X", follower.getPose().getX());\npanelsTelemetry.debug("Y", follower.getPose().getY());\npanelsTelemetry.debug("Heading", follower.getPose().getHeading());',
  },
  {
    id: "comment",
    label: "Comment",
    code: "// ",
  },
];

function loadSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SNIPPETS.map((s) => ({ ...s }));
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (s) =>
          s &&
          typeof s.id === "string" &&
          typeof s.label === "string" &&
          typeof s.code === "string",
      );
    }
    return DEFAULT_SNIPPETS.map((s) => ({ ...s }));
  } catch {
    return DEFAULT_SNIPPETS.map((s) => ({ ...s }));
  }
}

function persist(snippets: Snippet[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch {
    // ignore storage errors (e.g. private mode / quota)
  }
}

function makeId(): string {
  return `snip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSnippetStore() {
  const { subscribe, set, update } = writable<Snippet[]>(loadSnippets());

  return {
    subscribe,
    set,
    add(label: string, code: string) {
      update((list) => {
        const next = [
          ...list,
          { id: makeId(), label: label || "Snippet", code: code || "" },
        ];
        persist(next);
        return next;
      });
    },
    updateSnippet(id: string, patch: Partial<Omit<Snippet, "id">>) {
      update((list) => {
        const next = list.map((s) => (s.id === id ? { ...s, ...patch } : s));
        persist(next);
        return next;
      });
    },
    remove(id: string) {
      update((list) => {
        const next = list.filter((s) => s.id !== id);
        persist(next);
        return next;
      });
    },
    reset() {
      const next = DEFAULT_SNIPPETS.map((s) => ({ ...s }));
      set(next);
      persist(next);
    },
  };
}

export const snippetStore = createSnippetStore();
export const snippetManagerOpen = writable(false);
