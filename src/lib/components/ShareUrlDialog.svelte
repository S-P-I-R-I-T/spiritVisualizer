<script lang="ts">
  import { cubicInOut } from "svelte/easing";
  import { fade } from "svelte/transition";

  export let isOpen = false;

  let url = "";
  let copied = false;

  export function open(shareUrl: string) {
    url = shareUrl;
    copied = false;
    isOpen = true;
  }

  function close() {
    isOpen = false;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  function openInNewTab() {
    window.open(url, "_blank", "noopener,noreferrer");
  }
</script>

{#if isOpen}
  <div
    transition:fade={{ duration: 300, easing: cubicInOut }}
    class="fixed inset-0 bg-black bg-opacity-40 flex flex-col justify-center items-center z-[1005]"
    role="dialog"
    aria-modal="true"
    aria-label="URL 공유"
    tabindex="-1"
  >
    <div
      class="flex flex-col justify-start items-start p-5 bg-white dark:bg-neutral-900 rounded-lg w-full max-w-lg gap-4 shadow-xl"
      tabindex="-1"
      role="document"
    >
      <div class="flex flex-row justify-between items-center w-full">
        <div class="flex items-center gap-2">
          <span class="flex items-center justify-center size-7 rounded-md bg-gradient-to-r from-[#fe55a2] to-purple-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="size-4 text-white"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
              />
            </svg>
          </span>
          <h2 class="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            URL로 내보내기
          </h2>
        </div>
        <button on:click={close} aria-label="닫기">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="size-5 text-neutral-700 dark:text-neutral-400"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p class="text-sm text-neutral-600 dark:text-neutral-300">
        이 링크를 열면 현재 경로의 모든 값(시작점, 경로, 장애물, 순서, 설정)이 그대로 복원됩니다.
      </p>

      <div class="flex flex-row items-center gap-4 w-full">
        <input
          type="text"
          readonly
          value={url}
          class="w-full px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 text-xs text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 break-all"
        />
      </div>

      <div class="flex justify-end gap-2 w-full">
        <button
          on:click={openInNewTab}
          class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-md transition-colors"
        >
          새 탭에서 열기
        </button>
        <button
          on:click={copy}
          class="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#fe55a2] to-purple-500 hover:from-[#ff6fb2] hover:to-purple-600 rounded-md shadow-md shadow-pink-500/30 transition-all duration-250"
        >
          {copied ? "복사됨 ✓" : "복사"}
        </button>
        <button
          on:click={close}
          class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-md transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
{/if}