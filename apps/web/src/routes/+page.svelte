<script lang="ts">
  import { base } from '$app/paths';
  import { formatKronor } from '@booksky/core';

  let { data } = $props();
</script>

<h1>Översikt</h1>
<p class="subtitle">
  {data.company.name} · räkenskapsår {data.fiscalYear.startDate} – {data.fiscalYear.endDate}
  {#if data.fiscalYear.status === 'open'}
    <span class="badge badge-ok">öppet</span>
  {:else}
    <span class="badge">stängt</span>
  {/if}
</p>

<div class="report-grid">
  <div class="card">
    <h2 style="margin-top: 0">Periodens resultat</h2>
    <table>
      <tbody>
        <tr><td>Intäkter</td><td class="num">{formatKronor(data.summary.incomeTotal)}</td></tr>
        <tr><td>Kostnader</td><td class="num">{formatKronor(data.summary.expenseTotal)}</td></tr>
        <tr class="totals"><td><strong>Resultat</strong></td><td class="num"><strong>{formatKronor(data.summary.result)}</strong></td></tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2 style="margin-top: 0">Balansomslutning</h2>
    <table>
      <tbody>
        <tr><td>Summa tillgångar</td><td class="num">{formatKronor(data.summary.assetsTotal)}</td></tr>
        <tr><td>Antal verifikationer</td><td class="num">{data.voucherCount}</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div class="card">
  <div class="toolbar">
    <h2 style="margin: 0">Senaste verifikationer</h2>
    <a class="btn btn-primary" href="{base}/vouchers/new">+ Ny verifikation</a>
  </div>
  {#if data.recentVouchers.length === 0}
    <p class="muted">Inga verifikationer än. Skapa din första!</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th style="width: 80px">Nr</th>
          <th style="width: 110px">Datum</th>
          <th>Beskrivning</th>
          <th style="width: 100px">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each data.recentVouchers as v}
          <tr>
            <td class="mono"><a href="{base}/vouchers/{v.id}">{v.series}{v.number}</a></td>
            <td class="mono">{v.voucherDate}</td>
            <td>{v.description}</td>
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
