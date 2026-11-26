const languages=['en','gu','hi'];
function cleanText(value,label,max){
 if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new Error(`${label} is required and must contain at most ${max} characters.`);
 return value.trim();
}
function secureUrl(value,label,optional=false){
 if(optional&&(value==null||value===''))return '';
 const text=cleanText(value,label,2048);
 let url;try{url=new URL(text);}catch{throw new Error(`${label} must be a valid HTTPS address.`);}
 if(url.protocol!=='https:'||url.username||url.password)throw new Error(`${label} must be a valid HTTPS address without login credentials.`);
 return url.href;
}
function validateGuide(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Guide data is required.');
 const id=cleanText(input.id,'Guide ID',80);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))throw new Error('Guide ID must use lowercase letters, numbers and single hyphens.');
 const icon=typeof input.icon==='string'&&/^[a-z_]{1,60}$/.test(input.icon)?input.icon:'menu_book';
 const output={id,icon,source:secureUrl(input.source,'Reference source'),image:secureUrl(input.image,'Cover image',true),category:{},content:{}};
 for(const lang of languages){
  const c=input.content?.[lang],category=input.category?.[lang];
  if(lang!=='en'&&!c&&!category)continue;
  if(!c||typeof c!=='object'||Array.isArray(c))throw new Error(`${lang.toUpperCase()} content is required.`);
  output.category[lang]=cleanText(category,`${lang.toUpperCase()} category`,100);
  const normalized={title:cleanText(c.title,`${lang.toUpperCase()} title`,200),summary:cleanText(c.summary,`${lang.toUpperCase()} summary`,1500)};
  for(const field of ['warnings','actions']){
   if(!Array.isArray(c[field])||c[field].length<1||c[field].length>15)throw new Error(`${lang.toUpperCase()} ${field} must contain 1 to 15 items.`);
   normalized[field]=c[field].map(value=>cleanText(value,`${lang.toUpperCase()} ${field} item`,500));
  }
  output.content[lang]=normalized;
 }
 return output;
}
module.exports={validateGuide};
