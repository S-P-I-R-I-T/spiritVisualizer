<script lang="ts">
  import { snippetStore, snippetManagerOpen } from "../../utils/snippets";

  export let onInsert: (code: string) => void;
</script>

<div class="flex flex-row flex-wrap items-center gap-1">
  <span class="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
    >스니펫</span
  >
  {#each $snippetStore as snippet (snippet.id)}
    <button
      type="button"
      title={snippet.code}
      on:click|stopPropagation={() => onInsert(snippet.code)}
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
