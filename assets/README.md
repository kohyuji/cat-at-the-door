# 그림과 글꼴

현재 게임에 쓰는 파일을 모아 둔 폴더입니다.

| 파일 | 내용 |
| --- | --- |
| `rooms-pixel.png` | 침실과 부엌 겸 거실 배경 |
| `places-pixel.png` | 거리, 지하철 승강장, 회사 배경 |
| `fonts/DOSGothic.woff2` | 현재 게임의 도스 고딕 글꼴 |
| `fonts/LICENSE-DOSGothic.txt` | 도스 고딕의 MIT 사용 허가문 |
| `fonts/DungGeunMo.woff` | 이전 보관 문서에 쓰는 둥근모꼴 |

배경은 이 프로젝트용으로 이미지 생성 도구에서 제작했습니다. 작은 집과 귀여운 픽셀 비율, 회색·아이보리·파랑·청록을 사용했습니다. 움직이는 사람·고양이·소품은 `src/pixel-render.js`와 `src/life-view.js`에서 그립니다.

잠든 인물은 배경의 침대와 베개에 맞춰 그립니다. 침대가 통째로 들어 있는 예전 자세 이미지를 겹치거나 늘려 쓰지 않습니다. 이전 자세 이미지와 제작 프롬프트는 [이전 자료](../archive/r2/assets/)에 보관했습니다.

도스 고딕은 [제작자 저장소](https://github.com/hurss/fonts)의 원본을 웹용 WOFF2로 압축한 것입니다. [MIT 사용 허가문](fonts/LICENSE-DOSGothic.txt)을 배포 파일과 단일 실행 파일에도 포함합니다.
