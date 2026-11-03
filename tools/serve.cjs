'use strict';
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {buildWeb}=require('./build-web.cjs');
const root=buildWeb();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.woff':'font/woff','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
 let file;
 try{
  const requested=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  file=path.resolve(root,'.'+requested+(requested.endsWith('/')?'index.html':''));
 }catch{res.writeHead(400);res.end('잘못된 주소입니다.');return;}
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('열 수 없는 경로입니다.');return;}
 fs.readFile(file,(error,data)=>{
  if(error){res.writeHead(404);res.end('파일을 찾을 수 없습니다.');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
 });
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'8765번 포트가 사용 중입니다. 이미 실행 중인 게임 서버를 확인해 주세요.':'게임 서버를 시작하지 못했습니다: '+error.message);process.exitCode=1;});
server.listen(8765,'127.0.0.1',()=>console.log('게임 주소: http://127.0.0.1:8765\n종료하려면 Ctrl+C를 누르세요.'));
