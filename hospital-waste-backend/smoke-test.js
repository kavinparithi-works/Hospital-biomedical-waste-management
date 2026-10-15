// End-to-end API smoke test. Run against a live server: `node smoke-test.js [baseUrl]`
// Uses the default seeded credentials and exercises auth, role guards and the full waste workflow.
const BASE = process.argv[2] || 'http://localhost:5000/api';
let failures = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
}

function expect(label, cond, extra) {
  if (cond) console.log(`  PASS  ${label}`);
  else { failures++; console.log(`  FAIL  ${label}`, extra !== undefined ? JSON.stringify(extra).slice(0, 200) : ''); }
}

(async () => {
  console.log(`Smoke testing ${BASE}`);

  const health = await call('GET', '/health');
  expect('health is ok', health.status === 200 && health.data.status === 'ok', health.data);

  const unauth = await call('GET', '/waste');
  expect('unauthenticated request is rejected', unauth.status === 401, unauth.data);

  const admin = await call('POST', '/auth/login', { body: { username: 'adminname', password: 'Password123', role: 'admin' } });
  expect('admin login', admin.status === 200 && admin.data.token, admin.data);
  const staff = await call('POST', '/auth/login', { body: { username: 'staff001', password: 'Password123' } });
  expect('staff login', staff.status === 200 && staff.data.token, staff.data);
  const worker = await call('POST', '/auth/login', { body: { username: 'worker001', password: 'Password123' } });
  expect('worker login', worker.status === 200 && worker.data.token, worker.data);
  const wrongRole = await call('POST', '/auth/login', { body: { username: 'staff001', password: 'Password123', role: 'admin' } });
  expect('role mismatch rejected', wrongRole.status === 401, wrongRole.data);
  const inactive = await call('POST', '/auth/login', { body: { username: 'staff010', password: 'Password123' } });
  expect('inactive account blocked', inactive.status === 403, inactive.data);
  const badPw = await call('POST', '/auth/login', { body: { username: 'adminname', password: 'wrong' } });
  expect('wrong password rejected', badPw.status === 401, badPw.data);

  const AT = admin.data.token, ST = staff.data.token, WT = worker.data.token;
  const workerUser = worker.data.user;

  const me = await call('GET', '/auth/me', { token: WT });
  expect('GET /auth/me', me.status === 200 && me.data.user.id === workerUser.id, me.data);

  const stats = await call('GET', '/waste/stats', { token: AT });
  expect('admin stats', stats.status === 200 && typeof stats.data.complianceRate === 'number' && stats.data.binBreakdown, stats.data);

  const staffUsers = await call('GET', '/users', { token: ST });
  expect('staff cannot list all users', staffUsers.status === 403, staffUsers.data);
  const staffWorkers = await call('GET', '/users?role=worker&status=active', { token: ST });
  expect('staff can list active workers', staffWorkers.status === 200 && Array.isArray(staffWorkers.data) && staffWorkers.data.every(u => u.role === 'worker'), staffWorkers.status);
  const workerUsers = await call('GET', '/users?role=worker', { token: WT });
  expect('worker cannot list users', workerUsers.status === 403, workerUsers.data);

  const badCat = await call('POST', '/waste', { token: ST, body: { room: 'ICU', category: 'Nope', weight: 1, assignedBin: 'Red' } });
  expect('invalid category rejected', badCat.status === 400, badCat.data);

  const created = await call('POST', '/waste', {
    token: ST,
    body: { room: 'ICU Bed 2', category: 'Glassware & Metallic Implants', weight: 2.5, assignedBin: 'Blue', assignedTo: workerUser.name, assignedToUserId: workerUser.id, description: 'smoke test' }
  });
  expect('staff creates assigned record', created.status === 201 && created.data.record.status === 'Assigned' && created.data.record.createdBy === staff.data.user.name, created.data);
  const rec = created.data.record;

  const workerCreate = await call('POST', '/waste', { token: WT, body: { room: 'x', category: 'Sharps', weight: 1, assignedBin: 'White' } });
  expect('worker cannot create records', workerCreate.status === 403, workerCreate.data);

  const notifs = await call('GET', '/notifications', { token: WT });
  expect('worker receives assignment notification', notifs.status === 200 && notifs.data.notifications.some(n => n.recordId === rec.recordId && n.type === 'assignment'), notifs.data && notifs.data.unreadCount);

  const workerRecords = await call('GET', '/waste?workerId=someone-else', { token: WT });
  const mine = r => [r.assignedToUserId, r.collectedByUserId].includes(workerUser.id) || [r.assignedTo, r.collectedBy].includes(workerUser.name);
  expect('worker list is scoped to self', workerRecords.status === 200 && workerRecords.data.length > 0 && workerRecords.data.every(mine), workerRecords.data.length);

  const earlyComplete = await call('PUT', `/waste/${rec._id}/complete`, { token: WT, body: { binVerified: true } });
  expect('cannot complete before collecting', earlyComplete.status === 400, earlyComplete.data);

  const reminder = await call('POST', '/notifications/reminder', { token: ST, body: { wasteRecordId: rec._id } });
  expect('staff sends reminder', reminder.status === 200 && reminder.data.reminderCount === 1, reminder.data);
  const reminder2 = await call('POST', '/notifications/reminder', { token: ST, body: { wasteRecordId: rec._id } });
  expect('reminder cooldown enforced', reminder2.status === 429, reminder2.data);

  const collected = await call('PUT', `/waste/${rec._id}/collect`, { token: WT, body: {} });
  expect('worker collects', collected.status === 200 && collected.data.record.status === 'Collected' && collected.data.record.collectedByUserId === workerUser.id, collected.data);

  const cancelLate = await call('PUT', `/waste/${rec._id}/cancel`, { token: ST, body: { reason: 'dup' } });
  expect('cannot cancel after collection', cancelLate.status === 400, cancelLate.data);

  const completed = await call('PUT', `/waste/${rec._id}/complete`, { token: WT, body: { binVerified: false, binMismatchNote: 'wrong bag colour' } });
  expect('worker completes with mismatch', completed.status === 200 && completed.data.record.status === 'Completed' && completed.data.record.binVerified === false, completed.data);

  const history = await call('GET', `/waste/history?search=${encodeURIComponent(rec.recordId)}`, { token: WT });
  expect('worker history shows completed record', history.status === 200 && history.data.some(r => r._id === rec._id), history.data.length);

  const toCancel = await call('POST', '/waste', { token: ST, body: { room: 'Lab', category: 'Sharps', weight: 0.5, assignedBin: 'White', assignedTo: workerUser.name, assignedToUserId: workerUser.id } });
  const cancelled = await call('PUT', `/waste/${toCancel.data.record._id}/cancel`, { token: ST, body: { reason: 'Logged twice' } });
  expect('staff cancels pending record', cancelled.status === 200 && cancelled.data.record.status === 'Cancelled', cancelled.data);
  const collectCancelled = await call('PUT', `/waste/${toCancel.data.record._id}/collect`, { token: WT, body: {} });
  expect('cannot collect cancelled record', collectCancelled.status === 400, collectCancelled.data);

  const badId = await call('PUT', '/waste/not-an-id/collect', { token: WT, body: {} });
  expect('invalid ObjectId returns 400', badId.status === 400, badId.data);
  const notFound = await call('GET', '/nope', { token: WT });
  expect('unknown route returns JSON 404', notFound.status === 404 && notFound.data.message, notFound.data);

  const selfUpdate = await call('PUT', `/users/${workerUser.id}`, { token: WT, body: { phone: '9000000001', role: 'admin', isActive: false } });
  expect('worker self-update ignores privileged fields', selfUpdate.status === 200 && selfUpdate.data.user.phone === '9000000001' && selfUpdate.data.user.role === 'worker' && selfUpdate.data.user.isActive === true, selfUpdate.data);
  const otherUpdate = await call('PUT', `/users/${staff.data.user.id}`, { token: WT, body: { name: 'hacked' } });
  expect('worker cannot update others', otherUpdate.status === 403, otherUpdate.data);

  const pwWrong = await call('POST', '/auth/change-password', { token: WT, body: { currentPassword: 'nope', newPassword: 'abcdef' } });
  expect('change-password rejects wrong current', pwWrong.status === 401, pwWrong.data);

  const newUser = await call('POST', '/users', { token: AT, body: { name: 'Smoke Test Nurse', email: 'smoke.nurse@hospital.com', password: 'Smoke123', phone: '9123456789', role: 'staff', department: 'ICU' } });
  expect('admin creates user', newUser.status === 201, newUser.data);
  const dup = await call('POST', '/users', { token: AT, body: { name: 'Dup', email: 'smoke.nurse@hospital.com', password: 'Smoke123', role: 'staff' } });
  expect('duplicate email rejected', dup.status === 400, dup.data);
  if (newUser.data.user) {
    const toggled = await call('PATCH', `/users/${newUser.data.user.id}/toggle-active`, { token: AT });
    expect('admin toggles user', toggled.status === 200 && toggled.data.isActive === false, toggled.data);
    const del = await call('DELETE', `/users/${newUser.data.user.id}`, { token: AT });
    expect('admin deletes user', del.status === 200, del.data);
  }
  const delAdmin = await call('DELETE', `/users/${admin.data.user.id}`, { token: AT });
  expect('admin account cannot be deleted', delAdmin.status === 400, delAdmin.data);

  const delRec = await call('DELETE', `/waste/${toCancel.data.record._id}`, { token: AT });
  expect('admin deletes record', delRec.status === 200, delRec.data);

  const aiStatus = await call('GET', '/ai/status', { token: ST });
  expect('AI status reports configuration', aiStatus.status === 200 && typeof aiStatus.data.configured === 'boolean', aiStatus.data);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const form = new FormData();
  form.append('image', new Blob([png], { type: 'image/png' }), 'test.png');
  const classify = await fetch(BASE + '/ai/classify-image', { method: 'POST', headers: { Authorization: `Bearer ${ST}` }, body: form });
  const classifyData = await classify.json().catch(() => null);
  if (aiStatus.data.configured) {
    expect('classify-image returns structured result', classify.status === 200 && Array.isArray(classifyData.items) && typeof classifyData.uncertain === 'boolean', classifyData);
  } else {
    expect('classify-image explains missing API key (no fake answer)', classify.status === 503 && classifyData.error === 'MISSING_API_KEY', classifyData);
  }
  const badUpload = await fetch(BASE + '/ai/classify-image', { method: 'POST', headers: { Authorization: `Bearer ${ST}`, 'Content-Type': 'application/json' }, body: '{}' });
  expect('classify-image without image rejected', [400, 503].includes(badUpload.status), badUpload.status);

  console.log(failures === 0 ? '\nAll smoke tests passed.' : `\n${failures} smoke test(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(err => { console.error('Smoke test crashed:', err); process.exit(1); });
