<script lang="ts">
  let { labels }: { labels?: string[]; } = $props();
</script>

<div class="frame">
  {#each labels as label}
    <span class="label">{label}</span>
  {/each}
</div>

<style>
  .frame {
    width: 100%;
    height: 500px;
    background: var(--primary);
  }

  .frame .label { }
</style>

