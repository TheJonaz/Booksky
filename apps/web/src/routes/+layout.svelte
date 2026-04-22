<script lang="ts">
  import '../app.css';
  import { base } from '$app/paths';
  import { page } from '$app/stores';

  let { data, children } = $props();

  const nav = [
    { href: '/', label: 'Översikt' },
    { href: '/vouchers', label: 'Verifikationer' },
    { href: '/accounts', label: 'Kontoplan' },
    { href: '/reports', label: 'Rapporter' },
    { href: '/integrity', label: 'Integritet' }
  ];

  const isActive = (href: string) => {
    const path = $page.url.pathname.replace(base, '') || '/';
    return href === '/' ? path === '/' : path.startsWith(href);
  };
</script>

<header class="topbar">
  <div class="brand">booksky</div>
  <nav>
    {#each nav as item}
      <a href="{base}{item.href === '/' ? '/' : item.href}" class:active={isActive(item.href)}>
        {item.label}
      </a>
    {/each}
  </nav>
  <div class="company">
    {data.company.name} · {data.fiscalYear.startDate.slice(0, 4)}
  </div>
</header>

<main>
  {@render children()}
</main>
