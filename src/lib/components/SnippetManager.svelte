<script lang="ts">
  import { cubicInOut } from "svelte/easing";
  import { fade, fly } from "svelte/transition";
  import { snippetStore, snippetManagerOpen } from "../../utils/snippets";

  function addSnippet() {
    snippetStore.add("Snippet", "");
  }

  function resetSnippets() {
    if (
      confirm(
        "모든 스니펫을 기본값으로 초기화할까요? 커스텀 스니펫은 제거됩니다.",
      )
    ) {
      snippetStore.reset();
    }
  }

  function onLabelInput(snippetId: string, e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    snippetStore.updateSnippet(snippetId, { label: target.value });
  }

  function onCodeInput(snippetId: string, e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    snippetStore.updateSnippet(snippetId, { code: target.value });
  }
</script>

{#if $snippetManagerOpen}
  <div
    transition:fade={{ duration: 200, easing: cubicInOut }}
    class="bg-black bg-opacity-40 flex flex-col justify-center items-center absolute top-0 left-0 w-full h-full z-[1006]"
    role="dialog"
    aria-modal="true"
    aria-label="액션 스니펫 관리"
    on:click={() => snippetManagerOpen.set(false)}
    on:keydown={(e) => e.key === "Escape" && snippetManagerOpen.set(false)}
  >
    <div
      transition:fly={{ duration: 200, easing: cubicInOut, y: 20 }}
      class="flex flex-col justify-start items-start p-4 bg-white dark:bg-neutral-900 rounded-lg w-full max-w-2xl gap-3 max-h-[85vh]"
      on:click|stopPropagation
      role="document"
    >
      <div class="flex flex-row justify-between items-center w-full">
        <p class="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          액션 스니펫
        </p>
        <div class="flex items-center gap-2">
          <button
            on:click={resetSnippets}
            class="px-2 py-1 text-xs rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600"
          >
            기본값으로 초기화
          </button>
          <button
            on:click={() => snippetManagerOpen.set(false)}
            aria-label="스니펫 관리자 닫기"
            class="p-1 rounded text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <p class="text-xs text-neutral-500 dark:text-neutral-400">
        이 스니펫은 액션 행에 표시되며 브라우저에 저장됩니다.
      </p>

      <div class="flex flex-col w-full gap-2 overflow-y-auto pr-1">
        {#each $snippetStore as snippet (snippet.id)}
          <div
            class="flex flex-col gap-1 p-2 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
          >
            <div class="flex items-center gap-2">
              <input
                type="text"
                placeholder="라벨"
                value={snippet.label}
                on:input={(e) => onLabelInput(snippet.id, e)}
                class="flex-1 px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 focus:outline-none"
              />
              <button
                title="스니펫 제거"
                on:click={() => snippetStore.remove(snippet.id)}
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
            <textarea
              placeholder="// Code to insert"
              value={snippet.code}
              on:input={(e) => onCodeInput(snippet.id, e)}
              rows="2"
              spellcheck="false"
              class="w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 font-mono text-xs resize-y focus:outline-none"
            />
          </div>
        {/each}
      </div>

      <button
        on:click={addSnippet}
        class="w-full px-2 py-1.5 text-sm font-semibold rounded bg-purple-500 hover:bg-purple-600 text-white"
      >
        + 스니펫 추가
      </button>
    </div>
  </div>
{/if}
