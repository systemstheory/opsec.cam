<script lang="ts">
  let { labels }: { labels?: string[]; } = $props();
</script>

<div class="frame">
  {#each labels as label}
    <span class="label">
      {label}
    </span>
  {/each}
</div>

<style>
  .frame {
    width: 100%;
    box-sizing: border-box;
    height: 500px;
    background: var(--secondary);
    font-size: 2.5rem;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: flex-start;
    justify-content: flex-start;
    gap: 0.35rem;
    padding: 0.5rem;
  }

  .frame .label {
    white-space: nowrap;
    flex-shrink: 0;
  }
</style>

