<script lang="ts">
  import { enhance } from '$app/forms';
  import { base } from '$app/paths';
  import { kronorToOre, formatKronor } from '@booksky/core';

  let { data, form } = $props();

  type Line = { accountId: number | ''; debit: string; credit: string; description: string };

  const initialLines = (): Line[] =>
    form?.values?.lines?.length
      ? form.values.lines.map((l: any) => ({
          accountId: l.accountId || '',
          debit: l.debit || '',
          credit: l.credit || '',
          description: l.description || ''
        }))
      : [
          { accountId: '', debit: '', credit: '', description: '' },
          { accountId: '', debit: '', credit: '', description: '' }
        ];

  let voucherDate = $state(form?.values?.voucherDate || data.today);
  let description = $state(form?.values?.description || '');
  let lines = $state<Line[]>(initialLines());

  const totalDebit = $derived(lines.reduce((a, l) => a + kronorToOre(l.debit || '0'), 0));
  const totalCredit = $derived(lines.reduce((a, l) => a + kronorToOre(l.credit || '0'), 0));
  const diff = $derived(totalDebit - totalCredit);
  const balanced = $derived(diff === 0 && totalDebit > 0);

  function addLine() {
    lines = [...lines, { accountId: '', debit: '', credit: '', description: '' }];
  }
  function removeLine(i: number) {
    if (lines.length <= 2) return;
    lines = lines.filter((_, idx) => idx !== i);
  }
</script>

<h1>Ny verifikation</h1>
<p class="subtitle">Räkenskapsår {data.fiscalYear.startDate} – {data.fiscalYear.endDate} · serie A</p>

{#if form?.errors}
  <div class="error">
    <strong>Kunde inte spara:</strong>
    <ul style="margin: 4px 0 0 16px; padding: 0">
      {#each form.errors as err}<li>{err}</li>{/each}
    </ul>
  </div>
{/if}

<form method="POST" use:enhance>
  <div class="card">
    <div class="row">
      <div class="field" style="max-width: 180px">
        <label for="voucherDate">Datum</label>
        <input id="voucherDate" name="voucherDate" type="date" bind:value={voucherDate} required />
      </div>
      <div class="field">
        <label for="description">Beskrivning</label>
        <input id="description" name="description" type="text" bind:value={description} placeholder="t.ex. Fakturabetalning kund X" required />
      </div>
    </div>
  </div>

  <div class="card">
    <div class="toolbar">
      <h2 style="margin: 0">Rader</h2>
      <button type="button" class="btn" onclick={addLine}>+ Lägg till rad</button>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 40%">Konto</th>
          <th style="width: 15%" class="num">Debet</th>
          <th style="width: 15%" class="num">Kredit</th>
          <th>Radbeskrivning</th>
          <th style="width: 40px"></th>
        </tr>
      </thead>
      <tbody>
        {#each lines as line, i}
          <tr>
            <td>
              <select name="accountId_{i}" bind:value={line.accountId} style="width: 100%" required>
                <option value="">— välj konto —</option>
                {#each data.accounts as a}
                  <option value={a.id}>{a.number} · {a.name}</option>
                {/each}
              </select>
            </td>
            <td>
              <input
                name="debit_{i}"
                type="text"
                inputmode="decimal"
                class="num"
                bind:value={line.debit}
                placeholder="0,00"
                style="width: 100%"
              />
            </td>
            <td>
              <input
                name="credit_{i}"
                type="text"
                inputmode="decimal"
                class="num"
                bind:value={line.credit}
                placeholder="0,00"
                style="width: 100%"
              />
            </td>
            <td>
              <input
                name="description_{i}"
                type="text"
                bind:value={line.description}
                placeholder=""
                style="width: 100%"
              />
            </td>
            <td>
              {#if lines.length > 2}
                <button type="button" class="btn" onclick={() => removeLine(i)} title="Ta bort">×</button>
              {/if}
            </td>
          </tr>
        {/each}
        <tr class="totals">
          <td><strong>Summa</strong></td>
          <td class="num"><strong>{formatKronor(totalDebit)}</strong></td>
          <td class="num"><strong>{formatKronor(totalCredit)}</strong></td>
          <td colspan="2">
            {#if balanced}
              <span class="badge badge-ok">Balanserar</span>
            {:else if diff !== 0}
              <span class="badge" style="background: var(--danger-soft); color: var(--danger)">
                Diff {formatKronor(diff)}
              </span>
            {/if}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="toolbar">
    <a class="btn" href="{base}/vouchers">Avbryt</a>
    <div style="display: flex; gap: 8px">
      <button type="submit" name="post" value="0" class="btn" disabled={!balanced}>Spara som utkast</button>
      <button type="submit" name="post" value="1" class="btn btn-primary" disabled={!balanced}>Bokför</button>
    </div>
  </div>
</form>
