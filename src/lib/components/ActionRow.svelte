<script lang="ts">
  import { snippetStore, snippetManagerOpen } from "../../utils/snippets";

  export let name: string;
  export let code: string;
  export let locked: boolean = false;
  export let onToggleLock: () => void;
  export let onChange: (newName: string, newCode: string) => void;
  export let onRemove: () => void;
  export let onInsertAfter: () => void;
  export let onAddPathAfter: () => void;
  export let onMoveUp: () => void;
  export let onMoveDown: () => void;
  export let canMoveUp: boolean = true;
  export let canMoveDown: boolean = true;

  let textareaEl: HTMLTextAreaElement;

  function handleNameChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    if (!locked) onChange(target?.value ?? "", code);
  }

  function handleCodeChange(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    if (!locked) onChange(name, target?.value ?? "");
  }

  function insertSnippet(snippetCode: string) {
    if (locked) return;

    const el = textareaEl;
    const start = el?.selectionStart ?? code.length;
    const end = el?.selectionEnd ?? code.length;

    const before = code.slice(0, start);
    const after = code.slice(end);

    let insert = snippetCode;
    if (before && !before.endsWith("\n")) insert = "\n" + insert;
    if (after && !after.startsWith("\n")) insert = insert + "\n";

    const newCode = before + insert + after;
    code = newCode;
    onChange(name, newCode);

    // Restore cursor after the inserted snippet.
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = (before + insert).length;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  }
</script>

<div
  class="flex w-full flex-col items-stretch gap-1 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-purple-50 dark:bg-purple-950/40"
>
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-2 flex-1">
      <span
        class="px-1.5 py-0.5 text-xs rounded bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >액션</span
      >
      <input
        class="pl-1.5 rounded-md bg-neutral-50 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-40"
        type="text"
        placeholder="이름"
        bind:value={name}
        on:change={handleNameChange}
        disabled={locked}
      />
    </div>

    <div class="flex items-center gap-2">
      <!-- Lock/Unlock Button -->
      <button
        title={locked ? "액션 잠금 해제" : "액션 잠금"}
        on:click|stopPropagation={() => {
          if (onToggleLock) onToggleLock();
        }}
        class="p-1 rounded transition-colors duration-250"
      >
        {#if locked}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width={2}
            stroke="currentColor"
            class="size-5 stroke-yellow-500"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width={2}
            stroke="currentColor"
            class="size-5 stroke-gray-400"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        {/if}
      </button>

      <div class="flex flex-row gap-0.5 mr-1">
        <button
          title="위로 이동"
          on:click={() => {
            if (!locked && onMoveUp) onMoveUp();
          }}
          class="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100/70 dark:bg-neutral-900/70 border border-neutral-200/70 dark:border-neutral-700/70 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canMoveUp || locked}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="size-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m5 15 7-7 7 7"
            />
          </svg>
        </button>
        <button
          title="아래로 이동"
          on:click={() => {
            if (!locked && onMoveDown) onMoveDown();
          }}
          class="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100/70 dark:bg-neutral-900/70 border border-neutral-200/70 dark:border-neutral-700/70 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canMoveDown || locked}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="size-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m19 9-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <button
        title="뒤에 경로 추가"
        on:click={() => {
          if (!locked && onAddPathAfter) onAddPathAfter();
        }}
        class="text-green-500 hover:text-green-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width={2}
          stroke="currentColor"
          class="size-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </button>

      <button
        title="뒤에 액션 추가"
        on:click={() => {
          if (!locked && onInsertAfter) onInsertAfter();
        }}
        class="text-purple-500 hover:text-purple-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="size-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
          />
        </svg>
      </button>

      <button
        title="제거"
        on:click={() => {
          if (!locked && onRemove) onRemove();
        }}
        class="text-red-500 hover:text-red-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="size-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </button>
    </div>
  </div>

  <textarea
    bind:this={textareaEl}
    bind:value={code}
    on:change={handleCodeChange}
    disabled={locked}
    rows="2"
    spellcheck="false"
    placeholder="// Code to run (e.g. action.Outtake_On(2);)"
    class="w-full px-2 py-1 rounded-md bg-neutral-50 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none font-mono text-xs resize-y"
  />

  {#if !locked}
    <div class="flex flex-row flex-wrap items-center gap-1">
      <span class="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
        >스니펫</span
      >
      {#each $snippetStore as snippet (snippet.id)}
        <button
          type="button"
          title={snippet.code}
          on:click|stopPropagation={() => insertSnippet(snippet.code)}
          class="px-1.5 py-0.5 text-[10px] rounded bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:hover:bg-purple-800/60 border border-purple-200 dark:border-purple-700/50 transition-colors"
        >
          {snippet.label}
        </button>
      {/each}
      <button
        type="button"
        title="스니펫 관리"
        on:click|stopPropagation={() => snippetManagerOpen.set(true)}
        class="px-1.5 py-0.5 text-[10px] rounded border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        + 관리
      </button>
    </div>
  {/if}
</div>
