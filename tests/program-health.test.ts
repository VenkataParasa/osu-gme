import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { data } from '../src/data/repository';

Object.assign(data, JSON.parse(readFileSync(
  new URL('../public/data/gme-demo-v2.json', import.meta.url), 'utf8',
)));
const {programHealthSnapshot,institutionalHealth,attentionItems,growthRows,healthComparison} = await import('../src/data/program-health-selectors');
const {addGrowthUpdate,saveGrowthOpportunity,extensionState} = await import('../src/data/extension-store');
const {facultyWorkforceRows} = await import('../src/data/faculty-workforce');

test('Program Health aggregates source-linked indicators without a composite score',()=>{
 const snapshot=programHealthSnapshot('USR-004','PRG-004','2025-26');
 assert.equal(snapshot.statuses.length,6);
 assert.ok(snapshot.indicators.some(i=>i.label==='Special Review'&&i.sourcePath==='reviews/SRV-001'));
 assert.ok(snapshot.indicators.some(i=>i.label==='Duty-hour compliance'&&i.source==='New Innovations'));
 assert.ok(snapshot.attention.some(i=>i.domain==='Accreditation'));
 assert.equal(snapshot.indicators.some(i=>i.label==='Health Score'),false);
 assert.ok(institutionalHealth('USR-006').every(s=>s.program?.program_id==='PRG-001'));
 assert.ok(attentionItems('USR-004').every(i=>i.sourcePath));
 assert.equal(facultyWorkforceRows('USR-004',{program:'PRG-001',year:'2019-20'})[0]?.aggregate.program_director_tenure_years,3);
});
test('growth records are role-scoped and preserve update history',()=>{
 const before=extensionState.growthUpdates.length;
 assert.throws(()=>saveGrowthOpportunity({programId:'PRG-004',title:'Blocked',category:'Other',description:'x',status:'Identified',identifiedDate:'2026-09-24',targetDate:null,ownerLabel:'PD',source:'Demo',notes:''},'USR-006'),/cannot edit/);
 const record=saveGrowthOpportunity({programId:'PRG-004',title:'New capacity review',category:'Training Capacity',description:'Review capacity.',status:'Identified',identifiedDate:'2026-09-24',targetDate:null,ownerLabel:'PD',source:'Internal GME · Demo',notes:''},'USR-004');
 addGrowthUpdate(record.id,'Planning discussion scheduled.','USR-004','Under Review');
 assert.equal(extensionState.growth.find(g=>g.id===record.id)?.status,'Under Review');
 assert.equal(extensionState.growthUpdates.length,before+1);
 assert.equal(growthRows('USR-006').every(g=>g.programId==='PRG-001'),true);
 assert.equal(healthComparison('USR-004',['PRG-001','PRG-004']).length,2);
});
