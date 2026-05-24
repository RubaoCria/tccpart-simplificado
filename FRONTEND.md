# Integrando o Front-End

Guia rápido para qualquer aplicação front-end (React, Vue, Angular, mobile, etc) que vá consumir esta API.

## Base URL

Desenvolvimento: `http://localhost:3000`

CORS está aberto (`origin: *`) — qualquer origem consegue acessar a API. Em produção, restringir em `src/main.ts`.

## Convenções gerais

### Autenticação

Todos os endpoints exceto `POST /auth/login` exigem o header:

```
Authorization: Bearer <access_token>
```

O token expira em **1 hora** (configurável via `JWT_EXPIRES_IN`). Quando expirar, a API devolve `401 Unauthorized` e o usuário precisa fazer login de novo. **Não há refresh token nessa versão.**

### Datas

Todas as datas trafegam como **ISO 8601 em UTC** com milissegundos:

```
"2026-06-10T14:30:00.000Z"
```

Cabe ao front converter para o fuso local do usuário ao exibir:

```js
new Date("2026-06-10T14:30:00.000Z").toLocaleString('pt-BR');
// "10/06/2026, 11:30:00"  (em São Paulo, UTC-3)
```

E converter de volta pra UTC ao enviar para a API:

```js
new Date(localDateTimeInput).toISOString();
```

### Dinheiro

Preços são gravados como **inteiros em centavos** (`priceInCents`, `chargedPriceInCents`).

```js
const formatBRL = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(cents / 100);

formatBRL(4990); // "R$ 49,90"
```

Ao enviar do front: multiplique por 100 e arredonde com `Math.round`.

### Erros

A API segue o padrão de erro do NestJS:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password should not be empty"],
  "error": "Bad Request"
}
```

O campo `message` pode ser:
- Uma `string` (erros simples como 401, 404)
- Um `array` de strings (erros de validação do DTO)

Códigos esperados:

| Código | Quando acontece |
|---|---|
| `400` | DTO inválido, ou FK referencia um serviço/cliente soft-deletado |
| `401` | Sem token, token expirado, token inválido, credenciais erradas |
| `404` | Recurso não encontrado (ou soft-deletado em services/clients) |
| `409` | Conflito de horário ao criar/atualizar agendamento |

## Fluxo de autenticação

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@salao.local",
  "password": "trocar-em-producao"
}
```

Resposta (`200 OK`):

```json
{
  "access_token": "eyJhbGciOi..."
}
```

Erros:
- `400` — payload inválido
- `401` — credenciais erradas

### Validar sessão atual

```http
GET /auth/me
Authorization: Bearer <token>
```

Resposta:

```json
{ "id": 1, "email": "admin@salao.local" }
```

Use isso ao carregar a aplicação para verificar se o token armazenado ainda é válido. Se voltar `401`, descarte o token e mande o usuário pro login.

### Exemplo em JavaScript (fetch)

```js
const API = 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await res.json();
  const { access_token } = await res.json();
  localStorage.setItem('token', access_token);
  return access_token;
}

async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    // redirecionar pro login
    throw new Error('unauthorized');
  }
  if (!res.ok) throw await res.json();
  return res.status === 204 ? null : res.json();
}
```

## Endpoints

### Serviços (`/services`)

Representam o que o salão oferece: corte, escova, coloração, etc.

**Criar:**

```http
POST /services
{
  "title": "Corte masculino",
  "description": "Corte na tesoura ou máquina",
  "imageUrl": "https://exemplo.com/corte.jpg",
  "priceInCents": 4990,
  "durationMinutes": 30
}
```

**Outros:**

```http
GET /services           # lista (filtra soft-deletados)
GET /services/:id
PATCH /services/:id     # qualquer campo opcional
DELETE /services/:id    # soft delete (204 No Content)
```

> Alterar `durationMinutes` de um serviço **não afeta** agendamentos já criados — eles mantêm o `endsAt` gravado no momento do agendamento. Apenas novos agendamentos usam a nova duração.

### Clientes (`/clients`)

```http
POST /clients
{
  "name": "Maria Silva",
  "phone": "11999998888",
  "email": "maria@exemplo.com"
}
```

```http
GET /clients
GET /clients/:id
PATCH /clients/:id
DELETE /clients/:id     # soft delete
```

### Agendamentos (`/appointments`)

**Criar:**

```http
POST /appointments
{
  "clientId": 1,
  "serviceId": 1,
  "scheduledAt": "2026-06-10T14:30:00.000Z",
  "chargedPriceInCents": 4990,
  "notes": "Cliente prefere tesoura"
}
```

Campos opcionais no POST:
- `status` — default `"agendado"`. Valores possíveis: `"agendado"`, `"concluido"`, `"cancelado"`.
- `notes` — texto livre.

A resposta inclui `endsAt` (calculado pelo backend) e os objetos `client` e `service` embarcados:

```json
{
  "id": 1,
  "clientId": 1,
  "serviceId": 1,
  "scheduledAt": "2026-06-10T14:30:00.000Z",
  "endsAt": "2026-06-10T15:00:00.000Z",
  "status": "agendado",
  "chargedPriceInCents": 4990,
  "notes": "Cliente prefere tesoura",
  "createdAt": "2026-05-24T19:00:00.000Z",
  "updatedAt": "2026-05-24T19:00:00.000Z",
  "client": {
    "id": 1,
    "name": "Maria Silva",
    "phone": "11999998888",
    "email": "maria@exemplo.com",
    "deletedAt": null
  },
  "service": {
    "id": 1,
    "title": "Corte masculino",
    "durationMinutes": 30,
    "priceInCents": 4990,
    "deletedAt": null
  }
}
```

**Filtros em `GET /appointments`:**

| Query param | Descrição |
|---|---|
| `from` | Data ISO inicial (inclusiva) |
| `to` | Data ISO final (inclusiva) |
| `clientId` | Filtra por cliente |
| `status` | `agendado` \| `concluido` \| `cancelado` |

Combinações são suportadas:

```
GET /appointments?from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.999Z&status=agendado&clientId=1
```

Resultado ordenado por `scheduledAt` ascendente.

**Cancelar:**

Não use `DELETE` para cancelar — use `PATCH`:

```http
PATCH /appointments/:id
{ "status": "cancelado" }
```

Isso libera o slot para que outro agendamento possa ocupar o mesmo horário. `DELETE` realmente apaga o registro (use só para corrigir erros de cadastro).

**Conflito de horário:**

Ao criar ou atualizar um agendamento, o backend valida sobreposição com outros não-cancelados. Em caso de conflito:

```json
{
  "statusCode": 409,
  "message": "Conflito de horário com agendamento #5 (2026-06-10T14:00:00.000Z → 2026-06-10T14:30:00.000Z)",
  "error": "Conflict"
}
```

Trate `409` na UI para mostrar mensagem amigável e oferecer outro horário.

## Padrões úteis de UI

### Agenda do dia

```js
const today = new Date();
const from = new Date(today); from.setHours(0, 0, 0, 0);
const to = new Date(today); to.setHours(23, 59, 59, 999);

const params = new URLSearchParams({
  from: from.toISOString(),
  to: to.toISOString(),
});

const appointments = await api(`/appointments?${params}`);
```

Resultado já vem ordenado por horário ascendente, pronto pra renderizar em timeline.

### Card de serviço

```jsx
<div className="service-card">
  <img src={service.imageUrl} alt={service.title} />
  <h3>{service.title}</h3>
  <p>{service.description}</p>
  <small>{service.durationMinutes} min</small>
  <strong>{formatBRL(service.priceInCents)}</strong>
</div>
```

### Detecção de conflito antes de salvar

Não existe um endpoint específico de "verificar se o slot está livre". Duas estratégias:

**1. Otimista (recomendada):** envie o `POST /appointments` direto e trate `409` mostrando o conflito ao usuário. Mais simples e menos sujeito a race conditions.

**2. Pré-check manual:** ao escolher data/serviço, faça `GET /appointments?from=...&to=...` no intervalo e calcule no front-end se há overlap.

### Listar serviços e clientes pra preencher selects

Para os formulários de agendamento, geralmente você precisa de listas completas:

```js
const [services, clients] = await Promise.all([
  api('/services'),
  api('/clients'),
]);
```

Como ambos vêm sem soft-deletados, é seguro usar direto no `<select>`.

## Limitações conhecidas

- **Sem refresh token** — token expira em 1h e força relogin.
- **Sem endpoint pra troca de senha do admin** — só editando direto no banco por enquanto.
- **Sem endpoint de "horários livres"** — o front calcula ou tenta-e-trata-409.
- **Único profissional** — sistema assume um cabeleireiro só, sem campo `professionalId`.
- **Sem paginação** — listagens devolvem tudo. Para um salão pequeno é aceitável.
- **Sem rate limit no login** — considerar adicionar em produção.
- **`@IsUrl()` em `imageUrl`** rejeita URLs sem TLD (ex: `http://localhost/img.jpg`). Use URLs públicas em dev ou edite o DTO para `@IsString()` se for servir imagens locais.
