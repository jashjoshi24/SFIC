// Run hourly with your deployment scheduler. Never runs as part of preview/build/test.
require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const pool = require('../config/db');
const {workflows} = require('../services/emailWorkflows');
async function main() {
  try {
    const jobs=workflows(); await jobs.schedule();
    console.log('Email worker:', await jobs.deliver(100));
  } finally {await pool.end();}
}
main().catch(()=>{console.error('Email worker failed. Check database connectivity and migration.');process.exitCode=1;});
