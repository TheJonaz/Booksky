<script lang="ts">
  import { base } from '$app/paths';
  import { formatKronor } from '@booksky/core';

  let { data } = $props();
</script>

<div class="toolbar">
  <div>
    <h1>Verifikationer</h1>
    <p class="subtitle">{data.vouchers.length} st i {data.fiscalYear.startDate.slice(0, 4)}</p>
  </div>
  <a class="btn btn-primary" href="{base}/vouchers/new">+ Ny verifikation</a>
</div>

<div class="card">
  {#if data.vouchers.length === 0}
    <p class="muted">Inga verifikationer än.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th style="width: 90px">Nr</th>
          <th style="width: 120px">Datum</th>
          <th>Beskrivning</th>
          <th style="width: 140px" class="num">Belopp</th>
          <th style="width: 110px">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each data.vouchers as v}
          <tr>
            <td class="mono"><a href="{base}/vouchers/{v.id}">{v.series}{v.number}</a></td>
            <td class="mono">{v.voucherDate}</td>
            <td>{v.description}</td>
            <td class="num">{formatKronor(v.totalOre)}</td>
            <td>
              {#if v.postedAt}
                <span class="badge badge-ok">Bokförd</span>
              {:else}
                <span class="badge badge-draft">Utkast</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
