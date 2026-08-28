# 이돈휘 포트폴리오 사이트

바닐라 HTML/CSS/JS. 빌드 도구도 런타임 의존성도 없다. `index.html` 을 그대로 올리면 된다.

```
site/
  index.html        ← 빌드 산출물. 손으로 고치지 않는다 (tools/build_site.py 가 만든다)
  css/design.css    ← 클로드 디자인 시안이 만든 규칙. 역시 빌드 산출물
  css/extra.css     ← 손으로 쓴 것. 서체·영상·BT 뷰어·좁은 화면 보정
  js/main.js        ← 손으로 쓴 것. 영상 지연 로딩 · 목차 · BT 뷰어 · 클릭 로딩
  assets/           ← tools/site_media.py 가 만든 영상·이미지 + 내려받은 서체
  _artifact/        ← 한 파일로 묶은 판. 배포에는 안 올린다 (.gitignore)
```

## 다시 만들기

```bash
python tools/site_media.py     # 원본 -> 웹용 영상·이미지 (ffmpeg, 2~3분)
python tools/build_site.py     # 시안 -> site/index.html
python tools/build_artifact.py # site/ -> 한 파일 (Artifact 배포용)
```

시안이 새로 오면 `_workspace/<회차>/rendered.html` 을 갈아 끼우고 `build_site.py` 의 `SRC` 만 바꾼다.
(시안 `.dc.html` 은 `sc-for`/`{{ }}` 템플릿이라 그대로는 안 뜬다. 브라우저에서 한 번 렌더한 결과가 `rendered.html` 이다.)

## 확인해 보기

```bash
python -m http.server 8733 --directory site
```

`file://` 로 열면 안 된다 — 영상과 서체가 CORS 로 막힌다.

## GitHub Pages 로 올리기

저장소는 <https://github.com/donhwi/portfolio> 이고 `main` 에 올라가 있다.
고친 뒤에는 `git push` 한 줄이면 된다.

Pages 는 **Settings → Pages → Source: Deploy from a branch → main / (root)** 로 켠다.
1~2분 뒤 <https://donhwi.github.io/portfolio/> 에서 열린다.

> 워크플로로 Pages 를 자동으로 켜 보려 했으나 `actions/configure-pages` 의 `enablement` 가
> 기본 `GITHUB_TOKEN` 권한으로 거부됐다. 토글이 더 짧아 워크플로는 걷어냈다.

**계정 없이 더 빨리 보고 싶으면**: <https://app.netlify.com/drop> 에 `site` 폴더를 통째로 끌어다 놓으면
바로 공개 주소가 나온다. `_artifact/` 는 빼고 올리는 편이 좋다 (8MB짜리 사본이다).

## 남은 것

- **Unity WebGL 빌드** — 01-6 자리는 지금 15초 하이라이트 영상이다. 빌드가 나오면
  그 자리에 iframe 을 끼우고 문구를 되돌리면 된다 (`tools/build_site.py` 의 `wire_play`).
  빌드 전 고칠 것은 인수인계 문서 §6 에 있다 (Brotli·씬 0번·예외 처리).
- **PDF 이력서** — 버튼을 아직 두지 않았다. 파일이 생기면 히어로에 한 칸 늘린다.
- **MAGNET/DMZ 스크린샷** — 시안에 붙은 것을 그대로 쓰고 있다. 더 좋은 것이 있으면
  `tools/site_media.py` 의 `IMAGES` 표만 고치면 된다.
