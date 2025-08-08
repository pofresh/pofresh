const m = Buffer.from('hello');
const p = JSON.stringify(m);
const q = JSON.parse(p);
const _buf = Buffer.from(q.data);
