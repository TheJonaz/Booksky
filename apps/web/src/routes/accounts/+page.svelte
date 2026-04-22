<script lang="ts">
  let { data } = $props();

  const typeLabel: Record<string, string> = {
    asset: 'Tillgång',
    liability: 'Skuld',
    equity: 'Eget kapital',
    income: 'Intäkt',
    expense: 'Kostnad'
  };

  let filter = $state('');
  const filtered = $derived(
    data.accounts.filter((a) => {
      if (!filter.trim()) return true;
      const q = filter.toLowerCase();
      return a.number.includes(q) || a.name.toLowerCase().includes(q);
    })
  );
</script>

<h1>Kontoplan</h1>
<p class="subtitle">BAS-kontoplan för {data.company.name}. {data.accounts.length} konton.</p>

<div class="card">
  <div class="toolbar">
    <input type="text" placeholder="Sök nummer eller namn…" bind:value={filter} style="max-width: 300px" />
    <span class="muted">{filtered.length} av {data.accounts.length}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 80px">Nummer</th>
        <th>Namn</th>
        <th style="width: 140px">Typ</th>
        <th style="width: 100px">Moms</th>
      </tr>
    </thead>
    <tbody>
      {#each filtered as a}
        <tr>
          <td class="mono">{a.number}</td>
          <td>{a.name}</td>
          <td><span class="badge">{typeLabel[a.type]}</span></td>
          <td class="mono muted">{a.vatCode ?? ''}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
