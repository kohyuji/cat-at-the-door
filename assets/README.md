# 그림과 글꼴

현재 게임에 쓰는 파일을 모아 둔 폴더입니다.

| 파일 | 내용 |
| --- | --- |
| `rooms-pixel.png` | 침실과 부엌 겸 거실 배경 |
| `places-pixel.png` | 거리, 지하철 승강장, 회사 배경 |
| `fonts/NeoDunggeunmoPro-Regular.woff2` | 사용자 제공 Neo둥근모 Pro 글꼴 |
| `fonts/LICENSE-DOSGothic.txt` | 도스 고딕의 MIT 사용 허가문 |
| `fonts/DungGeunMo.woff` | 이전 보관 문서에 쓰는 둥근모꼴 |

배경은 이 프로젝트용으로 이미지 생성 도구에서 제작했습니다. 작은 집과 귀여운 픽셀 비율, 회색·아이보리·파랑·청록을 사용했습니다. 움직이는 사람·고양이·소품은 `src/pixel-render.js`와 `src/life-view.js`에서 그립니다.

잠든 인물은 배경의 침대와 베개에 맞춰 그립니다. 침대가 통째로 들어 있는 예전 자세 이미지를 겹치거나 늘려 쓰지 않습니다. 이전 자세 이미지와 제작 프롬프트는 [이전 자료](../archive/r2/assets/)에 보관했습니다.

도스 고딕은 [제작자 저장소](https://github.com/hurss/fonts)의 원본을 웹용 WOFF2로 압축한 것입니다. [MIT 사용 허가문](fonts/LICENSE-DOSGothic.txt)을 배포 파일과 단일 실행 파일에도 포함합니다.

R4 생성 스프라이트·배경은 r4-asset-manifest.json과 r4-prompts.md를 따른다. 로더는 G.images에 이미지를 제공하고 PixelArt.setImages로 연결한다. tools/assets.cjs는 웹·단일 HTML 자산 목록을 공통 관리한다.

현재 글꼴은 사용자 제공 Neo둥근모 Pro 원본을 그대로 사용한다. 글꼴 메타데이터의 SIL OFL 1.1 표기를 확인했고 [원 제작자 사용 조건](https://github.com/neodgm/neodgm/blob/main/LICENSE.txt)을 fonts/LICENSE-NeoDunggeunmo.txt에 포함한다. 이전 도스 고딕은 보관 자료다.

최종 R4의 런타임은 PixelArt.assetSources 중 R4 9개 파일을 사용한다. 사용자 승인 얼굴은 r4-portraits-approved.png 그대로, 후드티 아래 부분만 r4-portraits-approved-cords.png를 쓴다. -pixel 없는 초기 시안은 보존하며 공개 빌드에서 제외한다. 초상화 내부192px, 표시128px(작은 화면120px).

## codex-v5에서 가져온 그림 (R5·R6)

주인공의 옆·뒷모습과 걷기, 청소와 돌봄 동작, 지하철 승객, 방문, 침대, 우산, 번개탄, 단순한 고양이 얼굴은 `codex-v5` 브랜치의 그림을 가져와 쓴다. 출처 커밋, 크기, 해시, 칸 배치는 [r6-asset-manifest.json](r6-asset-manifest.json)에 적었다.

| 파일 | 내용 |
| --- | --- |
| `r6-people-v2.png` | 주인공 48×64 칸: 후드티와 정장의 앞·옆·뒤, 걷기, 앉기, 우산 든 팔 |
| `r6-clean-v2.png` | 빗자루질과 물걸레질 |
| `r6-care-v2.png`, `r6-wet-v2.png` | 사료와 물 붓기, 무릎 꿇기, 습식 캔 |
| `r6-transit-v2.png` | 지하철에 앉은 승객 넷 |
| `r6-extras.png` | `tools/build-extras.py`로 잘라 묶은 조각: 방문, 침대, 우산, 번개탄, 고양이 얼굴, 빗자루, 물걸레, 로봇청소기, 깃털 자동 장난감 |

`r6-extras.png`는 `python3 tools/build-extras.py`로 다시 만들 수 있다(원본은 git의 `origin/codex-v5`에서 읽는다). 결과 좌표는 `src/pixel-render.js`의 `EXTRA`에 넣는다. 주인공은 R4 사람들과 키가 맞도록 한 칸을 4배로 그린다.
