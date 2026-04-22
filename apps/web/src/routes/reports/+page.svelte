<script lang="ts">
  import { formatKronor } from '@booksky/core';

  let { data } = $props();
</script>

<h1>Rapporter</h1>
<p class="subtitle">Period {data.fromDate} – {data.toDate}</p>

<form method="GET" class="card" style="margin-bottom: 24px">
  <div class="row">
    <div class="field" style="max-width: 200px">
      <label for="from">Från</label>
      <input id="from" name="from" type="date" value={data.fromDate} />
    </div>
    <div class="field" style="max-width: 200px">
      <label for="to">Till</label>
      <input id="to" name="to" type="date" value={data.toDate} />
    </div>
    <div class="field">
      <button type="submit" class="btn">Uppdatera</button>
    </div>
  </div>
</form>

<div class="report-grid">
  <div class="card">
    <h2 style="margin-top: 0">Resultaträkning</h2>
    <table>
      <thead>
        <tr><th>Konto</th><th>Namn</th><th class="num">Belopp</th></tr>
      </thead>
      <tbody>
        <tr><td colspan="3" class="muted" style="padding-top: 16px"><strong>{data.incomeStatement.income.title}</strong></td></tr>
        {#each data.incomeStatement.income.lines as l}
          <tr>
            <td class="mono">{l.number}</td>
            <td>{l.name}</td>
            <td class="num">{formatKronor(l.amount)}</td>
          </tr>
        {:else}
          <tr><td colspan="3" class="muted">Inga intäkter</td></tr>
        {/each}
        <tr class="totals"><td colspan="2"><strong>Summa intäkter</strong></td><td class="num"><strong>{formatKronor(data.incomeStatement.income.total)}</strong></td></tr>

        <tr><td colspan="3" class="muted" style="padding-top: 16px"><strong>{data.incomeStatement.expense.title}</strong></td></tr>
        {#each data.incomeStatement.expense.lines as l}
          <tr>
            <td class="mono">{l.number}</td>
            <td>{l.name}</td>
            <td class="num">{formatKronor(l.amount)}</td>
          </tr>
        {:else}
          <tr><td colspan="3" class="muted">Inga kostnader</td></tr>
        {/each}
        <tr class="totals"><td colspan="2"><strong>Summa kostnader</strong></td><td class="num"><strong>{formatKronor(data.incomeStatement.expense.total)}</strong></td></tr>

        <tr class="totals" style="border-top: 2px solid var(--ink)">
          <td colspan="2"><strong>Periodens resultat</strong></td>
          <td class="num"><strong>{formatKronor(data.incomeStatement.result)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2 style="margin-top: 0">Balansräkning</h2>
    <table>
      <thead>
        <tr><th>Konto</th><th>Namn</th><th class="num">Belopp</th></tr>
      </thead>
      <tbody>
        <tr><td colspan="3" class="muted" style="padding-top: 16px"><strong>{data.balanceSheet.assets.title}</strong></td></tr>
        {#each data.balanceSheet.assets.lines as l}
          <tr>
            <td class="mono">{l.number}</td>
            <td>{l.name}</td>
            <td class="num">{formatKronor(l.amount)}</td>
          </tr>
        {:else}
          <tr><td colspan="3" class="muted">Inga tillgångar</td></tr>
        {/each}
        <tr class="totals"><td colspan="2"><strong>Summa tillgångar</strong></td><td class="num"><strong>{formatKronor(data.balanceSheet.assets.total)}</strong></td></tr>

        <tr><td colspan="3" class="muted" style="padding-top: 16px"><strong>{data.balanceSheet.liabilitiesAndEquity.title}</strong></td></tr>
        {#each data.balanceSheet.liabilitiesAndEquity.lines as l}
          <tr>
            <td class="mono">{l.number}</td>
            <td>{l.name}</td>
            <td class="num">{formatKronor(l.amount)}</td>
          </tr>
        {:else}
          <tr><td colspan="3" class="muted">Inget eget kapital eller skulder</td></tr>
        {/each}
        <tr>
          <td></td>
          <td class="muted">Periodens resultat</td>
          <td class="num">{formatKronor(data.balanceSheet.periodResult)}</td>
        </tr>
        <tr class="totals">
          <td colspan="2"><strong>Summa eget kapital och skulder</strong></td>
          <td class="num"><strong>{formatKronor(data.balanceSheet.liabilitiesAndEquity.total + data.balanceSheet.periodResult)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
