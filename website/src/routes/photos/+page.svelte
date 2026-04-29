<script lang="ts">
  import { onMount } from 'svelte';
  import { fetch, shortenAddress } from '$lib/wallet/wallet';

  let tokens = [];

  onMount(async () => {
    tokens = await fetch([0, 100]);
  });
</script>

<div class="photos">
  {#each tokens as { tokenId, owner, uri }}
    <div>
      <a href="/photos/{tokenId}">
        {@html uri}
      </a>

      <a href="https://etherscan.io/address/{owner}">
        {shortenAddress(owner)}
      </a>
    </div>
  {/each}
</div>

<style>
  .photos {
    padding: 1rem;
    display: grid;
  }
</style>

