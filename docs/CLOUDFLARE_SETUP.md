# Cloudflare 자동 제출 설정

## 1. 응답 암호화 키 생성

```bash
npm run keys:generate
```

`.response-keys/public.pem`은 Worker가 학생 브라우저에 제공할 공개키입니다. `.response-keys/private.pem`은 관리자 복호화 전용이며 저장소에 커밋하거나 Worker에 등록하지 않습니다. 개인키를 별도 안전한 위치에 백업합니다.

## 2. GitHub App 생성

GitHub **Settings → Developer settings → GitHub Apps → New GitHub App**에서 다음처럼 만듭니다.

- Webhook: 비활성화
- Repository permissions → Contents: Read and write
- 다른 권한: No access
- 설치 대상: `hiphop5782/smart-survey` 저장소 하나

App ID와 Installation ID를 기록하고 private key를 내려받습니다. GitHub가 내려준 키가 `BEGIN RSA PRIVATE KEY` 형식이면 다음처럼 PKCS#8로 변환합니다.

```bash
openssl pkcs8 -topk8 -nocrypt -in github-app.pem -out github-app-pkcs8.pem
```

## 3. Turnstile 위젯 생성

Cloudflare Turnstile에서 사이트를 만들고 허용 호스트에 `survey.sysout.co.kr`을 등록합니다. 로컬 시험이 필요하면 Cloudflare의 공식 테스트 키를 사용합니다. Site key와 Secret key를 각각 기록합니다.

## 4. Worker 비밀값 등록

먼저 Cloudflare에 로그인합니다.

```bash
npx wrangler login
```

다음 명령은 값을 프롬프트로 받아 Worker secret으로 저장합니다.

```bash
npx wrangler secret put GITHUB_APP_ID -c worker/wrangler.toml
npx wrangler secret put GITHUB_APP_INSTALLATION_ID -c worker/wrangler.toml
npx wrangler secret put GITHUB_APP_PRIVATE_KEY -c worker/wrangler.toml
npx wrangler secret put TURNSTILE_SITE_KEY -c worker/wrangler.toml
npx wrangler secret put TURNSTILE_SECRET_KEY -c worker/wrangler.toml
npx wrangler secret put RESPONSE_PUBLIC_KEY_PEM -c worker/wrangler.toml
```

`GITHUB_APP_PRIVATE_KEY`에는 GitHub App PKCS#8 키 전체를, `RESPONSE_PUBLIC_KEY_PEM`에는 `.response-keys/public.pem` 전체를 입력합니다. `TURNSTILE_SITE_KEY`와 공개키는 비밀 자료는 아니지만 줄바꿈과 환경별 변경을 안전하게 관리하기 위해 secret으로 둡니다.

## 5. 배포와 도메인

현재 API는 DNS zone 이전 없이 쓸 수 있는 `https://smart-survey-api.smart-survey.workers.dev`에 배포합니다. 서비스 본체 주소 `https://survey.sysout.co.kr`은 그대로 유지됩니다.

```bash
npm run worker:check
npx wrangler deploy --dry-run -c worker/wrangler.toml
npm run worker:deploy
```

배포 후 다음을 확인합니다.

```bash
curl https://smart-survey-api.smart-survey.workers.dev/health
```

모든 secret 설정 전에는 `{"ok":true,"configured":false}`, 설정 후에는 `configured`가 `true`로 반환되어야 합니다. `/v1/config`과 `/v1/responses`는 `worker/wrangler.toml`의 `ALLOWED_ORIGINS`에 있는 웹앱 Origin에서만 CORS 접근을 허용합니다.

## 6. 운영 점검

1. 게시 설문에서 테스트 답변을 제출합니다.
2. 완료 화면의 응답 ID와 `data` 브랜치의 `surveys/{surveyId}/responses/{responseId}.json`을 대조합니다.
3. 저장 파일에 `answers`나 주관식 원문이 없고 `encryption` 객체만 있는지 확인합니다.
4. 관리자 결과 화면에서 `.response-keys/private.pem`을 선택하고 **GitHub 응답 동기화**를 실행합니다.
5. 복호화된 통계와 내보내기를 확인합니다.

설정 전이나 장애 시에는 학생 화면의 **수동 백업**에서 응답 JSON 다운로드를 계속 사용할 수 있습니다.
