<script lang="ts">
  import { cubicInOut } from "svelte/easing";
  import { fade } from "svelte/transition";
  import { get } from "svelte/store";
  import type { Point, Line, SequenceItem, PathChain } from "../../types";
  import {
    shouldSkipGuide,
    setSkipGuide,
    generateAndUploadToAndroidStudio,
  } from "../../utils/androidStudioExporter";
  import { currentFilePath } from "../../stores";

  export let isOpen = false;
  export let startPoint: Point;
  export let lines: Line[];
  export let sequence: SequenceItem[];
  export let pathChains: PathChain[] = [];

  type Step = 1 | 2;
  type Status = "idle" | "uploading" | "success" | "error";

  let step: Step = 1;
  let status: Status = "idle";
  let resultMessage = "";
  let dontShowAgain = shouldSkipGuide();

  export function open() {
    step = 1;
    status = "idle";
    resultMessage = "";
    isOpen = true;
  }

  export function openAtUpload() {
    step = 2;
    status = "idle";
    resultMessage = "";
    isOpen = true;
  }

  function close() {
    isOpen = false;
  }

  function next() {
    step = 2;
  }

  async function upload() {
    status = "uploading";
    resultMessage = "";
    try {
      const result = await generateAndUploadToAndroidStudio(
        startPoint,
        lines,
        pathChains,
        sequence,
        deriveClassName(),
      );
      if (result.success) {
        resultMessage = "내보내기 완료";
        status = "success";
      } else {
        resultMessage = result.message;
        status = "error";
      }
    } catch (err) {
      console.error(err);
      resultMessage =
        "업로드 중 오류가 발생했습니다: " +
        (err instanceof Error ? err.message : String(err));
      status = "error";
    }
  }

  function deriveClassName(): string {
    const path = get(currentFilePath);
    if (path) {
      const base = path
        .split(/[\\/]/)
        .pop()
        ?.replace(/\.pp$/, "")
        .replace(/[^a-zA-Z0-9]/g, "");
      if (base) {
        return /^[0-9]/.test(base) ? `Auto${base}` : base;
      }
    }
    return "PedroAutonomous";
  }

  function onDontShowAgainChange() {
    setSkipGuide(dontShowAgain);
  }
</script>

{#if isOpen}
  <div
    transition:fade={{ duration: 300, easing: cubicInOut }}
    class="fixed inset-0 bg-black bg-opacity-40 flex flex-col justify-center items-center z-[1005]"
    role="dialog"
    aria-modal="true"
    aria-label="Android Studio 내보내기 안내"
    tabindex="-1"
  >
    <div
      class="flex flex-col justify-start items-start p-5 bg-white dark:bg-neutral-900 rounded-lg w-full max-w-md gap-4 shadow-xl"
      tabindex="-1"
      role="document"
    >
      <!-- Header -->
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
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
          </span>
          <h2 class="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            Android Studio로 내보내기
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

      <!-- Step indicator -->
      <div class="flex flex-row items-center gap-2 w-full">
        <div
          class="flex-1 flex items-center gap-2"
          class:opacity-40={step !== 1}
        >
          <span
            class="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white bg-[#fe55a2]"
          >
            1
          </span>
          <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            플러그인 설치하기
          </span>
        </div>
        <div class="w-6 h-px bg-neutral-300 dark:bg-neutral-600"></div>
        <div
          class="flex-1 flex items-center gap-2"
          class:opacity-40={step !== 2}
        >
          <span
            class="flex items-center justify-center size-6 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#fe55a2] to-purple-500"
          >
            2
          </span>
          <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            업로드
          </span>
        </div>
      </div>

      <!-- Step 1: Install plugin -->
      {#if step === 1}
        <div class="flex flex-col gap-3 w-full text-sm text-neutral-600 dark:text-neutral-300">
          <p class="font-medium text-neutral-700 dark:text-neutral-200">
            이 기능을 사용하려면 Android Studio 플러그인을 설치해야 합니다.
          </p>
          <ol class="flex flex-col gap-1.5 list-decimal list-inside">
            <li>
              아래 버튼으로 플러그인 zip 파일을 다운로드합니다.
            </li>
            <li>Android Studio에서 <span class="font-medium">Settings → Plugins</span>를 엽니다.</li>
            <li>
              <span class="font-medium">⚙️ → Install Plugin from Disk…</span>를 선택합니다.
            </li>
            <li>다운로드한 zip 파일을 선택합니다.</li>
            <li>Android Studio를 재시작하면 서버가 자동 실행됩니다.</li>
          </ol>
          <div class="flex items-center justify-end gap-2">
            <a
              href="/spirit-android-studio-plugin-1.0.0.zip"
              download="spirit-android-studio-plugin-1.0.0.zip"
              class="px-4 py-2 text-sm font-semibold text-white bg-neutral-800 dark:bg-white dark:text-neutral-800 hover:bg-neutral-700 dark:hover:bg-neutral-200 rounded-lg shadow-md transition-all duration-250"
            >
              <span class="inline-flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="size-4"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                플러그인 다운로드
              </span>
            </a>
            <button
              on:click={next}
              class="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#fe55a2] to-purple-500 hover:from-[#ff6fb2] hover:to-purple-600 rounded-lg shadow-md shadow-pink-500/30 transition-all duration-250"
            >
              다음: 업로드 →
            </button>
          </div>
        </div>
      {/if}

      <!-- Step 2: Upload -->
      {#if step === 2}
        <div class="flex flex-col gap-3 w-full text-sm text-neutral-600 dark:text-neutral-300">
          {#if status === "idle"}
            <p>
              아래 버튼을 누르면 현재 경로의 Java 코드를 생성해
              Android Studio 플러그인(localhost:8356)으로 보냅니다.
            </p>
            <button
              on:click={upload}
              class="self-end px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#fe55a2] to-purple-500 hover:from-[#ff6fb2] hover:to-purple-600 rounded-lg shadow-md shadow-pink-500/30 transition-all duration-250"
            >
              업로드
            </button>
          {:else if status === "uploading"}
            <div class="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
              <span class="size-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"></span>
              코드를 생성하고 업로드하는 중…
            </div>
          {:else}
            <div
              class="flex items-start gap-2 p-3 rounded-md bg-neutral-50 dark:bg-neutral-800 border {status === 'success' ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'}"
            >
              {#if status === "success"}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="size-5 shrink-0 text-green-600 dark:text-green-400"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              {:else}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="size-5 shrink-0 text-red-600 dark:text-red-400"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
              {/if}
              <div class="flex-1 whitespace-pre-line break-words text-xs text-neutral-700 dark:text-neutral-200">
                {resultMessage}
              </div>
            </div>
            <div class="flex justify-end gap-2">
              {#if status === "error"}
                <button
                  on:click={upload}
                  class="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-md transition-colors"
                >
                  다시 시도
                </button>
              {/if}
              <button
                on:click={close}
                class="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-[#fe55a2] to-purple-500 hover:from-[#ff6fb2] hover:to-purple-600 rounded-md shadow-md shadow-pink-500/30 transition-all duration-250"
              >
                {status === "success" ? "완료" : "닫기"}
              </button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Footer -->
      <div class="flex flex-row items-center justify-between w-full border-t border-neutral-200 dark:border-neutral-700 pt-3">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            bind:checked={dontShowAgain}
            on:change={onDontShowAgainChange}
            class="accent-[#fe55a2]"
          />
          <span class="text-xs text-neutral-500 dark:text-neutral-400">
            다음부터 이 안내를 표시하지 않기
          </span>
        </label>
        <button
          on:click={close}
          class="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
{/if}