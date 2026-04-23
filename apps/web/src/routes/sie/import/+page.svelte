<script lang="ts">
  import { base } from '$app/paths';
  import { enhance } from '$app/forms';

  let { form } = $props();
</script>

<h1>Importera SIE</h1>
<p class="subtitle">Ladda upp en <code>.se</code>-fil. Innehållet analyseras innan något sparas.</p>

{#if !form || form.step === 'preview'}
  {#if !form}
    <div class="card">
      <form method="POST" action="?/preview" enctype="multipart/form-data" use:enhance>
        <div class="form-row">
          <label>
            <span>SIE-fil</span>
            <input type="file" name="file" accept=".se,.sie,.si" required />
          </label>
        </div>
        <button class="btn btn-primary" type="submit">Analysera</button>
      </form>
    </div>
  {/if}

  {#if form?.step === 'preview'}
    {@const p = form.preview}
    <div class="card">
      <h2 style="margin-top: 0">Förhandsvisning — {form.filename}</h2>
      <table>
        <tbody>
          <tr><td>Företag i fil</td><td>{form.companyName ?? '(saknas)'} · {form.orgNumber ?? ''}</td></tr>
          <tr><td>SIE-typ</td><td>Typ {form.sieType ?? '?'}</td></tr>
          <tr><td>Verifikationer</td><td>{p.voucherCount}</td></tr>
          <tr><td>Transaktionsrader</td><td>{p.transactionCount}</td></tr>
          <tr>
            <td>Datumspann</td>
            <td>{p.dateRange ? `${p.dateRange.min} – ${p.dateRange.max}` : '—'}</td>
          </tr>
          <tr>
            <td>Utanför räkenskapsåret</td>
            <td>
              {#if p.outsideFiscalYear > 0}
                <span class="badge badge-warn">{p.outsideFiscalYear} hoppas över</span>
              {:else}
                —
              {/if}
            </td>
          </tr>
          <tr>
            <td>Obalanserade verifikationer</td>
            <td>
              {#if p.unbalanced.length > 0}
                <span class="badge badge-warn">{p.unbalanced.length} hoppas över</span>
              {:else}
                —
              {/if}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {#if p.missingAccounts.length > 0}
      <div class="card">
        <h2 style="margin-top: 0">Saknade konton — skapas vid import</h2>
        <table>
          <thead>
            <tr><th style="width: 80px">Nummer</th><th>Namn</th><th style="width: 140px">Typ</th></tr>
          </thead>
          <tbody>
            {#each p.missingAccounts as a}
              <tr>
                <td class="mono">{a.number}</td>
                <td>{a.name}</td>
                <td class="muted">{a.type ?? '(gissas från BAS)'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if p.unbalanced.length > 0}
      <div class="card">
        <h2 style="margin-top: 0">Obalanserade verifikationer</h2>
        <table>
          <thead><tr><th>Källa</th><th class="num">Differens</th></tr></thead>
          <tbody>
            {#each p.unbalanced as u}
              <tr>
                <td class="mono">{u.series}{u.number ?? ''}</td>
                <td class="num mono">{u.diff}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if form.warnings.length > 0}
      <div class="card">
        <h2 style="margin-top: 0">Varningar från parser</h2>
        <ul>{#each form.warnings as w}<li>{w}</li>{/each}</ul>
      </div>
    {/if}

    <div class="card">
      <form method="POST" action="?/confirm" use:enhance>
        <input type="hidden" name="fileB64" value={form.fileB64} />
        <input type="hidden" name="filename" value={form.filename} />
        <p>
          Importen skapar <strong>utkast</strong> i serie <code>I</code>. Hash-kedjan påverkas
          först när du sedan bokför varje verifikation.
        </p>
        <div class="toolbar">
          <a class="btn" href="{base}/sie/import">Avbryt</a>
          <button class="btn btn-primary" type="submit">Genomför import</button>
        </div>
      </form>
    </div>
  {/if}
{/if}

{#if form?.step === 'done'}
  {@const r = form.result}
  <div class="card">
    <h2 style="margin-top: 0">Import klar</h2>
    <table>
      <tbody>
        <tr><td>Verifikationer skapade</td><td class="num">{r.createdVoucherIds.length}</td></tr>
        <tr><td>Konton skapade</td><td class="num">{r.createdAccountIds.length}</td></tr>
        <tr><td>Hoppade över (utanför år)</td><td class="num">{r.outsideFiscalYear}</td></tr>
        <tr><td>Hoppade över (obalans)</td><td class="num">{r.unbalanced.length}</td></tr>
      </tbody>
    </table>
    <div class="toolbar" style="margin-top: 16px">
      <a class="btn btn-primary" href="{base}/vouchers">Gå till verifikationer</a>
      <a class="btn" href="{base}/sie/import">Importera fler</a>
    </div>
  </div>
{/if}

<style>
  .form-row { margin-bottom: 16px; }
  .form-row label > span {
    display: block;
    font-size: 12px;
    color: var(--ink-muted);
    margin-bottom: 4px;
  }
</style>
