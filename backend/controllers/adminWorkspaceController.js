const pool = require('../config/db');

async function getCitizens(req, res) {
  const {search = '', page = '1'} = req.query;
  if (typeof search !== 'string' || search.length > 200 || !/^[1-9]\d{0,5}$/.test(String(page))) {
    return res.status(400).json({success:false,message:'Use a valid page and a search of up to 200 characters.'});
  }
  const currentPage=Number(page), limit=20;
  const values=[`%${search.trim()}%`, search.trim()];
  const where='WHERE (u.name ILIKE $1 OR u.email ILIKE $1 OR u.id::text = $2)';
  try {
    const total=await pool.query(`SELECT COUNT(*) AS count FROM users u ${where}`,values);
    const result=await pool.query(`SELECT u.id,u.name,u.email,u.created_at,
      (SELECT COUNT(*) FROM scan_history s WHERE s.user_id=u.id) AS scan_count,
      (SELECT COUNT(*) FROM complaint_drafts c WHERE c.user_id=u.id) AS complaint_count
      FROM users u ${where} ORDER BY u.created_at DESC,u.id DESC LIMIT $3 OFFSET $4`,[...values,limit,(currentPage-1)*limit]);
    const count=Number(total.rows[0].count);
    return res.json({success:true,citizens:result.rows,pagination:{page:currentPage,limit,total:count,total_pages:Math.ceil(count/limit)}});
  } catch(error) {
    console.error('Admin citizen directory error:',error.message);
    return res.status(500).json({success:false,message:'Unable to load the citizen directory.'});
  }
}

async function getActivityReport(req,res) {
  const raw=req.query.days ?? '30';
  if (typeof raw !== 'string' || !['7','30','90'].includes(raw)) return res.status(400).json({success:false,message:'Choose a reporting period of 7, 30 or 90 days.'});
  const days=Number(raw);
  const day="(NOW() AT TIME ZONE 'Asia/Kolkata')::date";
  const start=`((${day} - ($1::int - 1))::timestamp AT TIME ZONE 'Asia/Kolkata')`;
  const end=`((${day} + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')`;
  try {
    const [daily,risks]=await Promise.all([
      pool.query(`WITH dates AS (
        SELECT generate_series(${day} - ($1::int - 1),${day},'1 day'::interval)::date AS day
      ), scans AS (
        SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS day,COUNT(*) AS scans,
          COUNT(*) FILTER(WHERE LOWER(risk_level)='high') AS high_risk,
          COUNT(*) FILTER(WHERE scan_type='message') AS messages,
          COUNT(*) FILTER(WHERE scan_type='url') AS urls,
          COUNT(*) FILTER(WHERE scan_type='image') AS images
        FROM scan_history WHERE created_at >= ${start} AND created_at < ${end} GROUP BY 1
      ), complaints AS (
        SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS day,COUNT(*) AS complaints
        FROM complaint_drafts WHERE created_at >= ${start} AND created_at < ${end} GROUP BY 1
      ), citizens AS (
        SELECT (created_at AT TIME ZONE 'Asia/Kolkata')::date AS day,COUNT(*) AS registrations
        FROM users WHERE created_at >= ${start} AND created_at < ${end} GROUP BY 1
      ) SELECT to_char(d.day,'YYYY-MM-DD') AS date,COALESCE(s.scans,0) AS scans,
        COALESCE(s.high_risk,0) AS high_risk,COALESCE(s.messages,0) AS messages,
        COALESCE(s.urls,0) AS urls,COALESCE(s.images,0) AS images,
        COALESCE(c.complaints,0) AS complaints,COALESCE(u.registrations,0) AS registrations
      FROM dates d LEFT JOIN scans s USING(day) LEFT JOIN complaints c USING(day) LEFT JOIN citizens u USING(day)
      ORDER BY d.day DESC`,[days]),
      pool.query(`SELECT LOWER(risk_level) AS level,COUNT(*) AS count FROM scan_history
        WHERE created_at >= ${start} AND created_at < ${end} GROUP BY LOWER(risk_level) ORDER BY count DESC`,[days])
    ]);
    const totals={scans:0,high_risk:0,messages:0,urls:0,images:0,complaints:0,registrations:0};
    for(const row of daily.rows) for(const key of Object.keys(totals)) totals[key]+=Number(row[key]);
    return res.json({success:true,days,timezone:'Asia/Kolkata',totals,daily:daily.rows,risks:risks.rows});
  }catch(error){
    console.error('Admin activity report error:',error.message);
    return res.status(500).json({success:false,message:'Unable to load the activity report.'});
  }
}
module.exports={getCitizens,getActivityReport};
