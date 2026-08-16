<script lang="ts">
  import { createEventDispatcher } from "svelte";
  export let endPoint: any;
  export let locked: boolean = false;
  const dispatch = createEventDispatcher();
</script>

<select
  bind:value={endPoint.heading}
  on:change={() => {
    // Initialize missing properties based on the selected heading type
    if (endPoint.heading === "constant" && endPoint.degrees === undefined) {
      endPoint.degrees = 0;
    } else if (endPoint.heading === "linear") {
      if (endPoint.startDeg === undefined) endPoint.startDeg = 0;
      if (endPoint.endDeg === undefined) endPoint.endDeg = 0;
    } else if (endPoint.heading === "tangential") {
      if (endPoint.reverse === undefined) endPoint.reverse = false;
    }
    dispatch("change");
  }}
  class=" rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28 text-sm"
  title="로봇의 헤딩 스타일입니다. 
고정(Constant) 헤딩은 로봇이 선 전체에서 같은 헤딩을 유지합니다. 
선형(Linear) 헤딩은 주어진 시작/끝 각도 사이에서 선형으로 헤딩이 변합니다. 
접선(Tangential) 헤딩은 선의 방향을 따라 헤딩이 움직입니다."
  disabled={locked}
>
  <option value="constant">고정</option>
  <option value="linear">선형</option>
  <option value="tangential">접선</option>
</select>

{#if endPoint.heading === "linear"}
  <div class="flex items-center gap-1">
    <span class="text-xs text-neutral-600 dark:text-neutral-400">시작:</span>
    <input
      class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-14"
      step="1"
      type="number"
      min="-180"
      max="180"
      bind:value={endPoint.startDeg}
      on:input={() => dispatch("change")}
      on:blur={() => dispatch("commit")}
      title="로봇이 이 선을 시작할 때의 헤딩 (도)"
      disabled={locked}
    />
    <span class="text-xs text-neutral-600 dark:text-neutral-400 ml-1">끝:</span
    >
    <input
      class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-14"
      step="1"
      type="number"
      min="-180"
      max="180"
      bind:value={endPoint.endDeg}
      on:input={() => dispatch("change")}
      on:blur={() => dispatch("commit")}
      title="로봇이 이 선을 끝낼 때의 헤딩 (도)"
      disabled={locked}
    />
  </div>
{:else if endPoint.heading === "constant"}
  <div class="flex items-center gap-1">
    <span class="text-xs text-neutral-600 dark:text-neutral-400">도:</span>
    <input
      class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-14"
      step="1"
      type="number"
      min="-180"
      max="180"
      value={endPoint.degrees || 0}
      on:input={(e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
          endPoint.degrees = value;
        } else {
          // If empty or invalid, set to 0
          endPoint.degrees = 0;
          e.target.value = "0";
        }
        dispatch("change");
      }}
      on:blur={(e) => {
        if (e.target.value === "" || isNaN(parseFloat(e.target.value))) {
          endPoint.degrees = 0;
          e.target.value = "0";
        }
        dispatch("commit");
      }}
      title="로봇이 이 선 전체에서 유지하는 고정 헤딩 (도)"
      disabled={locked}
    />
  </div>
{:else if endPoint.heading === "tangential"}
  <p class="text-sm font-extralight">역방향:</p>
  <input
    type="checkbox"
    bind:checked={endPoint.reverse}
    on:change={() => dispatch("change")}
    on:blur={() => dispatch("commit")}
    title="접선 경로를 따라 로봇이 향하는 방향을 반대로"
    disabled={locked}
  />
{/if}
