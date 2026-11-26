const fs = require('node:fs');
const path = require('node:path');
const {renderEmail} = require('../services/emailService');
const {TYPES} = require('../services/emailTemplates');
const destination = path.resolve(__dirname, '../../.local-logs/emails');
fs.mkdirSync(destination, {recursive: true});
for (const type of TYPES) {
    const message = renderEmail(type, {name: type.startsWith('admin_') ? 'Review team' : 'Jaymin', complaintId: 42, ticketId: 108, status: 'Under Review', pendingCount: 12, reviewCount: 4});
    fs.writeFileSync(path.join(destination, `${type}.html`), message.html);
    fs.writeFileSync(path.join(destination, `${type}.txt`), message.text);
}
fs.writeFileSync(path.join(destination, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Surakshit Gujarat · Email collection</title><style>body{margin:0;background:#211b17;color:#fff2df;font-family:Arial,sans-serif;padding:40px 24px}h1{font:normal 48px Georgia,serif;margin:16px 0}p{color:#cbb8a1;line-height:1.7}small{color:#ffb17c;letter-spacing:2px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,350px),1fr));gap:24px;margin-top:40px}iframe{width:100%;height:860px;border:0;background:#eee9e1;border-radius:12px}a{color:#ffbb8c}h2{font-size:15px;text-transform:capitalize}</style><small>SURAKSHIT GUJARAT / EMAIL DESIGN COLLECTION</small><h1>A thoughtful inbox.</h1><p>Nine responsive templates. Gujarati introductions. Plain-text alternatives.<br>Preview only — no emails are sent by this page.</p><div class="grid">${TYPES.map(type=>`<section><h2>${type.replaceAll('_',' ')}</h2><p><a href="${type}.html">Open full email ↗</a> · <a href="${type}.txt">Plain text</a></p><iframe title="${type.replaceAll('_',' ')} preview" src="${type}.html"></iframe></section>`).join('')}</div></html>`);
console.log(`Created ${TYPES.length} email previews and index.html in ${destination}. No messages sent.`);
