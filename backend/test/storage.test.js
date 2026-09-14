const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const Module = require('node:module');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fixnow-test-'));
process.env.DATA_DIR = directory;
process.env.DATABASE_URL = '';

function postgresFixture() {
  const state = {revision: 0, records: {}, failInsert: false};
  let rollbackCount = 0;
  class Pool {
    on() {}
    async end() {}
    async connect() {
      let backup;
      return {
        release() {},
        async query(sql, args) {
          if (sql.startsWith('BEGIN')) {backup = structuredClone(state); return {rows: []};}
          if (sql === 'COMMIT') return {rows: []};
          if (sql === 'ROLLBACK') {Object.assign(state, backup); rollbackCount++; return {rows: []};}
          if (sql.startsWith('SELECT revision')) return {rows: [{revision: state.revision}], rowCount: 1};
          if (sql.startsWith('SELECT data')) {const table = sql.match(/public\.(\w+)/)[1];return {rows: Object.values(state.records[table] || {}).sort((a,b)=>a.position-b.position).map(r=>({data:structuredClone(r.data)}))};}
          if (sql.startsWith('UPDATE fixnow_private')) {
            if (args[0] !== state.revision) return {rows: [],rowCount: 0};
            return {rows: [{revision: ++state.revision}],rowCount: 1};
          }
          if (sql.startsWith('INSERT INTO public.')) {
            if (state.failInsert) throw new Error('simulated database failure');
            const table=sql.match(/public\.(\w+)/)[1];
            state.records[table] ||= {};
            state.records[table][args[0]]={data:JSON.parse(args[1]),position:args[2]};
            return {rows: [], rowCount: 1};
          }
          if (sql.startsWith('DELETE FROM public.')) {delete state.records[sql.match(/public\.(\w+)/)[1]][args[0]];return {rows:[],rowCount:1};}
          throw new Error('Unexpected SQL in test');
        }
      };
    }
  }
  const filename = path.resolve(__dirname, '../src/data/database.js');
  const localRequire = Module.createRequire(filename);
  const module = {exports:{}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{
    module, require: name => name === 'pg' ? {Pool} : localRequire(name),
    __dirname:path.dirname(filename), URL, console,
    process:{env:{DATABASE_URL:'postgresql://postgres:test@localhost:5432/test'}}
  });
  return {db:module.exports,state,rollbacks:()=>rollbackCount};
}

(async()=>{
  const db = require('../src/data/database');
  await db.initializeDatabase();
  const first=await db.readDb(), stale=await db.readDb();
  first.accounts.push({id:'test-account'});
  await db.writeDb(first);
  stale.accounts.push({id:'stale-account'});
  await assert.rejects(db.writeDb(stale), e=>e.status===409);
  assert.equal((await db.readDb()).accounts.length,1);
  console.log('PASS: local persistence and stale-write protection');

  const fixture=postgresFixture();
  const pg=fixture.db;
  const a=await pg.readDb(), b=await pg.readDb();
  a.accounts.push({id:'a',profile:{email:'test@example.invalid'}});
  await pg.writeDb(a);
  b.accounts.push({id:'b'});
  await assert.rejects(pg.writeDb(b), e=>e.status===409);
  assert.equal((await pg.readDb()).accounts[0].id,'a');
  const failing=await pg.readDb();failing.payments.push({id:'payment'});
  const oldRevision=fixture.state.revision;
  fixture.state.failInsert=true;
  await assert.rejects(pg.writeDb(failing), /simulated/);
  assert.equal(fixture.state.revision,oldRevision);
  assert.equal((await pg.readDb()).payments.length,0);
  assert.equal(fixture.rollbacks(),2);
  console.log('PASS: PostgreSQL stale writes and atomic rollback');

  const prior=db.writeDb, failure=new Error('storage unavailable');
  db.writeDb=async()=>{throw failure;};
  const {createServiceRequest}=require('../src/controllers/requestController');
  let caught;
  await createServiceRequest({body:{issue:'test'}},{status(){assert.fail('success before persistence');},json(){assert.fail('success before persistence');}}, error=>{caught=error;});
  assert.equal(caught,failure);db.writeDb=prior;
  console.log('PASS: API awaits persistence and forwards failures');

  process.env.DATABASE_URL='postgresql://postgres:YOUR-PASSWORD@localhost/test';
  await assert.rejects(db.initializeDatabase(),/password placeholder/);
  console.log('PASS: configured database failure cannot fall back to JSON');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>fs.rmSync(directory,{recursive:true,force:true}));
