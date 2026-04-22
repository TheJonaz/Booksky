<script lang="ts">
  let { data } = $props();
</script>

<h1>Integritetskontroll</h1>
<p class="subtitle">
  Verifierar SHA-256 hash-kedjan över bokförda verifikationer i serie A,
  räkenskapsår {data.fiscalYear.startDate.slice(0, 4)}.
</p>

<div class="card">
  {#if data.result.ok}
    <p style="margin: 0"><span class="badge badge-ok">OK</span> · {data.result.checked} verifikationer kontrollerade, kedjan är obruten.</p>
  {:else}
    <p style="margin: 0 0 12px"><span class="badge" style="background: var(--danger-soft); color: var(--danger)">BROTEN</span> · {data.result.issues.length} fel i {data.result.checked} verifikationer.</p>
    <table>
      <thead>
        <tr><th>Verifikation</th><th>Avvikelse</th></tr>
      </thead>
      <tbody>
        {#each data.result.issues as i}
          <tr>
            <td class="mono">{i.series}{i.number}</td>
            <td>{i.reason}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<p class="muted" style="font-size: 12px">
  Varje bokförd verifikation innehåller en hash beräknad på innehållet och föregående verifikations hash.
  Om en post ändras i efterhand (förbi DB-triggern, t.ex. via direkt SQL) bryts kedjan här.
</p>
