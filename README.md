# Coworking API

API REST em NestJS para gestão de coworking: usuários, workspaces e reservas, com prevenção de sobreposição de horários.

## Stack

NestJS 10 · Prisma 7.10.0 (`@prisma/adapter-pg`) · PostgreSQL · JWT (`@nestjs/jwt` + `@nestjs/passport`) · `class-validator`

## Setup

```bash
npm install
cp .env.example .env   # ajuste DATABASE_URL e JWT_SECRET se necessário
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Documentação interativa (Swagger): `http://localhost:3000/api`

## Usuários de teste (via seed)

| Email | Senha | Papel |
|---|---|---|
| admin@coworking.com | admin123 | ADMIN |
| user@coworking.com | user1234 | USER |

## Endpoints

| Método | Rota | Acesso |
|---|---|---|
| POST | /auth/login | Público |
| GET | /workspaces | Público |
| POST | /workspaces | ADMIN |
| PATCH | /workspaces/:id | ADMIN |
| DELETE | /workspaces/:id | ADMIN |
| POST | /bookings | USER |
| GET | /bookings/my | USER |
| GET | /bookings/:id | USER (dono) |
| PATCH | /bookings/:id/cancel | USER (dono) |

## Decisões de Design

- **Sem registro público de usuário**: usuários são criados via `prisma/seed.ts`. O fluxo E2E da especificação original permite "seed ou primeiro login"; não há `POST /auth/register` na lista de endpoints exigidos.
- **Hash de senha: bcrypt** (10 salt rounds) — padrão do ecossistema NestJS, sem dependências nativas problemáticas.
- **JWT expira em 1 dia** — ambiente de avaliação, sem endpoint de refresh especificado.
- **Workspaces com CRUD completo** (`PATCH`/`DELETE` além de `GET`/`POST`) — o checklist da especificação original pede "Workspaces CRUD funcionando"; a observação do modelo Workspace já autoriza ADMIN a criar/deletar.
- **`GET /bookings/:id`** foi adicionado para cobrir o cenário de teste obrigatório "`GET /bookings/999 → 404`", que não tinha endpoint correspondente na lista original.
- **Swagger** (`/api`) foi adicionado como ferramenta de teste manual, apesar de listado como bônus na especificação — não altera nenhum comportamento da API.

## Regra de negócio: sobreposição de reservas

Duas reservas ativas (`canceledAt = null`) no mesmo workspace não podem se sobrepor:

```
nova.startAt < existente.endAt AND nova.endAt > existente.startAt
```

Cancelar uma reserva é um soft-delete (`canceledAt` recebe a data atual) — o histórico nunca é apagado, e o horário fica livre para novas reservas.

## Rodando os cenários de teste manualmente

Veja `docs/superpowers/plans/2026-09-17-coworking-api-implementation.md` (Tasks 3–5) para os comandos `curl` completos de cada cenário obrigatório: login, autorização por papel, validação (400), recursos inexistentes (404), sobreposição (409) e o fluxo E2E completo de 10 passos. Todos os cenários foram executados manualmente e confirmados durante o desenvolvimento.

## Scripts

```bash
npm run start:dev   # desenvolvimento, com watch
npm run build        # build de produção
npm run start:prod   # roda o build (dist/main)
npx prisma db seed   # recria/atualiza os usuários de teste (idempotente)
```
