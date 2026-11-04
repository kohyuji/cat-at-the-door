'use strict';
// 승인된 배포 뒤 Pages와 공개 파일만 읽는다. 브라우저·오디오를 열지 않는다.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),base='https://kohyuji.github.io/cat-at-the-door/codex-v5/';
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never',GIT_TRACE:'0',GIT_TRACE_CURL:'0',GIT_CURL_VERBOSE:'0'};
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function git(args,input){const r=spawnSync('git',args,{cwd:root,env,encoding:'utf8',input});if(r.status!==0)throw new Error('Git 확인에 실패했습니다.');return r.stdout.trim();}
async function verify(){
 const deployment=JSON.parse(fs.readFileSync(path.join(root,'.preview/latest-deployment.json'),'utf8'));
 const source=git(['rev-parse','HEAD']);assert.equal(deployment.source_commit,source,'현재 소스와 배포 기록이 다릅니다.');
 const credential=git(['credential','fill'],'protocol=https\nhost=github.com\nusername=kohyuji\n\n');
 const token=credential.split(/\r?\n/).find(line=>line.startsWith('password='))?.slice(9);assert.ok(token,'Git Credential Manager 인증이 필요합니다.');
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'cat-at-the-door-verify'};
 let build;
 for(let attempt=0;attempt<9;attempt++){
  const r=await fetch('https://api.github.com/repos/kohyuji/cat-at-the-door/pages/builds/latest',{headers,signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,'Pages 빌드 API');build=await r.json();
  if(build.status==='built'&&build.commit===deployment.deployment_commit)break;
  if(build.status==='errored'&&build.commit===deployment.deployment_commit)throw new Error('Pages 빌드 실패: '+JSON.stringify(build.error));
  if(attempt===8)throw new Error('Pages 반영 대기 제한 시간을 넘었습니다. 마지막 상태: '+build.status);
  if(attempt===0)console.log('Pages 빌드 완료를 기다리는 중');await new Promise(resolve=>setTimeout(resolve,45000));
 }
 const r=await fetch(base+'__build.json?verify='+source,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,'공개 빌드 기록');const metadata=await r.json();assert.equal(metadata.source_commit,source,'공개 소스 SHA가 다릅니다.');
 const {availableImages,availableManifests}=require('./assets.cjs');
 const required=['index.html','src/life.css','src/life-state.js','src/life-story.js','src/pixel-render.js','src/life-view.js','src/life-game.js',...Object.values(availableImages()),...availableManifests(),'assets/fonts/NeoDunggeunmoPro-Regular.woff2'];
 const checks=await Promise.all(required.map(async file=>{
  const response=await fetch(base+file+'?verify='+source,{signal:AbortSignal.timeout(60000)});assert.equal(response.status,200,file);
  let web=Buffer.from(await response.arrayBuffer()),local=fs.readFileSync(path.join(root,'dist',file));
  if(/\.(html|js|css|json)$/.test(file)){web=Buffer.from(web.toString().replace(/\r\n/g,'\n'));local=Buffer.from(local.toString().replace(/\r\n/g,'\n'));}
  const hash=digest(web);assert.equal(hash,digest(local),file+' 공개 내용 불일치');return{file,status:response.status,bytes:web.length,sha256:hash};
 }));
 const offline=await fetch(base+'downloads/Cat-at-the-Door.html?verify='+source,{method:'HEAD',signal:AbortSignal.timeout(30000)});assert.equal(offline.status,200,'오프라인 다운로드');
 const report={status:'공개 검증 완료',source_commit:source,deployment_commit:deployment.deployment_commit,base_pages_commit:deployment.base_pages_commit,pages_status:build.status,pages_commit:build.commit,other_paths_changed:deployment.other_paths_changed,preserved_files:deployment.preserved_files,url:base,checks,offline_status:offline.status,checked_at:new Date().toISOString()};
 fs.writeFileSync(path.join(root,'.preview/r5-public-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
verify().catch(error=>{console.error(error.message);process.exitCode=1;});
