const fs=require('node:fs');
const path=require('node:path');
const pool=require('../config/db');
(async()=>{const client=await pool.connect();try{await client.query('BEGIN');await client.query(fs.readFileSync(path.join(__dirname,'../database/email-workflows.sql'),'utf8'));await client.query('COMMIT');console.log('Email workflow migration applied. No emails sent.');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}})().catch(()=>{console.error('Email migration failed. Check database connectivity and run the base schema first.');process.exitCode=1;});
