const fs=require('fs');
const path=require('path');
const pool=require('../config/db');
(async()=>{
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query(fs.readFileSync(path.join(__dirname,'../database/awareness.sql'),'utf8'));
  const guides=JSON.parse(fs.readFileSync(path.join(__dirname,'../database/awareness-seed.json'),'utf8'));
  for(const guide of guides)await client.query('INSERT INTO awareness_guides(id,data) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[guide.id,JSON.stringify(guide)]);
  await client.query('COMMIT');
  console.log('Awareness storage ready. Existing guides, edits and deletions preserved.');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());
