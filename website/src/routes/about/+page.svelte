<script lang="ts">
	import EmbedIcon from '$lib/assets/EmbedIcon.svelte';
	import ProveIcon from '$lib/assets/ProveIcon.svelte';
	import AdvertiseIcon from '$lib/assets/AdvertiseIcon.svelte';
  import { PUBLIC_OPSEC_CAMERA_ADDRESS } from '$env/static/public';
</script>

<div class="about">
  <p></p>

  <div class="flow">
    <figure class="flow-step">
      <EmbedIcon/>
      <figcaption>Embed</figcaption>
    </figure> 

    <figure class="flow-step">
      <ProveIcon/>
      <figcaption>Decribe and prove</figcaption>
    </figure> 
    
    <figure class="flow-step">
      <AdvertiseIcon/>
      <figcaption>Advertise</figcaption>
    </figure> 
  </div>
  
  <p>
    Camera circuits and verifier generated with the <a href="https://www.ezkl.xyz/" target="_blank">EZKL system</a>.<br>
    Review the client code and model hashes: <a href="" target="_blank">#e39e84d</a>.<br>
    Verify the vision model hash: 78d1e9a9c42c334b40ef16f2d594e4ea.<br>
    Review the smart contracts: <a href="" target="_blank">{PUBLIC_OPSEC_CAMERA_ADDRESS}</a>.<br>
    <br>
    <a href="https://glycerin.cloud" target="_blank">glycerin cloud</a> 2026<br>
    <span class="hidden">glycerin cloud</span> 0 vapor
  </p>
</div>

<style>
  .about {
    padding: 1rem;
  }
  
  p {
    line-height: 140%;
  }

  .flow {
    display: flex;
    border: 1px solid #000;
  }

  .flow-step {
    border: 1px solid #000;
  }

  .hidden {
    visibility: hidden;
  }
</style>
