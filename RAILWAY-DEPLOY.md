# Railway 배포 가이드

## 🚀 방법 1: GitHub 연동 (추천)

### 1단계: GitHub 푸시
```bash
# Git 인증 후 푸시
git push origin main
```

### 2단계: Railway 배포
1. https://railway.app 접속
2. GitHub로 로그인
3. **"New Project"** 클릭
4. **"Deploy from GitHub repo"** 선택
5. 레포지토리 선택: `hyunli-git/stan`
6. **"Add variables"** 클릭하여 환경 변수 추가:

```
GOOGLE_AI_API_KEY=your_google_ai_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
REDIS_URL=your_redis_url_here
ENVIRONMENT=production
```

⚠️ **보안 주의:**
- 절대 실제 API 키를 문서에 넣지 마세요
- 모든 키는 Railway Dashboard의 Variables 섹션에서만 설정하세요
- `.env` 파일은 `.gitignore`에 포함되어야 합니다

7. **Settings** → **Root Directory** → `stan-backend` 입력
8. **Deploy** 클릭!

⏱️ 배포 시간: 2-3분

---

## 🚀 방법 2: Railway CLI

### Railway CLI 설치
```bash
npm i -g @railway/cli
```

### 로그인
```bash
railway login
```

### 배포
```bash
cd stan-backend
railway init
railway up
```

### 환경 변수 설정
```bash
# Railway CLI로 환경 변수 설정 (실제 값으로 교체하세요)
railway variables set GOOGLE_AI_API_KEY=your_key_here
railway variables set SUPABASE_URL=your_url_here
railway variables set SUPABASE_ANON_KEY=your_anon_key_here
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
railway variables set REDIS_URL=your_redis_url_here
railway variables set ENVIRONMENT=production
```

💡 **TIP:** `.env.production` 파일에서 값을 복사하되, 절대 Git에 커밋하지 마세요!

---

## ✅ 배포 확인

배포가 완료되면:

1. Railway 대시보드에서 **"Deployments"** 확인
2. **"View Logs"**에서 로그 확인
3. 생성된 URL 복사 (예: `https://stan-backend-production.up.railway.app`)

### API 테스트
```bash
# Health check
curl https://your-app.up.railway.app/api/health

# Root endpoint
curl https://your-app.up.railway.app/
```

---

## 🔧 모바일 앱 연동

배포된 백엔드 URL을 모바일 앱에 설정:

**파일:** `stan-mobile/config/api.ts`
```typescript
export const API_BASE_URL = 'https://your-app.up.railway.app';
```

---

## 💰 비용

- **무료 플랜**: $5 크레딧 (약 한 달)
- **Hobby 플랜**: $5/월
- **Pro 플랫**: $20/월 (더 많은 리소스)

무료 플랜으로 시작하면 충분합니다!

---

## 🐛 트러블슈팅

### 빌드 실패
- Railway 로그 확인
- `requirements.txt` 확인
- Python 버전 확인 (`runtime.txt`)

### 앱 크래시
- **Logs** 탭에서 에러 확인
- 환경 변수가 모두 설정되었는지 확인
- Health check 엔드포인트 확인

### 환경 변수 수정
Railway 대시보드 → Variables → 수정 후 자동 재배포

---

## 📱 다음 단계

1. ✅ Railway 배포 완료
2. ✅ API URL 받기
3. 📱 모바일 앱 `config/api.ts` 업데이트
4. 📱 모바일 앱 테스트
5. 🚀 모바일 앱 배포 (Expo)

---

**문제가 있으면 Railway 대시보드의 Logs를 확인하세요!**
