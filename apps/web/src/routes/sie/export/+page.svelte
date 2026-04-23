<script lang="ts">
  let { data } = $props();
  const defaultFyId = data.fiscalYears[data.fiscalYears.length - 1]?.id;
</script>

<h1>Exportera SIE</h1>
<p class="subtitle">Skapa en SIE-fil av det valda räkenskapsåret.</p>

<div class="card">
  <form method="GET" action="download">
    <div class="form-row">
      <label>
        <span>Räkenskapsår</span>
        <select name="fiscalYearId" required>
          {#each data.fiscalYears as fy}
            <option value={fy.id} selected={fy.id === defaultFyId}>
              {fy.startDate} – {fy.endDate} ({fy.status === 'open' ? 'öppet' : 'stängt'})
            </option>
          {/each}
        </select>
      </label>
    </div>

    <div class="form-row">
      <label>
        <span>SIE-typ</span>
        <select name="sieType">
          <option value="4" selected>Typ 4 — alla verifikationer (vanligast)</option>
          <option value="3">Typ 3 — saldon med objekt</option>
          <option value="2">Typ 2 — periodsaldon</option>
          <option value="1">Typ 1 — endast UB/IB</option>
        </select>
      </label>
    </div>

    <div class="form-row">
      <label>
        <span>Teckenkodning</span>
        <select name="format">
          <option value="PC8" selected>PC8 (CP437) — standard, max kompatibilitet</option>
          <option value="UTF-8">UTF-8 — moderna program</option>
        </select>
      </label>
    </div>

    <div class="form-row">
      <label class="checkbox">
        <input type="checkbox" name="postedOnly" value="1" checked />
        <span>Endast bokförda verifikationer (rekommenderas — utkast har ingen hash)</span>
      </label>
    </div>

    <button class="btn btn-primary" type="submit">Ladda ner SIE-fil</button>
  </form>
</div>

<style>
  .form-row {
    margin-bottom: 16px;
  }
  .form-row label {
    display: block;
  }
  .form-row label > span {
    display: block;
    font-size: 12px;
    color: var(--ink-muted);
    margin-bottom: 4px;
  }
  .form-row select {
    width: 100%;
    max-width: 500px;
  }
  .form-row label.checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .form-row label.checkbox > span {
    margin: 0;
    font-size: 13px;
    color: var(--ink);
  }
</style>
