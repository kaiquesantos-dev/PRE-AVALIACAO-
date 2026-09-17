# Coworking API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Coworking API (Auth, Workspaces CRUD, Bookings with overlap-prevention) on top of the already-migrated Prisma schema, matching every requirement in the original assessment spec.

**Architecture:** Layered NestJS modules (Controller → Service → PrismaService), one module per bounded context (`prisma`, `auth`, `workspaces`, `bookings`). JWT-based stateless auth with role guards. Business rules live only in Services, never Controllers.

**Tech Stack:** NestJS 10, Prisma 7.10.0 (`prisma-client` generator + `@prisma/adapter-pg`), PostgreSQL, `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`, `bcrypt`, `class-validator` + `class-transformer`.

**Spec:** `docs/superpowers/specs/2026-09-17-coworking-api-design.md`

## Global Constraints

- Prisma client is imported from `../generated/prisma/client` (custom output path already configured in `prisma/schema.prisma`) — there is no `index.ts`, import the `client` file directly.
- Every `PrismaClient` instantiation (app + seed script) MUST use `@prisma/adapter-pg` (`new PrismaPg({ connectionString: process.env.DATABASE_URL })`) — Prisma 7's `prisma-client` generator has no bundled query engine, the adapter is mandatory, not optional.
- Passwords are hashed with `bcrypt` (10 salt rounds), never stored or returned in plaintext.
- Users are created only via `prisma/seed.ts` — there is no `POST /auth/register` endpoint (confirmed decision in spec).
- JWT secret comes from `process.env.JWT_SECRET` (already in `.env`), expiry is `1d`.
- Global `ValidationPipe` uses `{ whitelist: true, forbidNonWhitelisted: true, transform: true }` — extra body fields must produce `400`.
- Business logic (overlap checks, ownership checks, existence checks) lives in `*.service.ts` files only. Controllers only wire HTTP to service calls.
- HTTP status codes must match the spec exactly per endpoint (see spec's "Endpoints" section).
- No Swagger, no pagination, no `DELETE /bookings` — explicitly out of scope per spec.
- Verification steps in this plan are manual HTTP checks (curl), not automated Jest tests — this matches the spec's testing decision ("validação principal é manual via requisições HTTP"), not the writing-plans skill's default TDD template.

---

### Task 1: PrismaModule + PrismaService

**Files:**
- Create: `src/prisma/prisma.service.ts`
- Create: `src/prisma/prisma.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: `PrismaService` (injectable, extends generated `PrismaClient`), exported globally from `PrismaModule` — every later module injects it via constructor without importing `PrismaModule` again (it's `@Global()`).

- [ ] **Step 1: Install the driver adapter**

Run:
```bash
npm install @prisma/adapter-pg
```

- [ ] **Step 2: Create `src/prisma/prisma.service.ts`**

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 3: Create `src/prisma/prisma.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 4: Register `PrismaModule` in `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 5: Verify it connects**

Run: `npm run build`
Expected: no TypeScript errors.

Run: `npm run start:dev`
Expected: log shows `Nest application successfully started` with no Prisma/Postgres connection error. Stop the process (Ctrl+C) once confirmed.

- [ ] **Step 6: Commit**

```bash
git add src/prisma src/app.module.ts package.json package-lock.json
git commit -m "feat: add PrismaService with pg driver adapter"
```

---

### Task 2: Seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `prisma.config.ts`

**Interfaces:**
- Consumes: `PrismaClient` from `../src/generated/prisma/client`, `PrismaPg` from `@prisma/adapter-pg` (same pattern as `PrismaService`, but instantiated standalone since the seed script runs outside Nest's DI).
- Produces: two rows in `User` — `admin@coworking.com` (ADMIN) / `user@coworking.com` (USER), both with known passwords, used by every later manual test in this plan.

- [ ] **Step 1: Install bcrypt**

Run:
```bash
npm install bcrypt
npm install -D @types/bcrypt
```

- [ ] **Step 2: Create `prisma/seed.ts`**

```ts
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@coworking.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@coworking.com',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@coworking.com' },
    update: {},
    create: {
      name: 'Usuario Teste',
      email: 'user@coworking.com',
      password: userPassword,
      role: Role.USER,
    },
  });

  console.log(
    'Seed concluído: admin@coworking.com / admin123, user@coworking.com / user123',
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Register the seed command in `prisma.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

- [ ] **Step 4: Run the seed and verify**

Run: `npx prisma db seed`
Expected output: `Seed concluído: admin@coworking.com / admin123, user@coworking.com / user123`

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts prisma.config.ts package.json package-lock.json
git commit -m "feat: add seed script with ADMIN and USER accounts"
```

---

### Task 3: Auth — login endpoint

**Files:**
- Create: `src/auth/dto/login.dto.ts`
- Create: `src/auth/auth.service.ts`
- Create: `src/auth/auth.controller.ts`
- Create: `src/auth/auth.module.ts`
- Modify: `src/main.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 1) via global module injection.
- Produces: `AuthService.login(email, password): Promise<{ access_token: string }>`, mounted at `POST /auth/login`. Later tasks (guards) reuse the same `JWT_SECRET` and payload shape `{ sub, email, role }`.

- [ ] **Step 1: Install auth and validation dependencies**

Run:
```bash
npm install @nestjs/jwt class-validator class-transformer
```

- [ ] **Step 2: Create `src/auth/dto/login.dto.ts`**

```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

- [ ] **Step 3: Create `src/auth/auth.service.ts`**

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
```

- [ ] **Step 4: Create `src/auth/auth.controller.ts`**

```ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
```

- [ ] **Step 5: Create `src/auth/auth.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 6: Add the global `ValidationPipe` in `src/main.ts`**

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

- [ ] **Step 7: Register `AuthModule` in `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 8: Verify manually**

Run: `npm run start:dev` (leave it running in a separate terminal)

Run:
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coworking.com","password":"admin123"}'
```
Expected: `200 OK` with `{"access_token":"..."}`. Save this token — it is used in Task 4.

Run:
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coworking.com","password":"wrong"}'
```
Expected: `401 Unauthorized`.

Run:
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"admin123"}'
```
Expected: `400 Bad Request`.

Run:
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coworking.com","password":"admin123","extra":"field"}'
```
Expected: `400 Bad Request` (forbidNonWhitelisted rejects `extra`).

- [ ] **Step 9: Commit**

```bash
git add src/auth src/main.ts src/app.module.ts package.json package-lock.json
git commit -m "feat: add auth login endpoint with JWT"
```

---

### Task 4: Auth guards/decorators + Workspaces CRUD

**Files:**
- Create: `src/auth/jwt.strategy.ts`
- Create: `src/auth/jwt-auth.guard.ts`
- Create: `src/auth/roles.decorator.ts`
- Create: `src/auth/roles.guard.ts`
- Create: `src/auth/current-user.decorator.ts`
- Modify: `src/auth/auth.module.ts`
- Create: `src/workspaces/dto/create-workspace.dto.ts`
- Create: `src/workspaces/dto/update-workspace.dto.ts`
- Create: `src/workspaces/workspaces.service.ts`
- Create: `src/workspaces/workspaces.controller.ts`
- Create: `src/workspaces/workspaces.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: JWT payload shape `{ sub, email, role }` from Task 3's `AuthService.login`.
- Produces: `JwtAuthGuard` (validates Bearer token → sets `request.user = { userId, email, role }`), `RolesGuard` + `@Roles(...)` (blocks by role), `@CurrentUser()` param decorator returning `{ userId: number, email: string, role: 'USER' | 'ADMIN' }`. These three are reused unchanged by the Bookings module in Task 5 — do not rename `userId`/`role` on the returned object.

- [ ] **Step 1: Install passport packages**

Run:
```bash
npm install @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt
```

- [ ] **Step 2: Create `src/auth/jwt.strategy.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;
  email: string;
  role: 'USER' | 'ADMIN';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
```

- [ ] **Step 3: Create `src/auth/jwt-auth.guard.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 4: Create `src/auth/roles.decorator.ts`**

```ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('USER' | 'ADMIN')[]) =>
  SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 5: Create `src/auth/roles.guard.ts`**

```ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Acesso negado para este papel');
    }
    return true;
  }
}
```

- [ ] **Step 6: Create `src/auth/current-user.decorator.ts`**

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: 'USER' | 'ADMIN';
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 7: Register `PassportModule` and `JwtStrategy` in `src/auth/auth.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 8: Create `src/workspaces/dto/create-workspace.dto.ts`**

```ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

- [ ] **Step 9: Create `src/workspaces/dto/update-workspace.dto.ts`**

```ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

- [ ] **Step 10: Create `src/workspaces/workspaces.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.workspace.findMany();
  }

  async findOneOrThrow(id: number) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }
    return workspace;
  }

  create(dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({ data: dto });
  }

  async update(id: number, dto: UpdateWorkspaceDto) {
    await this.findOneOrThrow(id);
    return this.prisma.workspace.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOneOrThrow(id);
    await this.prisma.workspace.delete({ where: { id } });
    return { message: 'Workspace removido' };
  }
}
```

- [ ] **Step 11: Create `src/workspaces/workspaces.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  findAll() {
    return this.workspacesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workspacesService.remove(id);
  }
}
```

- [ ] **Step 12: Create `src/workspaces/workspaces.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
})
export class WorkspacesModule {}
```

- [ ] **Step 13: Register `WorkspacesModule` in `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [PrismaModule, AuthModule, WorkspacesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 14: Verify manually**

Restart the dev server (`npm run start:dev`) so the new modules load.

Log in as USER and try to create a workspace (should fail):
```bash
USER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@coworking.com","password":"user123"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

curl -i -X POST http://localhost:3000/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"name":"Sala 101"}'
```
Expected: `403 Forbidden`.

Log in as ADMIN and create a workspace:
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coworking.com","password":"admin123"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

curl -i -X POST http://localhost:3000/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Sala 101","description":"Sala de reunião"}'
```
Expected: `201 Created` with the workspace JSON. Note the returned `id` — used in Task 5.

Check public listing (no token needed):
```bash
curl -i http://localhost:3000/workspaces
```
Expected: `200 OK` with an array containing the workspace just created.

Update and delete as ADMIN (replace `1` with the real id):
```bash
curl -i -X PATCH http://localhost:3000/workspaces/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"description":"Atualizada"}'

curl -i -X DELETE http://localhost:3000/workspaces/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
Expected: both `200 OK`. A second `DELETE` on the same id should now return `404`.

No token at all:
```bash
curl -i -X POST http://localhost:3000/workspaces -H "Content-Type: application/json" -d '{"name":"X"}'
```
Expected: `401 Unauthorized`.

Since Task 5 needs a workspace to exist, re-create one as ADMIN before moving on and keep its `id`.

- [ ] **Step 15: Commit**

```bash
git add src/auth src/workspaces src/app.module.ts package.json package-lock.json
git commit -m "feat: add JWT guards, roles guard, and workspaces CRUD"
```

---

### Task 5: Bookings module

**Files:**
- Create: `src/bookings/dto/create-booking.dto.ts`
- Create: `src/bookings/bookings.service.ts`
- Create: `src/bookings/bookings.controller.ts`
- Create: `src/bookings/bookings.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `JwtAuthGuard`, `CurrentUser()` → `AuthenticatedUser` (Task 4), `PrismaService` (Task 1).
- Produces: `POST /bookings`, `GET /bookings/my`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel` — no other module depends on these.

- [ ] **Step 1: Create `src/bookings/dto/create-booking.dto.ts`**

```ts
import { IsInt, IsISO8601 } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  workspaceId: number;

  @IsISO8601()
  startAt: string;

  @IsISO8601()
  endAt: string;
}
```

- [ ] **Step 2: Create `src/bookings/bookings.service.ts`**

```ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateBookingDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('startAt deve ser anterior a endAt');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: dto.workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    const overlapping = await this.prisma.booking.findFirst({
      where: {
        workspaceId: dto.workspaceId,
        canceledAt: null,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (overlapping) {
      throw new ConflictException('Já existe uma reserva ativa nesse período');
    }

    return this.prisma.booking.create({
      data: { userId, workspaceId: dto.workspaceId, startAt, endAt },
    });
  }

  findMine(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId, canceledAt: null },
    });
  }

  async findOneOwned(userId: number, id: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Reserva não encontrada');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('Você não pode acessar essa reserva');
    }
    return booking;
  }

  async cancel(userId: number, id: number) {
    const booking = await this.findOneOwned(userId, id);
    if (booking.canceledAt) {
      throw new ConflictException('Reserva já foi cancelada');
    }
    return this.prisma.booking.update({
      where: { id },
      data: { canceledAt: new Date() },
    });
  }
}
```

- [ ] **Step 3: Create `src/bookings/bookings.controller.ts`**

`GET('my')` MUST be declared before `GET(':id')` — otherwise Nest matches `/bookings/my` against the `:id` route first and `ParseIntPipe` rejects `"my"` with a `400` instead of routing to `findMine`.

```ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/current-user.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user.userId, dto);
  }

  @Get('my')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findMine(user.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingsService.findOneOwned(user.userId, id);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingsService.cancel(user.userId, id);
  }
}
```

- [ ] **Step 4: Create `src/bookings/bookings.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
```

- [ ] **Step 5: Register `BookingsModule` in `src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [PrismaModule, AuthModule, WorkspacesModule, BookingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 6: Verify manually**

Restart `npm run start:dev`. Re-obtain `USER_TOKEN` and `ADMIN_TOKEN` as in Task 4 Step 14, and create a fresh workspace as ADMIN if none exists — note its `id` (assume `1` below).

Create a booking as USER:
```bash
curl -i -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"workspaceId":1,"startAt":"2026-09-20T14:00:00Z","endAt":"2026-09-20T16:00:00Z"}'
```
Expected: `201 Created`. Note the returned `id` as `BOOKING_ID`.

Try an overlapping booking (same workspace, overlapping window):
```bash
curl -i -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"workspaceId":1,"startAt":"2026-09-20T15:00:00Z","endAt":"2026-09-20T17:00:00Z"}'
```
Expected: `409 Conflict`.

Invalid period (`startAt >= endAt`):
```bash
curl -i -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"workspaceId":1,"startAt":"2026-09-20T16:00:00Z","endAt":"2026-09-20T14:00:00Z"}'
```
Expected: `400 Bad Request`.

Nonexistent workspace:
```bash
curl -i -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"workspaceId":9999,"startAt":"2026-09-21T14:00:00Z","endAt":"2026-09-21T16:00:00Z"}'
```
Expected: `404 Not Found`.

List my bookings:
```bash
curl -i http://localhost:3000/bookings/my -H "Authorization: Bearer $USER_TOKEN"
```
Expected: `200 OK`, array containing the booking from step 1, none canceled.

Fetch a nonexistent booking:
```bash
curl -i http://localhost:3000/bookings/999 -H "Authorization: Bearer $USER_TOKEN"
```
Expected: `404 Not Found`.

Cancel the booking, then cancel it again:
```bash
curl -i -X PATCH http://localhost:3000/bookings/$BOOKING_ID/cancel -H "Authorization: Bearer $USER_TOKEN"
curl -i -X PATCH http://localhost:3000/bookings/$BOOKING_ID/cancel -H "Authorization: Bearer $USER_TOKEN"
```
Expected: first call `200 OK`, second call `409 Conflict`.

Confirm it disappeared from the active list:
```bash
curl -i http://localhost:3000/bookings/my -H "Authorization: Bearer $USER_TOKEN"
```
Expected: `200 OK`, empty array (or without the canceled booking).

- [ ] **Step 7: Commit**

```bash
git add src/bookings src/app.module.ts
git commit -m "feat: add bookings module with overlap prevention"
```

---

### Task 6: README and final end-to-end pass

**Files:**
- Modify: `README.md`

**Interfaces:**
- None — this task documents the finished system, it does not change behavior.

- [ ] **Step 1: Replace `README.md` with the project-specific content**

```markdown
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

## Usuários de teste (via seed)

| Email | Senha | Papel |
|---|---|---|
| admin@coworking.com | admin123 | ADMIN |
| user@coworking.com | user123 | USER |

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

## Rodando os cenários de teste manualmente

Veja `docs/superpowers/plans/2026-09-17-coworking-api-implementation.md`, Tasks 3–5, para os comandos `curl` completos de cada cenário (login, autorização por papel, validação 400, recursos inexistentes 404, sobreposição 409, fluxo E2E).
```

- [ ] **Step 2: Run the full 10-step E2E flow from the spec, back to back**

With the server running and a clean database (or a fresh workspace), run in order:
1. `npx prisma db seed` (idempotent — safe to re-run)
2. `POST /auth/login` as ADMIN → get `ADMIN_TOKEN`
3. `GET /workspaces` → confirm public access works
4. `POST /workspaces` as USER → expect `403`
5. `POST /workspaces` as ADMIN → expect `201`, note `id`
6. `POST /bookings` as USER (valid) → expect `201`
7. `POST /bookings` (overlapping) → expect `409`
8. `GET /bookings/my` → expect `200` with the booking
9. `PATCH /bookings/:id/cancel` → expect `200`
10. `GET /bookings/my` → confirm the booking is no longer listed

All 10 steps passing is the project's "Definição de Pronto" per the spec.

- [ ] **Step 3: Final build check**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add setup instructions and design decisions to README"
git push
```
