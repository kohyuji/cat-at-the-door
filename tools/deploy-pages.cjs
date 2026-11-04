'use strict';

// 게임 소스와 main은 그대로 두고, 생성 전용 gh-pages 브랜치만 갱신한다.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const liveUrl = 'https://kohyuji.github.io/cat-at-the-door/codex-v5/';
const repository = 'kohyuji/cat-at-the-door';
const sourceBranch = 'codex-v5';
const publishBranch = 'gh-pages';
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
    console.log('사용법: node tools/deploy-pages.cjs [--prepare-only]\n기본: 빌드 후 gh-pages 배포 및 Pages 소스 설정\n--prepare-only: 로컬에서 배포 묶음만 검증 (네트워크·푸시·설정 변경 없음)');
    return;
  }
  const unknown = process.argv.slice(2).filter(value => value !== '--prepare-only');
  if (unknown.length) throw new Error(`알 수 없는 옵션: ${unknown.join(', ')}`);
  const remote = git(['remote', 'get-url', 'origin']);
  if (!/^https:\/\/github\.com\/kohyuji\/cat-at-the-door(?:\.git)?\/?$/.test(remote)) {
    throw new Error('origin이 kohyuji/cat-at-the-door 저장소가 아니므로 배포를 중단합니다.');
  }
  if (!prepareOnly && git(['status', '--porcelain', '--untracked-files=normal'])) {
    throw new Error('변경 파일을 먼저 커밋하고 codex-v5에 올린 뒤 배포해 주세요.');
  }
  run(process.execPath, [path.join(__dirname, 'build-web.cjs')]);
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('빌드 결과 dist/index.html이 없습니다.');

  if (!prepareOnly) {
    git(['fetch', 'origin', '+refs/heads/codex-v5:refs/remotes/origin/codex-v5']);
  }
  const sourceSha = git(['rev-parse', 'HEAD']);
  if (!prepareOnly && git(['rev-parse', 'refs/remotes/origin/codex-v5']) !== sourceSha) {
    throw new Error('로컬 커밋과 원격 codex-v5가 다릅니다. 소스를 먼저 푸시해 주세요.');
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
      try { previousBuild = JSON.parse(git(['show', `${previousSha}:codex-v5/__build.json`])); }
      catch { throw new Error('기존 gh-pages가 이 도구의 생성 브랜치인지 확인할 수 없어 덮어쓰지 않았습니다.'); }
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
    const preview = path.join(site, sourceBranch);
    if (!inside(site, preview) || path.basename(preview) !== 'codex-v5') throw new Error('자기 배포 경로를 확인할 수 없습니다.');
    fs.rmSync(preview, { recursive: true, force: true });
    fs.cpSync(dist, preview, { recursive: true });
    const build = { publisher: 'cat-at-the-door', source_branch: sourceBranch, source_commit: sourceSha, base_pages_commit: previousSha, built_at: new Date().toISOString() };
    fs.writeFileSync(path.join(preview, '__build.json'), `${JSON.stringify(build, null, 2)}\n`);
    stagedGit(['add', '--all', '--force', '--', '.']);
    const tree = stagedGit(['write-tree']);
    const changed = git(['-c', 'core.quotepath=false', 'diff-tree', '-r', '--name-only', previousSha, tree]).split(/\r?\n/).filter(Boolean);
    if (changed.some(file => !file.startsWith('codex-v5/'))) {
      throw new Error('다른 공개 사이트 또는 루트 파일이 달라져 배포를 중단합니다.');
    }
    if (prepareOnly) {
      console.log(JSON.stringify({ status: '로컬 배포 묶음 검증 완료', source_commit: sourceSha, base_pages_commit: previousSha, tree, preview_files: changed.length, url: liveUrl }, null, 2));
      return;
    }
    const commit = git(['commit-tree', tree, '-p', previousSha, '-m', `Publish codex-v5 ${sourceSha.slice(0, 7)}`]);
    git(['push', 'origin', `${commit}:refs/heads/gh-pages`]);
    await configurePages();
    console.log(JSON.stringify({ status: 'GitHub Pages 배포 요청 완료', url: liveUrl, source_commit: sourceSha, deployment_commit: commit, base_pages_commit: previousSha }, null, 2));
  } finally {
    try { removeStaging(stagingBase, staging); }
    catch { console.warn(`임시 파일 자동 정리를 마치지 못했습니다. 배포 결과에는 영향이 없습니다: ${staging}`); }
  }
}

main().catch(error => {
  console.error(error.message || '배포에 실패했습니다.');
  process.exitCode = 1;
});
