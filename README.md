# Demo Backend for Blue-Green Deployment

배포 자동화 및 모니터링 테스트를 위한 데모 백엔드 서버

## 📋 Overview

이 프로젝트는 블루-그린 배포 전략을 시연하기 위한 Node.js 백엔드 서버입니다.
Prometheus 메트릭 수집, 의도적 에러 생성, 환경별 분기 기능을 포함합니다.

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18+ 
- Docker & Docker Desktop
- npm or yarn

### 설치
```bash
# 저장소 클론
git clone <repository-url>
cd demo-backend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

서버가 `http://localhost:8080`에서 실행됩니다.

## 📁 프로젝트 구조
```
demo-backend/
├── src/
│   └── server.js          # 메인 서버 파일
├── Dockerfile             # Docker 이미지 빌드 파일
├── .dockerignore         # Docker 빌드 제외 파일
├── package.json          # 프로젝트 메타데이터 및 의존성
└── README.md            # 프로젝트 문서
```

## 🔧 환경 변수

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | 실행 환경 (development/staging/production) | `development` |
| `PORT` | 서버 포트 | `8080` |
| `APP_VERSION` | 애플리케이션 버전 | `1.0.0` |

## 🌐 API 엔드포인트트

### Health Check

#### `GET /health`
서버 상태 및 환경 정보 반환

**Response:**
```json
{
  "status": "ok",
  "environment": "production",
  "version": "1.0.0",
  "timestamp": "2024-11-03T10:00:00.000Z"
}
```

### Application Info

#### `GET /api/info`
서버 환경 및 설정 정보 반환

**Response:**
```json
{
  "environment": "production",
  "version": "1.0.0",
  "hostname": "backend-green-abc123",
  "errorRate": 0.0
}
```

### Error Rate Control

#### `POST /error/rate`
에러 발생 확률 설정 (테스트용)

**Request:**
```json
{
  "rate": 0.3
}
```

**Response:**
```json
{
  "errorRate": 0.3,
  "percentage": "30.0%"
}
```

#### `GET /error/rate`
현재 에러율 조회

**Response:**
```json
{
  "errorRate": 0.3,
  "percentage": "30.0%"
}
```

### Error Testing

#### `GET /api/test`
설정된 에러율에 따라 랜덤하게 에러 발생

**Success Response (200):**
```json
{
  "status": "success",
  "environment": "production"
}
```

**Error Response (500):**
```json
{
  "error": "Internal Server Error",
  "environment": "production"
}
```

#### `GET /error/500`
의도적으로 500 에러 발생 (롤백 테스트용)

**Response (500):**
```json
{
  "error": "Intentional error"
}
```

### Metrics

#### `GET /metrics`
Prometheus 형식의 메트릭 데이터 노출

**메트릭 목록:**
- `app_errors_total{type}` - 에러 발생 횟수
- `http_requests_total{method,status}` - HTTP 요청 횟수
- `process_cpu_seconds_total` - CPU 사용 시간 (자동 수집)
- `nodejs_heap_size_used_bytes` - 메모리 사용량 (자동 수집)
- `nodejs_heap_size_total_bytes` - 총 메모리 (자동 수집)

## 🐳 Docker

### Build
```bash
# 기본 빌드
docker build -t demo-backend:latest .

# 환경별 빌드
docker build \
  --build-arg NODE_ENV=production \
  --build-arg APP_VERSION=1.0.0 \
  -t demo-backend:prod .
```

### 실행행
```bash
# 포트 8080으로 실행
docker run -d -p 8080:8080 --name backend demo-backend:latest

# 환경 변수 주입
docker run -d -p 8080:8080 \
  -e NODE_ENV=staging \
  -e APP_VERSION=1.2.3 \
  --name backend-staging \
  demo-backend:latest
```

### Health Check

컨테이너는 30초마다 자동으로 헬스체크를 수행합니다:
```bash
docker ps  # STATUS 컬럼에서 health 상태 확인
```

## 📊 모니터링과의 통합합

### Prometheus Configuration

이 서버는 Prometheus와 통합하여 메트릭을 수집할 수 있습니다.

**prometheus.yml 설정 예시:**
```yaml
scrape_configs:
  - job_name: 'backend-blue'
    static_configs:
      - targets: ['backend-blue:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s
  
  - job_name: 'backend-green'
    static_configs:
      - targets: ['backend-green:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Queries

**에러율 계산:**
```promql
rate(app_errors_total[5m])
```

**환경별 에러율:**
```promql
rate(app_errors_total{environment="production"}[5m])
```

**HTTP 500 에러율:**
```promql
rate(http_requests_total{status="500"}[5m])
```

## 🔄 배포 작업 흐름

### 1. GitHub Actions Integration

Lambda 함수 또는 GitHub Actions에서 ECS 배포 시 환경 변수 설정:
```yaml
environment:
  - NODE_ENV: production
  - APP_VERSION: 1.2.3
  - PORT: 8080
```

### 2. Blue-Green Deployment

- **Blue Environment**: 현재 운영 중인 버전
- **Green Environment**: 새로 배포할 버전

헬스체크 엔드포인트: `GET /health`

### 3. Rollback Scenario
```bash
# 1. Green 환경에 새 버전 배포
POST /deploy { "environment": "green", "version": "2.0.0" }

# 2. 에러율 모니터링
GET /metrics
# → app_errors_total 증가 감지

# 3. 에러율 임계값 초과 시 자동 롤백
POST /rollback { "environment": "green", "to_version": "1.0.0" }
```

## 🤝 협업 방식

### 모니터링 담당자

**메트릭 수집 설정:**

Prometheus에서 다음 타겟을 스크래핑해야합니다!:
- `backend-blue:8080/metrics`
- `backend-green:8080/metrics`

**제공되는 메트릭:**
```
app_errors_total{type="random"}      # 랜덤 에러
app_errors_total{type="500"}         # 500 에러
http_requests_total{method,status}   # HTTP 요청
process_cpu_seconds_total            # CPU 사용률
nodejs_heap_size_used_bytes          # 메모리 사용량
```

### 람다 설정 팀원

**ECS 배포 시 필요한 환경 변수:**
```python
environment_variables = [
    {"name": "NODE_ENV", "value": "production"},
    {"name": "APP_VERSION", "value": version},
    {"name": "PORT", "value": "8080"}
]
```

**헬스체크 설정:**
- Endpoint: `GET /health`
- Expected Status: `200`
- Timeout: `3s`

### 슬랙 봇 설정 팀원

**에러율 제어 API:**
```bash
# 에러율 설정 (30%)
POST /error/rate
Content-Type: application/json

{
  "rate": 0.3
}
```

**사용 시나리오:**
1. Slack에서 `/test-error 30` 명령 실행
2. Lambda가 `POST /error/rate {"rate": 0.3}` 호출
3. 이후 `/api/test` 호출 시 30% 확률로 500 에러 발생

## 🧪 테스트트

### Local Testing
```bash
# 헬스체크
curl http://localhost:8080/health

# 환경 정보
curl http://localhost:8080/api/info

# 에러율 30% 설정
curl -X POST http://localhost:8080/error/rate \
  -H "Content-Type: application/json" \
  -d '{"rate": 0.3}'

# 랜덤 에러 테스트 (10회)
for i in {1..10}; do
  curl http://localhost:8080/api/test
  echo ""
done

# 메트릭 확인
curl http://localhost:8080/metrics
```

### Docker Testing
```bash
# 컨테이너 실행
docker run -d -p 8080:8080 --name test demo-backend:latest

# 로그 확인
docker logs test

# 컨테이너 내부 접속
docker exec -it test sh

# 정리
docker stop test && docker rm test
```

## 📈 Performance Testing

### Load Testing with ab (Apache Bench)
```bash
# 100 요청, 동시 10개
ab -n 100 -c 10 http://localhost:8080/api/test
```

### CPU Spike Test
```bash
# 3초 동안 CPU 부하 생성
curl http://localhost:8080/error/cpu?duration=3000
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# 포트 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :8080

# 프로세스 종료
taskkill /PID <PID> /F

# 다른 포트로 실행
PORT=8081 npm start
```

### Docker Container Exits Immediately
```bash
# 로그 확인
docker logs <container-id>

# 일반적인 원인:
# 1. package.json의 "start" script 확인
# 2. src/server.js 경로 확인
# 3. 환경 변수 누락
```

### Metrics Not Showing
```bash
# /metrics 엔드포인트 확인
curl http://localhost:8080/metrics

# Prometheus 설정 확인
# targets에서 backend:8080/metrics 스크래핑 확인
```

## 📝 Development Timeline

### 11/5 (화)
- [ ] GitHub Actions 연동
- [ ] ECR 푸시 테스트

### 11/6 (수)
- [ ] Prometheus 연동 테스트 (with 신우)
- [ ] 에러율 테스트 및 검증

### 11/7-8 (목-금)
- [ ] 최종 통합 테스트
- [ ] 문서 작성 및 발표 준비

## 📚 References

- [Express.js Documentation](https://expressjs.com/)
- [Prom-client GitHub](https://github.com/siimon/prom-client)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)



**Last Updated:** 2025-11-03
