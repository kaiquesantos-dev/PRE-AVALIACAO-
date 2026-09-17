# Coworking API — Design (Pré-Avaliação)

Baseado em `PROJETO-COWORKING-API_1.md` (spec original da avaliação), com
lacunas fechadas e decisões técnicas explícitas após revisão. Este documento
é a fonte da verdade para o plano de implementação.

## Contexto

API REST em NestJS pra gestão de coworking: Users (USER/ADMIN), Workspaces
(espaços reserváveis), Bookings (reservas). Regra crítica: duas reservas
ativas não podem se sobrepor no mesmo workspace. Avaliação de 1 dia, será
corrigida por uma IA que compara o código contra o `.md` original — por
isso, cobertura literal dos requisitos (inclusive frases de prosa, não só a
tabela de endpoints) importa tanto quanto a implementação correta.

## Entidades e relacionamentos

Sem mudanças em relação ao `.md` original — já modelado e migrado:

- `User` (id, name, email único, password hash, role enum USER/ADMIN, bookings[], createdAt)
- `Workspace` (id, name, description?, bookings[], createdAt)
- `Booking` (id, userId, workspaceId, startAt, endAt, canceledAt?, createdAt, relations user/workspace)

Regra de sobreposição (Service, não no schema): reserva nova conflita com
uma ativa existente do mesmo workspace se
`nova.startAt < existente.endAt AND nova.endAt > existente.startAt`.

## Endpoints (revisado)

### Auth
- `POST /auth/login` — público. `{ email, password }` → `200 { access_token }` / `401`.

### Workspaces
- `GET /workspaces` — público.
- `POST /workspaces` — ADMIN. `201` / `400` / `401` / `403`.
- `PATCH /workspaces/:id` — ADMIN. **Adicionado**: o checklist do `.md`
  pede "Workspaces CRUD funcionando"; a tabela de endpoints original só
  cobria Create+Read. Fecha a lacuna sem contradizer o doc (o texto de
  observação do Workspace já diz "Somente ADMIN cria/deleta").
  `200` / `400` / `401` / `403` / `404`.
- `DELETE /workspaces/:id` — ADMIN. **Adicionado**, mesma justificativa.
  `200` (ou `204`) / `401` / `403` / `404`.

### Bookings
- `POST /bookings` — USER autenticado. `userId` vem de `@CurrentUser()`,
  nunca do body. `201` / `400` / `401` / `404` (workspace) / `409` (overlap).
- `GET /bookings/my` — USER autenticado. Só reservas ativas (`canceledAt = null`).
- `GET /bookings/:id` — USER autenticado, só o dono. **Adicionado**: o
  cenário de teste obrigatório `GET /bookings/999 → 404` não tinha endpoint
  correspondente na lista original. `200` / `401` / `403` (não é dono) / `404`.
- `PATCH /bookings/:id/cancel` — USER autenticado, dono. `200` / `401` / `403` / `404` / `409` (já cancelada).

## Decisões técnicas (não especificadas no `.md` original)

Cada uma documentada aqui **e** no README final do projeto, pra qualquer
leitor (humano ou IA corretora) ver que foi decisão deliberada, não lacuna:

1. **Criação de usuário via seed**, não via rota pública de registro. O
   fluxo E2E do `.md` diz explicitamente "Criar user (via seed ou primeiro
   login)" e a lista de endpoints nunca inclui `POST /auth/register`.
   `prisma/seed.ts` cria 1 ADMIN + 1 USER de teste com credenciais
   documentadas no README.
2. **Hash de senha: bcrypt** (`bcrypt.hash` / `bcrypt.compare`). Padrão do
   ecossistema Nest, sem dependência de build nativo problemática no
   Windows, suficiente para o escopo.
3. **JWT expira em `1d`**. Ambiente de avaliação/dev; não há endpoint de
   refresh no `.md`, então token de vida curta obrigaria relogin manual
   repetido durante os testes.
4. **Driver adapter `@prisma/adapter-pg`**: o `.md` lista isso
   explicitamente em "Conceitos Aplicados" ("Prisma 7.10.0 com driver
   adapter pg"). `PrismaService` usa `PrismaClient({ adapter })`.
5. **Respostas JSON espelham exatamente os exemplos do `.md`** (mesmos
   nomes de campo, sem campos extras como `password`). Status HTTP usados
   são exatamente os códigos listados em cada cenário do `.md`.

## Arquitetura (pastas)

Idêntica ao "🏗️ Arquitetura Esperada" do `.md`: `src/{auth,workspaces,bookings,prisma}` com module/controller/service/dto por feature, guards e decorator `@CurrentUser()` em `auth/`.

## Ordem de implementação (fatia vertical por fatia vertical)

1. ~~Schema + migration~~ — feito.
2. `PrismaModule`/`PrismaService` (com driver adapter pg).
3. `AuthModule`: DTO de login, `AuthService` (valida credenciais, gera JWT),
   `JwtStrategy`, `JwtAuthGuard`, `@CurrentUser()`, `RolesGuard`/`@Roles()`.
4. `prisma/seed.ts`: 1 ADMIN + 1 USER, senha hasheada.
5. `WorkspacesModule`: CRUD completo (GET público, POST/PATCH/DELETE ADMIN).
6. `BookingsModule`: create (com checagem de overlap), `GET /my`,
   `GET /:id`, `PATCH /:id/cancel`.
7. Validação global (`ValidationPipe` com `whitelist` + `forbidNonWhitelisted`).
8. Testes manuais dos 6 cenários obrigatórios + fluxo E2E completo.
9. README com instruções de execução + seção "Decisões de Design".

## Testando

Sem testes automatizados exigidos além do que já existe no scaffold
(`jest`); validação principal é manual via requisições HTTP (arquivo
`http/` ou similar) cobrindo os 6 cenários do `.md` e o fluxo E2E de 10
passos.

## Fora de escopo (YAGNI, confirmado)

- Swagger/OpenAPI (doc explicitamente marca como bônus, depois do obrigatório).
- Endpoint de registro público de usuário.
- Paginação/filtros em `GET /workspaces`.
