import { vi, expect, test, beforeEach } from 'vitest';
process.env.VITE_API_URL = 'http://localhost';
let svc: typeof import('../src/services/roadmap');

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.VITE_API_URL = 'http://localhost';
});

test('run full service flow', async () => {
  svc = await import('../src/services/roadmap');
  const responses = [
    new Response('pong', { status: 200 }),
    new Response(JSON.stringify({ token: 't1', user: { id: 1, email: 'u@test.com' } }), { status: 201, headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify({ token: 't2', user: { id: 1, email: 'u@test.com' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify({ id: 1, name: 'u', email: 'u@test.com', email_verified_at: null, created_at: '2024-01-01', updated_at: '2024-01-01' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify({ message: 'authenticated pong' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify({ column: { id: 10, year: 2025, month: 6, user_id: 1, created_at: '2024-01-01', updated_at: '2024-01-01' }, cards: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify({ column_id: 10, order: 1, title: 'test card', status: 'not_started', created_at: '2024-01-01', updated_at: '2024-01-01', id: 20 }), { status: 201, headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify({ id: 20, column_id: 10, order: 1, title: 'test card', status: 'not_started', created_at: '2024-01-01', updated_at: '2024-01-01', column: { id: 10, year: 2025, month: 6, user_id: 1, created_at: '2024-01-01', updated_at: '2024-01-01' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify({ id: 20, column_id: 10, order: 1, title: 'updated test card', status: 'not_started', created_at: '2024-01-01', updated_at: '2024-01-02' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify({ id: 20, column_id: 10, order: 1, title: 'updated test card', status: 'completed', created_at: '2024-01-01', updated_at: '2024-01-03' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    new Response(JSON.stringify({ id: 20, column_id: 11, order: 1, title: 'updated test card', status: 'completed', created_at: '2024-01-01', updated_at: '2024-01-04', column: { id: 11, year: 2025, month: 7, user_id: 1, created_at: '2024-01-01', updated_at: '2024-01-04' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    new Response(null, { status: 204 }),
    new Response(JSON.stringify({ message: 'Logged out' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ];

  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(responses.shift()!));
  
  global.fetch = fetchMock;

  expect(await svc.ping()).toBe('pong');
  const reg = await svc.register({ name: 'u', email: 'u@test.com', password: 'x' });
  expect(reg.token).toBe('t1');
  const log = await svc.login({ email: reg.user.email, password: 'x' });
  expect(log.token).toBe('t2');
  const usr = await svc.getUser(log.token);
  expect(usr.email).toBe('u@test.com');
  const pa = await svc.pingAuth(log.token);
  expect(pa.message).toBe('authenticated pong');
  const cardsRes = await svc.getCards(2025, 6, log.token);
  expect(cardsRes.column.id).toBe(10);
  const created = await svc.createCard({ column_id: 10, order: 1, title: 'test card' }, log.token);
  expect(created.id).toBe(20);
  const show = await svc.showCard(created.id, log.token);
  expect(show.column_id).toBe(10);
  const updTitle = await svc.updateCardTitle(created.id, 'updated test card', log.token);
  expect(updTitle.title).toBe('updated test card');
  const updStatus = await svc.updateCardStatus(created.id, 'completed', log.token);
  expect(updStatus.status).toBe('completed');
  const updPos = await svc.updateCardPosition(created.id, { year: 2025, month: 7, order: 1 }, log.token);
  expect(updPos.column!.month).toBe(7);
  await svc.deleteCard(created.id, log.token);
  const out = await svc.logout(log.token);
  expect(out.message).toBe('Logged out');

  expect(fetchMock).toHaveBeenCalledTimes(13);
});
