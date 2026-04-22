<script lang="ts">
  import { base } from '$app/paths';
  import { formatKronor } from '@booksky/core';

  let { data } = $props();

  const totalDebit = data.lines.reduce((a, l) => a + l.debitOre, 0);
  const totalCredit = data.lines.reduce((a, l) => a + l.creditOre, 0);
</script>

<div class="toolbar">
  <div>
    <h1>Verifikation {data.voucher.series}{data.voucher.number}</h1>
    <p class="subtitle">
      {data.voucher.voucherDate} · {data.voucher.description}
      {#if data.voucher.postedAt}
        <span class="badge badge-ok">Bokförd {new Date(data.voucher.postedAt).toLocaleDateString('sv-SE')}</span>
      {:else}
        <span class="badge badge-draft">Utkast</span>
      {/if}
    </p>
  </div>
  <div style="display: flex; gap: 8px">
    <a class="btn" href="{base}/vouchers">← Tillbaka</a>
    {#if !data.voucher.postedAt}
      <form method="POST" action="?/post" style="display: inline">
        <button type="submit" class="btn btn-primary">Bokför</button>
      </form>
    {/if}
  </div>
</div>

<div class="card">
  <table>
    <thead>
      <tr>
        <th style="width: 100px">Konto</th>
        <th>Namn</th>
        <th>Beskrivning</th>
        <th style="width: 130px" class="num">Debet</th>
        <th style="width: 130px" class="num">Kredit</th>
      </tr>
    </thead>
    <tbody>
      {#each data.lines as l}
        <tr>
          <td class="mono">{l.accountNumber}</td>
          <td>{l.accountName}</td>
          <td class="muted">{l.description ?? ''}</td>
          <td class="num">{l.debitOre ? formatKronor(l.debitOre) : ''}</td>
          <td class="num">{l.creditOre ? formatKronor(l.creditOre) : ''}</td>
        </tr>
      {/each}
      <tr class="totals">
        <td colspan="3"><strong>Summa</strong></td>
        <td class="num"><strong>{formatKronor(totalDebit)}</strong></td>
        <td class="num"><strong>{formatKronor(totalCredit)}</strong></td>
      </tr>
    </tbody>
  </table>
</div>

<p class="muted" style="font-size: 12px">
  {#if data.voucher.postedAt}
    Enligt Bokföringslagen får en bokförd verifikation inte ändras. Rättelser görs via rättelseverifikation.
  {:else}
    Utkast — kan fortfarande redigeras eller raderas (ej implementerat än).
  {/if}
</p>
