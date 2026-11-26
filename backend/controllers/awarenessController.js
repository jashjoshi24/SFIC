const pool=require('../config/db');
const {validateGuide}=require('../utils/awarenessGuide');
const validId=id=>typeof id==='string'&&id.length<=80&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
const version=value=>Number.isSafeInteger(value)&&value>0;
function failure(res,error){console.error('Awareness error:',error.message);return res.status(500).json({success:false,message:'Unable to process the awareness library request.'});}
async function publicGuides(req,res){
 try{const result=await pool.query('SELECT data FROM awareness_guides WHERE deleted_at IS NULL ORDER BY created_at,id');res.set('Cache-Control','no-store');return res.json({success:true,guides:result.rows.map(row=>row.data)});}catch(e){return failure(res,e);}
}
async function adminGuides(req,res){
 try{const result=await pool.query('SELECT data,version,updated_at,deleted_at FROM awareness_guides ORDER BY created_at,id');res.set('Cache-Control','no-store');return res.json({success:true,guides:result.rows.map(row=>({...row.data,version:row.version,updated_at:row.updated_at,deleted_at:row.deleted_at}))});}catch(e){return failure(res,e);}
}
async function createGuide(req,res){
 let guide;try{guide=validateGuide(req.body);}catch(e){return res.status(400).json({success:false,message:e.message});}
 try{const result=await pool.query('INSERT INTO awareness_guides(id,data,updated_by) VALUES($1,$2,$3) RETURNING data,version,updated_at',[guide.id,JSON.stringify(guide),req.admin.id]);return res.status(201).json({success:true,guide:{...result.rows[0].data,version:result.rows[0].version,updated_at:result.rows[0].updated_at}});}catch(e){if(e.code==='23505')return res.status(409).json({success:false,message:'This guide ID already exists. Choose another ID or restore its deleted guide.'});return failure(res,e);}
}
async function updateGuide(req,res){
 if(!validId(req.params.id)||!version(req.body?.version))return res.status(400).json({success:false,message:'A valid guide ID and version are required.'});
 let guide;try{guide=validateGuide({...req.body,id:req.params.id});}catch(e){return res.status(400).json({success:false,message:e.message});}
 try{const result=await pool.query('UPDATE awareness_guides SET data=$1,version=version+1,updated_at=NOW(),updated_by=$2 WHERE id=$3 AND version=$4 AND deleted_at IS NULL RETURNING data,version,updated_at',[JSON.stringify(guide),req.admin.id,req.params.id,req.body.version]);if(!result.rows.length)return res.status(409).json({success:false,message:'This guide changed or was deleted. Close the editor, refresh the library and try again.'});return res.json({success:true,guide:{...result.rows[0].data,version:result.rows[0].version,updated_at:result.rows[0].updated_at}});}catch(e){return failure(res,e);}
}
async function setDeleted(req,res,restore){
 if(!validId(req.params.id)||!version(req.body?.version))return res.status(400).json({success:false,message:'A valid guide ID and version are required.'});
 try{const result=await pool.query(`UPDATE awareness_guides SET deleted_at=${restore?'NULL':'NOW()'},version=version+1,updated_at=NOW(),updated_by=$1 WHERE id=$2 AND version=$3 AND deleted_at IS ${restore?'NOT NULL':'NULL'} RETURNING id`,[req.admin.id,req.params.id,req.body.version]);if(!result.rows.length)return res.status(409).json({success:false,message:'This guide changed. Refresh the library and try again.'});return res.json({success:true,id:result.rows[0].id});}catch(e){return failure(res,e);}
}
module.exports={publicGuides,adminGuides,createGuide,updateGuide,deleteGuide:(req,res)=>setDeleted(req,res,false),restoreGuide:(req,res)=>setDeleted(req,res,true)};
