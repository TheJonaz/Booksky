<script lang="ts">
  import { base } from '$app/paths';
  import { formatKronor } from '@booksky/core';
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  const totalDebit = data.lines.reduce((a, l) => a + l.debitOre, 0);
  const totalCredit = data.lines.reduce((a, l) => a + l.creditOre, 0);

  const fmtSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  const actionLabels: Record<string, string> = {
    create: 'Skapad',
    post: 'Bokförd',
    attach: 'Bilaga tillagd',
    create_correction: 'Rättelse skapad'
  };
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
      {#if data.corrects}
        · <span class="muted">rättar <a href="{base}/vouchers/{data.corrects.id}">{data.corrects.series}{data.corrects.number}</a></span>
      {/if}
    </p>
  </div>
  <div style="display: flex; gap: 8px">
    <a class="btn" href="{base}/vouchers">← Tillbaka</a>
    {#if !data.voucher.postedAt}
      <form method="POST" action="?/post" use:enhance style="display: inline">
        <button type="submit" class="btn btn-primary">Bokför</button>
      </form>
    {:else if data.correctedBy.length === 0}
      <form method="POST" action="?/correct" use:enhance style="display: inline">
        <button type="submit" class="btn">Skapa rättelse</button>
      </form>
    {/if}
  </div>
</div>

{#if form?.message}
  <div class="error">{form.message}</div>
{/if}

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

<div class="card">
  <div class="toolbar">
    <h2 style="margin: 0">Bilagor</h2>
    {#if !data.voucher.postedAt}
      <form method="POST" action="?/upload" enctype="multipart/form-data" use:enhance style="display: flex; gap: 8px; align-items: center">
        <input type="file" name="file" required />
        <button type="submit" class="btn">Ladda upp</button>
      </form>
    {/if}
  </div>
  {#if data.attachments.length === 0}
    <p class="muted" style="margin: 0">Inga bilagor än.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Filnamn</th>
          <th style="width: 160px">Typ</th>
          <th style="width: 100px" class="num">Storlek</th>
          <th style="width: 200px" class="mono">SHA-256</th>
        </tr>
      </thead>
      <tbody>
        {#each data.attachments as a}
          <tr>
            <td><a href="{base}/attachments/{a.id}" target="_blank" rel="noopener">{a.filename}</a></td>
            <td class="muted">{a.contentType}</td>
            <td class="num">{fmtSize(a.sizeBytes)}</td>
            <td class="mono muted" title={a.sha256}>{a.sha256.slice(0, 12)}…</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

{#if data.correctedBy.length > 0}
  <div class="card">
    <h2 style="margin-top: 0">Rättelser</h2>
    <ul style="margin: 0; padding-left: 20px">
      {#each data.correctedBy as c}
        <li><a href="{base}/vouchers/{c.id}">{c.series}{c.number}</a> · {c.voucherDate}</li>
      {/each}
    </ul>
  </div>
{/if}

{#if data.voucher.hash}
  <div class="card">
    <h2 style="margin-top: 0">Integritet</h2>
    <p style="margin: 0 0 4px; font-size: 12px" class="muted">Hash (SHA-256):</p>
    <code class="mono" style="font-size: 12px; word-break: break-all">{data.voucher.hash}</code>
    {#if data.voucher.prevHash}
      <p style="margin: 8px 0 4px; font-size: 12px" class="muted">Föregående hash:</p>
      <code class="mono" style="font-size: 12px; word-break: break-all; color: var(--ink-muted)">{data.voucher.prevHash}</code>
    {:else}
      <p style="margin: 8px 0 0; font-size: 12px" class="muted">Första i kedjan (genesis).</p>
    {/if}
  </div>
{/if}

<div class="card">
  <h2 style="margin-top: 0">Historik</h2>
  {#if data.audit.length === 0}
    <p class="muted" style="margin: 0">Ingen historik.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th style="width: 170px">Tidpunkt</th>
          <th style="width: 180px">Händelse</th>
          <th>Detaljer</th>
        </tr>
      </thead>
      <tbody>
        {#each data.audit as a}
          <tr>
            <td class="mono muted">{new Date(a.createdAt).toLocaleString('sv-SE')}</td>
            <td>{actionLabels[a.action] ?? a.action}</td>
            <td class="muted mono" style="font-size: 12px">{a.payload ? JSON.stringify(a.payload) : ''}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<p class="muted" style="font-size: 12px">
  {#if data.voucher.postedAt}
    Bokförd verifikation är oföränderlig enligt BFL 5:6. Databastriggers blockerar ändringar. Rättelser görs via ny verifikation.
  {:else}
    Utkast — redigerbart. Bokför för att låsa.
  {/if}
</p>
