# Agendamentos Cabelereiro

API REST de back-office para gerenciamento de agenda, clientes e serviços de um salão de cabelereiro. Construída em NestJS + Prisma + SQLite.

## Requisitos

- Node.js 18 LTS ou superior
- npm 9+

## Setup inicial

**1. Instalar dependências**

```bash
npm install
```

**2. Configurar variáveis de ambiente**

```bash
cp .env.example .env
```

Variáveis disponíveis:

| Variável | Descrição | Default |
|---|---|---|
| `DATABASE_URL` | Caminho do SQLite | `file:./dev.db` |
| `ADMIN_EMAIL` | Email do admin criado pelo seed | `admin@salao.local` |
| `ADMIN_PASSWORD` | Senha em texto puro (vira hash bcrypt no seed) | `troque-essa-senha` |
| `JWT_SECRET` | Segredo de assinatura do JWT | (definir um valor aleatório) |
| `JWT_EXPIRES_IN` | Tempo de vida do token | `1h` |
| `PORT` | Porta HTTP | `3000` |

> Em produção, **troque `JWT_SECRET` e `ADMIN_PASSWORD`** por valores fortes antes de subir.

**3. Rodar migration inicial**

```bash
npx prisma migrate dev
```

Esse comando cria o `dev.db`, aplica todas as migrations e roda o seed automaticamente (cria o admin a partir do `.env`).

Se precisar rodar só o seed isoladamente (sem aplicar migrations):

```bash
npm run seed
```

O seed é idempotente — rodar de novo não duplica nada.

## Rodar a aplicação

```bash
# desenvolvimento com hot reload
npm run start:dev

# desenvolvimento sem hot reload
npm run start

# produção
npm run build
npm run start:prod
```

A API sobe em **http://localhost:3000**.

## Swagger (documentação interativa)

Acesse **http://localhost:3000/api** para a UI do Swagger com todos os endpoints.

Para testar rotas protegidas pelo Swagger:

1. Faça `POST /auth/login` com email/senha do admin
2. Copie o `access_token` retornado
3. Clique no botão **Authorize** no topo da página
4. Cole o token e confirme — todos os endpoints protegidos passam a aceitar suas requisições

## Endpoints

| Recurso | Rotas |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Services | `POST /services`, `GET /services`, `GET /services/:id`, `PATCH /services/:id`, `DELETE /services/:id` |
| Clients | `POST /clients`, `GET /clients`, `GET /clients/:id`, `PATCH /clients/:id`, `DELETE /clients/:id` |
| Appointments | `POST /appointments`, `GET /appointments`, `GET /appointments/:id`, `PATCH /appointments/:id`, `DELETE /appointments/:id` |

Todos os endpoints exceto `POST /auth/login` exigem o header `Authorization: Bearer <token>`.

Para detalhes sobre payloads, filtros e como consumir do front-end, veja [FRONTEND.md](./FRONTEND.md).

## Comandos úteis

```bash
# Criar nova migration após alterar prisma/schema.prisma
npx prisma migrate dev --name nome_da_mudanca

# Resetar o banco (drop + reaplicar migrations + seed)
npx prisma migrate reset --force

# Abrir o Prisma Studio (UI web pra inspecionar/editar dados)
npx prisma studio

# Lint
npm run lint

# Build de produção
npm run build
```

## Estrutura do projeto

```
prisma/
  schema.prisma       modelo de dados (Admin, Service, Client, Appointment)
  migrations/         histórico de migrations
  seed.ts             cria o admin inicial a partir do .env
  dev.db              banco SQLite (gitignored)

src/
  main.ts             bootstrap: CORS, ValidationPipe global, Swagger em /api
  app.module.ts       módulo raiz
  prisma/             PrismaService compartilhado (global)
  auth/               login JWT, /me, JwtAuthGuard, @CurrentAdmin
  services/           CRUD de serviços (soft delete)
  clients/            CRUD de clientes (soft delete)
  appointments/       CRUD de agendamentos + detecção de conflito de horário
```

## Decisões de design

- **Preços em centavos** (`Int`) para evitar erros de ponto flutuante.
- **Soft delete** em `Service` e `Client` via campo `deletedAt`. Listagens filtram `deletedAt: null`.
- **Hard delete** em `Appointment` — cancelamento é feito via `PATCH status=cancelado`, o que libera o slot.
- **`endsAt` denormalizado** no `Appointment`: calculado no servidor como `scheduledAt + service.durationMinutes` e gravado. Preserva o horário combinado mesmo se a duração do serviço mudar depois.
- **Conflito de horário** assume um único profissional. Qualquer agendamento não-cancelado que se sobreponha gera `409 Conflict`. Back-to-back (um termina exatamente quando o outro começa) não conflita.
- **CORS** está permissivo (`origin: *`). Para produção, restringir em `src/main.ts`.

## Para produção

Antes de subir em qualquer ambiente real:

- Trocar `JWT_SECRET` por valor aleatório forte
- Trocar `ADMIN_PASSWORD` por uma senha real
- Restringir CORS aos domínios do front-end em `src/main.ts`
- Considerar migrar `DATABASE_URL` para Postgres ajustando o `datasource` no schema
