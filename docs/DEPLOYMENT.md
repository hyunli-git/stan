# STAN 2.0 배포 가이드

## 🚀 빠른 배포

### 1. 백엔드 배포 (Vercel)

#### 사전 준비
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 디렉토리로 이동
cd stan-backend
```

#### 환경 변수 설정
Vercel 대시보드 또는 CLI로 환경 변수를 설정하세요:

```bash
vercel env add GOOGLE_AI_API_KEY production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# 선택사항
vercel env add REDIS_URL production
vercel env add ELEVENLABS_API_KEY production
```

또는 Vercel 대시보드에서:
1. Project Settings → Environment Variables
2. 다음 변수들을 추가:
   - `GOOGLE_AI_API_KEY` - Google Gemini API 키
   - `SUPABASE_URL` - Supabase 프로젝트 URL
   - `SUPABASE_ANON_KEY` - Supabase anon 키
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role 키
   - `REDIS_URL` (선택) - Redis 연결 URL (예: Upstash)
   - `ELEVENLABS_API_KEY` (선택) - 음성 합성용 API 키
   - `ALLOWED_ORIGINS` - CORS 허용 도메인 (예: `https://yourapp.com`)

#### 배포 실행
```bash
# 프로덕션 배포
vercel --prod

# 또는 자동 배포 (GitHub 연동)
# 1. GitHub에 푸시
# 2. Vercel에서 자동으로 배포됨
```

#### 배포 확인
```bash
# 헬스 체크
curl https://your-project.vercel.app/api/health

# 메트릭 확인
curl https://your-project.vercel.app/api/analytics/metrics
```

### 2. 모바일 앱 배포 (Expo)

#### 사전 준비
```bash
cd stan-mobile

# Expo 계정 로그인
npx expo login

# EAS CLI 설치
npm install -g eas-cli
```

#### API URL 업데이트
`stan-mobile/config/api.ts` 파일을 수정:
```typescript
export const API_BASE_URL = 'https://your-project.vercel.app';
```

#### EAS Build 설정
```bash
# EAS 프로젝트 초기화
eas build:configure

# eas.json이 생성됨
```

`eas.json` 예시:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### 빌드 실행
```bash
# Android APK 빌드
eas build --platform android --profile production

# iOS 빌드
eas build --platform ios --profile production

# 모두 빌드
eas build --platform all --profile production
```

#### 스토어 제출
```bash
# Android (Play Store)
eas submit --platform android

# iOS (App Store)
eas submit --platform ios
```

## 🔧 환경별 배포

### Development
```bash
# 백엔드
cd stan-backend
vercel

# 모바일
cd stan-mobile
npx expo start
```

### Staging
```bash
# 백엔드
vercel --env preview

# 모바일
eas build --profile preview
```

### Production
```bash
# 백엔드
vercel --prod

# 모바일
eas build --profile production
```

## 📊 배포 후 체크리스트

### 백엔드
- [ ] Health check 통과 (`/api/health`)
- [ ] Analytics 동작 확인 (`/api/analytics/metrics`)
- [ ] 환경 변수 모두 설정됨
- [ ] CORS 설정 확인
- [ ] 로그 모니터링 설정

### 모바일
- [ ] API 연결 테스트
- [ ] 푸시 알림 동작 확인
- [ ] 음성 기능 테스트
- [ ] 스트리밍 기능 테스트
- [ ] 앱 아이콘 및 스플래시 화면 확인

## 🐛 트러블슈팅

### 백엔드 이슈

#### "Module not found" 에러
```bash
# requirements.txt 확인
cd stan-backend
pip install -r requirements.txt

# Vercel에서 재배포
vercel --prod --force
```

#### 타임아웃 에러
vercel.json에서 maxDuration 증가:
```json
{
  "functions": {
    "api/index.py": {
      "maxDuration": 60
    }
  }
}
```

#### 메모리 부족
vercel.json에서 memory 증가:
```json
{
  "functions": {
    "api/index.py": {
      "memory": 1024
    }
  }
}
```

### 모바일 이슈

#### 빌드 실패
```bash
# 캐시 클리어
npm cache clean --force
rm -rf node_modules
npm install

# Expo 캐시 클리어
npx expo start -c
```

#### API 연결 안됨
- `config/api.ts`에서 올바른 URL 확인
- CORS 설정 확인
- 네트워크 권한 확인 (Android manifest)

## 📈 모니터링

### Vercel Dashboard
- 배포 상태: https://vercel.com/dashboard
- 로그 확인
- 분석 데이터

### Analytics
- Prometheus 메트릭: `https://your-project.vercel.app/metrics`
- 커스텀 분석: `https://your-project.vercel.app/api/analytics/metrics`

### Sentry (선택사항)
에러 추적을 위해 Sentry 설정:
```bash
npm install @sentry/node
```

## 🔄 CI/CD 설정

### GitHub Actions (예시)
`.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

  deploy-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Expo
        uses: expo/expo-github-action@v7
      - name: Build
        run: eas build --platform all --non-interactive
```

## 🔒 보안 체크리스트

- [ ] API 키는 환경 변수로 관리
- [ ] .env 파일은 .gitignore에 포함
- [ ] CORS는 특정 도메인만 허용
- [ ] Rate limiting 설정
- [ ] HTTPS 강제 사용
- [ ] 민감한 로그는 마스킹

## 📞 지원

문제가 발생하면:
1. Vercel 로그 확인
2. Expo 빌드 로그 확인
3. GitHub Issues에 문의

---

**마지막 업데이트**: 2026년 1월
**버전**: 2.0.0
