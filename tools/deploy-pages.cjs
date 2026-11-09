'use strict';

// main(v6)을 빌드해 gh-pages의 루트(대표 주소)에 올린다.
// 다른 판이 쓰는 폴더(claude-v5/, codex-v5/, codex-v5-claude/, v4.1/)는 그대로 둔다.
// 루트에 v4.1이 있고 v4.1/ 폴더가 아직 없으면, 처음 한 번 그 파일들을 v4.1/로 옮긴다.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const liveUrl = 'https://kohyuji.github.io/cat-at-the-door/';
const repository = 'kohyuji/cat-at-the-door';
const sourceBranch = 'main';
const keep = ['claude-v5', 'codex-v5', 'codex-v5-claude', 'v4.1']; // 손대지 않는 폴더
const archive = 'v4.1'; // 예전 루트(v4.1)를 옮겨 두는 폴더
const publishBranch = 'gh-pages';
const kept = file => file === '.nojekyll' || keep.some(dir => file.startsWith(dir + '/'));
const prepareOnly = process.argv.includes('--prepare-only');
const gitEnv = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GCM_INTERACTIVE: 'never',
  GIT_TRACE: '0',
  GIT_TRACE_CURL: '0',
  GIT_CURL_VERBOSE: '0',
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root, encoding: 'utf8', env: gitEnv, ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(options.privateError || `${command} 실행 실패: ${(result.stderr || result.error?.message || '').trim()}`);
  }
  return result.stdout.trim();
}

function git(args, options = {}) { return run('git', args, options); }
function inside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function removeStaging(base, staging) {
  const expectedBase = path.resolve(os.tmpdir(), 'cat-at-the-door-pages');
  if (path.resolve(base) !== expectedBase || !inside(base, staging)) throw new Error('임시 배포 폴더 경로를 확인할 수 없습니다.');
  fs.rmSync(staging, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function readGitHubCredential() {
  // 정상 Git 인증만 사용한다. 토큰은 메모리에서 API 호출에만 쓰고 출력·저장하지 않는다.
  const output = run('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\nusername=kohyuji\n\n',
    privateError: 'GitHub 로그인 정보를 사용할 수 없습니다. Git Credential Manager에서 먼저 로그인해 주세요.',
  });
  const password = output.split(/\r?\n/).find(line => line.startsWith('password='))?.slice(9);
  if (!password) throw new Error('사용 가능한 GitHub 로그인 정보가 없습니다.');
  return password;
}

async function configurePages() {
  const token = readGitHubCredential();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'cat-at-the-door-deploy',
    'Content-Type': 'application/json',
  };
  async function api(method, body, subpath = '') {
    const response = await fetch(`https://api.github.com/repos/${repository}/pages${subpath}`, {
      method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    });
    const content = await response.text();
    let result = {};
    try { result = content ? JSON.parse(content) : {}; } catch {}
    return { status: response.status, ok: response.ok, result };
  }
  const current = await api('GET');
  if (!current.ok && current.status !== 404) {
    throw new Error(`GitHub Pages 설정 조회 실패 (${current.status}): ${current.result.message || '권한 또는 연결을 확인해 주세요.'}`);
  }
  const correctSource = current.ok && current.result.build_type === 'legacy' &&
    current.result.source?.branch === publishBranch && current.result.source?.path === '/';
  if (correctSource) return; // 기존 gh-pages 소스의 푸시가 Pages 빌드를 시작한다.
  if (!correctSource) {
    // 도메인·HTTPS 등 기존 설정은 보내지 않아 그대로 유지한다.
    const updated = await api(current.status === 404 ? 'POST' : 'PUT', {
      build_type: 'legacy', source: { branch: publishBranch, path: '/' },
    });
    if (!updated.ok) {
      throw new Error(`GitHub Pages 설정 변경 실패 (${updated.status}): ${updated.result.message || '저장소 관리 권한을 확인해 주세요.'}`);
    }
  }
  // 처음 소스 브랜치를 바꿀 때 푸시가 먼저 끝나므로 빌드를 명시적으로 요청한다.
  const requested = await api('POST', null, '/builds');
  if (!requested.ok) {
    if (requested.status === 409) {
      const latest = await api('GET', null, '/builds/latest');
      if (latest.ok && ['queued', 'building'].includes(latest.result.status)) return;
    }
    throw new Error(`GitHub Pages 빌드 요청 실패 (${requested.status}): ${requested.result.message || 'Pages 빌드 상태를 확인해 주세요.'}`);
  }
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('사용법: node tools/deploy-pages.cjs [--prepare-only]\n기본: main을 빌드해 gh-pages 루트에 배포 (다른 판 폴더는 보존)\n--prepare-only: 로컬에서 배포 묶음만 검증 (네트워크·푸시·설정 변경 없음)');
    return;
  }
  const unknown = process.argv.slice(2).filter(value => value !== '--prepare-only');
  if (unknown.length) throw new Error(`알 수 없는 옵션: ${unknown.join(', ')}`);
  const remote = git(['remote', 'get-url', 'origin']);
  if (!/^https:\/\/github\.com\/kohyuji\/cat-at-the-door(?:\.git)?\/?$/.test(remote)) {
    throw new Error('origin이 kohyuji/cat-at-the-door 저장소가 아니므로 배포를 중단합니다.');
  }
  if (!prepareOnly && git(['status', '--porcelain', '--untracked-files=normal'])) {
    throw new Error(`변경 파일을 먼저 커밋하고 ${sourceBranch}에 올린 뒤 배포해 주세요.`);
  }
  run(process.execPath, [path.join(__dirname, 'build-web.cjs')]);
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('빌드 결과 dist/index.html이 없습니다.');

  if (!prepareOnly) {
    git(['fetch', 'origin', `+refs/heads/${sourceBranch}:refs/remotes/origin/${sourceBranch}`]);
  }
  const sourceSha = git(['rev-parse', 'HEAD']);
  if (!prepareOnly && git(['rev-parse', `refs/remotes/origin/${sourceBranch}`]) !== sourceSha) {
    throw new Error(`로컬 커밋과 원격 ${sourceBranch}가 다릅니다. 소스를 먼저 푸시해 주세요.`);
  }

  let previousSha = '';
  if (prepareOnly) {
    previousSha = git(['rev-parse', 'refs/remotes/origin/gh-pages']);
  } else {
    const remoteHead = git(['ls-remote', '--heads', 'origin', 'refs/heads/gh-pages']);
    if (remoteHead) {
      git(['fetch', 'origin', '+refs/heads/gh-pages:refs/remotes/origin/gh-pages']);
      previousSha = git(['rev-parse', 'refs/remotes/origin/gh-pages']);
      let previousBuild;
      // 루트에 생성 정보가 아직 없으면 다른 판 폴더의 생성 정보로 생성 브랜치인지 확인한다
      for (const where of ['', 'codex-v5-claude/', 'codex-v5/']) {
        try { previousBuild = JSON.parse(git(['show', `${previousSha}:${where}__build.json`])); break; } catch { previousBuild = null; }
      }
      if (!previousBuild) throw new Error('기존 gh-pages가 이 도구의 생성 브랜치인지 확인할 수 없어 덮어쓰지 않았습니다.');
      if (previousBuild.publisher !== 'cat-at-the-door') throw new Error('기존 gh-pages의 생성 정보를 확인할 수 없어 배포를 중단합니다.');
    }
  }

  // Dropbox 같은 동기화 폴더의 파일 잠금을 피하도록 시스템 임시 폴더를 쓴다.
  const stagingBase = path.resolve(os.tmpdir(), 'cat-at-the-door-pages');
  fs.mkdirSync(stagingBase, { recursive: true });
  const staging = fs.mkdtempSync(path.join(stagingBase, 'pages-'));
  const site = path.join(staging, 'site');
  fs.mkdirSync(site);
  const indexEnv = {
    ...gitEnv,
    GIT_DIR: git(['rev-parse', '--absolute-git-dir']),
    GIT_WORK_TREE: site,
    GIT_INDEX_FILE: path.join(staging, 'index'),
  };
  const stagedGit = args => git(args, { cwd: site, env: indexEnv });
  try {
    if (!previousSha) throw new Error('기존 gh-pages가 없어 다른 사이트 보존을 검증할 수 없습니다.');
    stagedGit(['read-tree', previousSha]);
    stagedGit(['checkout-index', '--all', '--force']);
    const rootEntries = fs.readdirSync(site).filter(name => name !== '.git' && name !== '.nojekyll' && !keep.includes(name));
    const firstMove = !fs.existsSync(path.join(site, archive));
    if (firstMove) {
      // 예전 루트(v4.1)를 v4.1/로 옮겨 계속 플레이할 수 있게 한다
      fs.mkdirSync(path.join(site, archive));
      for (const name of rootEntries) fs.renameSync(path.join(site, name), path.join(site, archive, name));
    } else {
      for (const name of rootEntries) {
        const target = path.join(site, name);
        if (!inside(site, target)) throw new Error('루트 배포 경로를 확인할 수 없습니다.');
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
    for (const name of fs.readdirSync(dist)) {
      if (keep.includes(name)) throw new Error(`빌드에 보존 폴더와 같은 이름(${name})이 있어 중단합니다.`);
      fs.cpSync(path.join(dist, name), path.join(site, name), { recursive: true });
    }
    const build = { publisher: 'cat-at-the-door', version: 'v6', source_branch: sourceBranch, source_commit: sourceSha, base_pages_commit: previousSha, built_at: new Date().toISOString() };
    fs.writeFileSync(path.join(site, '__build.json'), `${JSON.stringify(build, null, 2)}\n`);
    stagedGit(['add', '--all', '--force', '--', '.']);
    const tree = stagedGit(['write-tree']);
    const changed = git(['-c', 'core.quotepath=false', 'diff-tree', '-r', '--name-only', previousSha, tree]).split(/\r?\n/).filter(Boolean);
    const touchedKept = changed.filter(file => kept(file) && !(firstMove && file.startsWith(archive + '/')));
    if (touchedKept.length) {
      throw new Error('다른 판의 폴더가 달라져 배포를 중단합니다: ' + touchedKept.slice(0, 3).join(', '));
    }
    if (prepareOnly) {
      console.log(JSON.stringify({ status: '로컬 배포 묶음 검증 완료', source_commit: sourceSha, base_pages_commit: previousSha, tree, changed_files: changed.length, moved_old_root_to: firstMove ? archive + '/' : null, url: liveUrl }, null, 2));
      return;
    }
    const commit = git(['commit-tree', tree, '-p', previousSha, '-m', `Publish v6 (main ${sourceSha.slice(0, 7)}) at the site root${firstMove ? ', old root moved to ' + archive + '/' : ''}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01Cp5eYT9gaWbbeBRe1GQ8NH`]);
    git(['push', 'origin', `${commit}:refs/heads/gh-pages`]);
    // Pages 설정은 이미 gh-pages 루트로 되어 있다. 로그인 정보가 없는 환경에서는 건너뛴다
    try { await configurePages(); } catch (error) { console.warn('Pages 설정 확인을 건너뜀: ' + (error.message || error)); }
    const preservedFiles = git(['ls-tree', '-r', '--name-only', previousSha]).split(/\r?\n/).filter(file => file && kept(file)).length;
    const deployment = { status: 'GitHub Pages 배포 요청 완료', url: liveUrl, source_commit: sourceSha, deployment_commit: commit, base_pages_commit: previousSha, moved_old_root_to: firstMove ? archive + '/' : null, preserved_files: preservedFiles };
    fs.mkdirSync(path.join(root, '.preview'), { recursive: true });
    fs.writeFileSync(path.join(root, '.preview/v6-deployment.json'), JSON.stringify(deployment, null, 2));
    console.log(JSON.stringify(deployment, null, 2));
  } finally {
    try { removeStaging(stagingBase, staging); }
    catch { console.warn(`임시 파일 자동 정리를 마치지 못했습니다. 배포 결과에는 영향이 없습니다: ${staging}`); }
  }
}

main().catch(error => {
  console.error(error.message || '배포에 실패했습니다.');
  process.exitCode = 1;
});
