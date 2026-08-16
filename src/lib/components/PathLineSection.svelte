<script lang="ts">
  import type { Line } from "../../types";
  import { snapToGrid, showGrid, gridSize } from "../../stores";
  import ControlPointsSection from "./ControlPointsSection.svelte";
  import HeadingControls from "./HeadingControls.svelte";

  export let line: Line;
  export let idx: number;
  export let lines: Line[];
  export let collapsed: boolean;
  export let collapsedControlPoints: boolean;
  export let onRemove: () => void;
  export let onInsertAfter: () => void;
  export let onInsertMidpoint: () => void;
  export let onAddWaitAfter: () => void;
  export let recordChange: () => void;
  export let onMoveUp: () => void;
  export let onMoveDown: () => void;
  export let canMoveUp: boolean = true;
  export let canMoveDown: boolean = true;
  export let optimizeLine: (lineId: string, targetControlPointIndex?: number) => void;
  export let optimizing: boolean = false;
  export let chainOptions: Array<{ id: string; name: string; color: string }> = [];
  export let selectedChainId: string = "";
  export let onChainChange: (chainId: string) => void;


  $: snapToGridTitle =
    $snapToGrid && $showGrid ? `그리드에 스냅 중: ${$gridSize}` : "스냅 없음";

  function toggleCollapsed() {
    collapsed = !collapsed;
  }

  let collapsedMovingActions = false;

  function toggleMovingActions() {
    collapsedMovingActions = !collapsedMovingActions;
  }

  function handleChainSelect(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    if (onChainChange) {
      onChainChange(target.value);
    }
  }

  function addLineAction() {
    line.actions = [...(line.actions || []), { name: "Action", code: "" }];
    lines = [...lines];
  }

  function removeLineAction(idx: number) {
    line.actions = (line.actions || []).filter((_, i) => i !== idx);
    lines = [...lines];
  }
</script>

<div class="flex flex-col w-full justify-start items-start gap-1 rounded-md p-1">
  <div class="flex flex-row w-full items-center gap-3 flex-wrap">
    <div class="flex flex-row items-center gap-2">
      <button
        on:click={toggleCollapsed}
        class="flex items-center gap-2 font-semibold px-2 py-1 rounded transition-colors duration-250"
        title="{collapsed ? '펼치기' : '접기'} 경로"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width={2}
          stroke="currentColor"
          class="size-4 transition-transform {collapsed
            ? 'rotate-0'
            : 'rotate-90'}"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
        경로 {idx + 1}
      </button>

      <input
        bind:value={line.name}
        placeholder="경로 {idx + 1}"
        class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none text-sm font-semibold"
        disabled={line.locked}
        on:input={() => {
          // Force parent reactivity so other components (like exporters)
          // pick up the updated name immediately.
          lines = [...lines];
        }}
        on:blur={() => {
          // Commit the change for history/undo
          lines = [...lines];
          if (recordChange) recordChange();
        }}
      />

      <select
        value={selectedChainId}
        on:change={handleChainSelect}
        class="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900"
        title="경로 체인 지정"
      >
        {#each chainOptions as chain}
          <option value={chain.id}>{chain.name}</option>
        {/each}
      </select>

      <div
        class="relative size-5 rounded-full overflow-hidden shadow-sm border border-neutral-300 dark:border-neutral-600 shrink-0"
        style="background-color: {line.color}"
      >
        <div class="absolute inset-0" title="색상은 지정된 경로 체인에서 가져옵니다" />
      </div>

      <!-- Lock/Unlock Button -->
      <button
        title={line.locked ? "경로 잠금 해제" : "경로 잠금"}
        on:click|stopPropagation={() => {
          line.locked = !line.locked;
          lines = [...lines]; // Force reactivity
        }}
        class="p-1 rounded transition-colors duration-250"
      >
        {#if line.locked}
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

      <div class="flex flex-row gap-0.5 ml-1">
        <button
          title={line.locked ? "경로 잠금" : "위로 이동"}
          on:click|stopPropagation={() => {
            if (!line.locked && onMoveUp) onMoveUp();
          }}
          class="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100/70 dark:bg-neutral-900/70 border border-neutral-200/70 dark:border-neutral-700/70 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canMoveUp || line.locked}
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
          title={line.locked ? "경로 잠금" : "아래로 이동"}
          on:click|stopPropagation={() => {
            if (!line.locked && onMoveDown) onMoveDown();
          }}
          class="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100/70 dark:bg-neutral-900/70 border border-neutral-200/70 dark:border-neutral-700/70 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canMoveDown || line.locked}
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
    </div>

    <div class="flex flex-row items-center gap-1">
      <button
        class="px-2 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        title={line.locked ? "경로 잠금" : "이 경로 최적화"}
        on:click={() => line.id && optimizeLine && optimizeLine(line.id)}
        disabled={!line.id || line.locked || optimizing}
      >
        {optimizing ? "최적화 중…" : "최적화"}
      </button>
    </div>

    <div class="flex flex-row items-center gap-1 ml-auto">
      <button
        title="이 선 뒤에 컨트롤 포인트 추가"
        on:click={onInsertAfter}
        class="text-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={line.locked}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width={2}
          class="size-5 stroke-green-500"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </button>

      <!-- Insert Midpoint Between This and Next Path (dark-blue plus icon) -->
      <button
        title="이 경로와 다음 경로 사이에 지점 삽입"
        on:click={() => onInsertMidpoint && onInsertMidpoint()}
        class="text-blue-700 hover:text-blue-500"
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
            d="M5 8h4m6 0h4m-9 0 1.75-2.5M12 6l1.25 2.5"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 16h4m6 0h4m-9 0 1.75 2.5M12 18l1.25-2.5"
          />
          <circle cx="12" cy="12" r="2.1" />
        </svg>
      </button>

      <!-- Add Wait After Button -->
      <button
        title="뒤에 대기 추가"
        on:click={onAddWaitAfter}
        class="text-[#E1461B] hover:text-orange-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="size-5"
        >
          <circle cx="12" cy="12" r="9" />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 7v5l3 2"
          />
        </svg>
      </button>

      <!-- Add Moving Action Button -->
      <button
        title="이동 액션 추가 (이 경로를 따라가는 동안 실행)"
        on:click={() => {
          addLineAction();
          collapsedMovingActions = false;
        }}
        class="text-fuchsia-500 hover:text-fuchsia-600 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={line.locked}
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
            d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"
          />
        </svg>
      </button>

      {#if lines.length > 1}
        <button title="선 제거" on:click={onRemove}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width={2}
            class="size-5 stroke-red-500"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  {#if !collapsed}
    <div class={`h-[0.75px] w-full`} style={`background: ${line.color}`} />

    <div class="flex flex-col justify-start items-start w-full">
      <div class="font-light">지점 위치:</div>
      <div class="flex flex-row justify-start items-center gap-2">
        <div class="font-extralight">X:</div>
        <input
          class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
          step={$snapToGrid && $showGrid ? $gridSize : 0.1}
          type="number"
          min="0"
          max="141.5"
          bind:value={line.endPoint.x}
          disabled={line.locked}
          title={snapToGridTitle}
        />
        <div class="font-extralight">Y:</div>
        <input
          class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
          step={$snapToGrid && $showGrid ? $gridSize : 0.1}
          min="0"
          max="141.5"
          type="number"
          bind:value={line.endPoint.y}
          disabled={line.locked}
          title={snapToGridTitle}
        />

        <HeadingControls
          endPoint={line.endPoint}
          locked={line.locked}
          on:change={() => {
            // Force reactivity so timeline recalculates immediately
            lines = [...lines];
          }}
          on:commit={() => {
            // Commit change to history
            lines = [...lines];
            recordChange();
          }}
        />
      </div>
    </div>

    <ControlPointsSection
      bind:line
      lineIdx={idx}
      bind:collapsed={collapsedControlPoints}
      onAddControlPoint={onInsertAfter}
      {recordChange}
    />

    <div class="flex flex-col w-full justify-start items-start mt-2">
      <!-- Moving Actions header with toggle and add button -->
      <div class="flex items-center gap-2 w-full">
        <button
          on:click={toggleMovingActions}
          class="flex items-center gap-2 font-light hover:bg-neutral-100 dark:hover:bg-neutral-800/50 px-2 py-1 rounded transition-colors duration-250 text-sm"
          title="{collapsedMovingActions ? '표시' : '숨김'} 이동 액션"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width={2}
            stroke="currentColor"
            class="size-3 transition-transform {collapsedMovingActions
              ? 'rotate-0'
              : 'rotate-90'}"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
          이동 액션 ({(line.actions || []).length})
        </button>

        <button
          on:click={addLineAction}
          class="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-700 disabled:opacity-40 disabled:cursor-not-allowed"
          title={line.locked ? "경로 잠금" : "이동 액션 추가"}
          disabled={line.locked}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width={2}
            stroke="currentColor"
            class="size-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          추가
        </button>
      </div>

      <!-- Moving Actions list (shown when expanded) -->
      {#if !collapsedMovingActions && (line.actions || []).length > 0}
        <div class="w-full mt-2 space-y-2">
          {#each line.actions || [] as action, ai}
            <div
              class="flex flex-col p-2 border border-fuchsia-300 dark:border-fuchsia-700 rounded-md bg-fuchsia-50 dark:bg-fuchsia-900/20"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-fuchsia-500"></div>
                  <span
                    class="text-sm font-medium text-fuchsia-700 dark:text-fuchsia-300"
                  >
                    이동 액션 {ai + 1}
                  </span>
                </div>
                <button
                  on:click={() => removeLineAction(ai)}
                  class="text-red-500 hover:text-red-600"
                  title="이동 액션 제거"
                  disabled={line.locked}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width={2}
                    class="size-4"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              </div>

              <input
                type="text"
                placeholder="액션 이름"
                bind:value={action.name}
                disabled={line.locked}
                on:input={() => (lines = [...lines])}
                on:blur={() => recordChange?.()}
                class="w-full mb-2 px-2 py-1 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />

              <textarea
                bind:value={action.code}
                disabled={line.locked}
                rows="2"
                spellcheck="false"
                placeholder="// Code to run while moving"
                on:input={() => (lines = [...lines])}
                on:blur={() => recordChange?.()}
                class="w-full px-2 py-1 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 font-mono resize-y"
              />

              <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                경로 {idx + 1}, 이동 액션 {ai + 1}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  @keyframes rainbow-glow {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

</style>
