// src/server.js
const express = require('express')
const app = express()

// ============================================
// 환경 설정
// ============================================
const ENV = process.env.NODE_ENV || 'development'
const PORT = process.env.PORT || 8080
const VERSION = process.env.APP_VERSION || '1.0.0'

// ESM 환경용 경로 설정
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//  public 폴더 절대경로 지정
const publicPath = path.join(__dirname, '../public')

//  정적 파일 서비스 (이미지, CSS, JS 등)
app.use(express.static(publicPath))

//  기본 페이지 — dance.html
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'dance.html'))
})

//  seollem.html 버전 테스트용
app.get('/seollem', (req, res) => {
  res.sendFile(path.join(publicPath, 'seollem.html'))
})

// ============================================
// Prometheus 메트릭 (간단 버전)
// ============================================
const promClient = require('prom-client')
const register = new promClient.Registry()

// 기본 메트릭 (CPU, Memory 등)
promClient.collectDefaultMetrics({ register })

// 에러 카운터
const errorCounter = new promClient.Counter({
  name: 'app_errors_total',
  help: 'Total errors',
  labelNames: ['type'],
  registers: [register],
})

// HTTP 요청 카운터
const httpCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
  registers: [register],
})

// 요청 지연시간 히스토그램 (라우트/메서드/상태코드 라벨)
const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  // RED/Apdex 템플릿이 자주 쓰는 버킷 구성
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
})

// ============================================
// 미들웨어
// ============================================
app.use(express.json())

// 모든 요청 카운트
app.use((req, res, next) => {
  res.on('finish', () => {
    httpCounter.inc({
      method: req.method,
      status: res.statusCode,
    })
  })
  next()
})

// ============================================
// 에러율 설정 (전역 변수)
// ============================================
let ERROR_RATE = 0.0

// ============================================
// 엔드포인트
// ============================================

// 1. 헬스체크 (health + healthz 둘 다 지원)
app.get(['/health', '/healthz'], (req, res) => {
  res.json({
    status: 'ok',
    environment: ENV,
    version: VERSION,
    timestamp: new Date().toISOString(),
  })
})

// 2. 환경 정보
app.get('/api/info', (req, res) => {
  res.json({
    environment: ENV,
    version: VERSION,
    hostname: require('os').hostname(),
    errorRate: ERROR_RATE,
  })
})

// 3. 에러율 설정 (POST)
app.post('/error/rate', (req, res) => {
  const rate = parseFloat(req.body.rate)

  if (isNaN(rate) || rate < 0 || rate > 1) {
    return res.status(400).json({ error: 'Rate must be 0~1' })
  }

  ERROR_RATE = rate
  console.log(`🎛️  Error rate: ${(ERROR_RATE * 100).toFixed(1)}%`)

  res.json({
    errorRate: ERROR_RATE,
    percentage: `${(ERROR_RATE * 100).toFixed(1)}%`,
  })
})

// 4. 에러율 조회 (GET)
app.get('/error/rate', (req, res) => {
  res.json({
    errorRate: ERROR_RATE,
    percentage: `${(ERROR_RATE * 100).toFixed(1)}%`,
  })
})

// 5. 랜덤 에러 테스트
app.get('/api/test', (req, res) => {
  // 에러 발생 시뮬레이션
  if (Math.random() < ERROR_RATE) {
    errorCounter.inc({ type: 'random' })

    console.error(`❌ Error triggered! (rate: ${ERROR_RATE})`)

    return res.status(500).json({
      error: 'Internal Server Error',
      environment: ENV,
      errorRate: ERROR_RATE,
    })
  }

  // 정상 응답
  res.json({
    status: 'success',
    environment: ENV,
    errorRate: ERROR_RATE,
  })
})

// 6. 의도적 500 에러
app.get('/error/500', (req, res) => {
  errorCounter.inc({ type: '500' })

  res.status(500).json({
    error: 'Intentional 500 error',
    environment: ENV,
  })
})

// 7. CPU 부하 (옵션)
app.get('/error/cpu', (req, res) => {
  const duration = parseInt(req.query.duration) || 3000
  const start = Date.now()

  while (Date.now() - start < duration) {
    Math.sqrt(Math.random())
  }

  res.json({
    message: 'CPU spike completed',
    duration: duration,
  })
})

// 8. Prometheus 메트릭 (모니터링 담당자가 수집)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

// 9. 루트
app.get('/api', (req, res) => {
  res.json({
    message: 'Demo Backend-v2alsdfjalsdkjf',
    environment: ENV,
    version: VERSION,
    endpoints: [
      'GET  /health',
      'GET  /api/info',
      'GET  /api/test',
      'POST /error/rate',
      'GET  /error/rate',
      'GET  /error/500',
      'GET  /metrics',
    ],
  })
})

// ============================================
// 서버 시작
// ============================================
app.listen(PORT, () => {
  console.log('')
  console.log('🚀 ================================')
  console.log(`   Environment: ${ENV}`)
  console.log(`   Version: ${VERSION}`)
  console.log(`   Port: ${PORT}`)
  console.log(`   URL: http://localhost:${PORT}`)
  console.log('================================')
  console.log('')
})
