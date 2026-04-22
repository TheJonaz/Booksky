# booksky

Molnbaserad bokföringstjänst enligt svensk Bokföringslag (BFL).

## Körning

```bash
npm install
npm run db:up        # starta Postgres i Docker
npm run db:push      # skapa schema
npm run db:seed      # seeda BAS-konton + exempelbolag
npm run dev          # SvelteKit på 0.0.0.0:5173, base path /booksky
```

Öppna `http://192.168.1.23:5173/booksky/` (eller bakom reverse proxy på `http://192.168.1.23/booksky/`).

## Status

Fas 1 (pågår): grund, kontoplan, manuell verifikation, balans/resultat.
