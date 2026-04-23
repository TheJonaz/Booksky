<script lang="ts">
  import { base } from '$app/paths';
</script>

<h1>SIE 4</h1>
<p class="subtitle">Standard för utbyte av bokföringsdata (sie.se). Typ 4 är fullständig — konton, saldon och alla verifikationer.</p>

<div class="report-grid">
  <div class="card">
    <h2 style="margin-top: 0">Exportera</h2>
    <p>Ladda ner räkenskapsåret som en <code>.se</code>-fil. Alla andra bokföringsprogram kan läsa in den.</p>
    <p><a class="btn btn-primary" href="{base}/sie/export">Öppna export →</a></p>
  </div>

  <div class="card">
    <h2 style="margin-top: 0">Importera</h2>
    <p>Ladda upp en SIE-fil från ett annat program. Verifikationer hamnar i serie <code>I</code> som utkast — granska och bokför dem manuellt.</p>
    <p><a class="btn btn-primary" href="{base}/sie/import">Öppna import →</a></p>
  </div>
</div>
