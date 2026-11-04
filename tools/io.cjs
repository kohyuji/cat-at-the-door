'use strict';
const fs=require('node:fs');
// Dropbox/Windows의 짧은 공유 잠금에만 제한적으로 재시도한다.
function retry(fn){for(let n=0;;n++){try{return fn();}catch(e){if(!['EBUSY','EPERM','EACCES'].includes(e.code)||n>=15)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}}}
function write(file,data){const buffer=Buffer.isBuffer(data)?data:Buffer.from(data);let same=false;try{same=fs.readFileSync(file).equals(buffer);}catch(e){if(e.code!=='ENOENT')throw e;}if(!same)retry(()=>fs.writeFileSync(file,buffer));}
function copy(from,to){write(to,fs.readFileSync(from));}
module.exports={write,copy,retry};
