# Treinos Meia Maratona

App pessoal para lançar treinos realizados, pulados ou pendentes do plano de meia maratona até 12/08/2026.

## Stack

- HTML, CSS e JavaScript puro
- Node.js para servidor local
- Vercel Functions para produção
- Vercel Blob como banco NoSQL em `database/db.json`
- Fallback local em `database/db.json`

## Rodar localmente

```bash
npm install
npm start
```

Acesse:

```text
http://localhost:3000
```

## Variáveis na Vercel

Obrigatórias em produção:

```text
APP_PASSWORD
BLOB_READ_WRITE_TOKEN
```

O `BLOB_READ_WRITE_TOKEN` é criado ao conectar o Vercel Blob ao projeto.

## Deploy

```bash
npx vercel deploy --prod --scope iguinhowills-projects
```

URL de produção atual:

```text
https://treinos-meia-maratona.vercel.app
```

## GitHub

Crie um repositório privado no GitHub e depois rode:

```bash
git remote add origin https://github.com/<usuario>/treinos-meia-maratona.git
git push -u origin main
```

Não suba `.env.local`, `.vercel/`, a planilha original ou o export bruto do Samsung Health.
