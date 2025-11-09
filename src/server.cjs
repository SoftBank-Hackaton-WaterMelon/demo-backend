// src/server.cjs
const express = require('express')
const path = require('path')
const app = express()

// ============================================
// 환경 설정 
// ============================================
const ENV = process.env.NODE_ENV || 'development'
const PORT = process.env.PORT || 8080
const VERSION = process.env.APP_VERSION || '1.0.0'

// CommonJS 환경용 경로 설정
// const __dirname = path.dirname(__filename)

// public 폴더 절대경로 지정
const publicPath = path.join(__dirname, '../public')

// ============================================
// Prometheus 메트릭
// ============================================
const promClient = require('prom-client')
const register = new promClient.Registry()

promClient.collectDefaultMetrics({ register })

const errorCounter = new promClient.Counter({
  name: 'app_errors_total',
  help: 'Total errors',
  labelNames: ['type'],
  registers: [register],
})

const httpCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
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
// 에러율 설정
// ============================================
let ERROR_RATE = 0.0

// ============================================
// 엔드포인트 (순서가 중요!)
// ============================================

// 1. 헬스체크 (제일 먼저!)
app.get(['/health', '/healthz'], (req, res) => {
  res.json({
    status: 'ok',
    environment: ENV,
    version: VERSION,
    timestamp: new Date().toISOString(),
  })
})

// 2. API 엔드포인트들
app.get('/api/info', (req, res) => {
  res.json({
    environment: ENV,
    version: VERSION,
    hostname: require('os').hostname(),
    errorRate: ERROR_RATE,
  })
})

app.post('/error/rate', (req, res) => {
  const rate = parseFloat(req.body.rate)

  if (isNaN(rate) || rate < 0 || rate > 1) {
    return res.status(400).json({ error: 'Rate must be 0~1' })
  }

  ERROR_RATE = rate
  console.log(`  Error rate: ${(ERROR_RATE * 100).toFixed(1)}%`)

  res.json({
    errorRate: ERROR_RATE,
    percentage: `${(ERROR_RATE * 100).toFixed(1)}%`,
  })
})

app.get('/error/rate', (req, res) => {
  res.json({
    errorRate: ERROR_RATE,
    percentage: `${(ERROR_RATE * 100).toFixed(1)}%`,
  })
})

app.get('/api/test', (req, res) => {
  if (Math.random() < ERROR_RATE) {
    errorCounter.inc({ type: 'random' })
    console.error(`❌ Error triggered! (rate: ${ERROR_RATE})`)

    return res.status(500).json({
      error: 'Internal Server Error',
      environment: ENV,
      errorRate: ERROR_RATE,
    })
  }

  res.json({
    status: 'success',
    environment: ENV,
    errorRate: ERROR_RATE,
  })
})

app.get('/error/500', (req, res) => {
  errorCounter.inc({ type: '500' })

  res.status(500).json({
    error: 'Intentional 500 error',
    environment: ENV,
  })
})

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

// 3. Prometheus 메트릭
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

// 4. API 루트 (JSON 응답)
app.get('/api', (req, res) => {
  res.json({
    message: 'Demo Backend API',
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

// 5. Seollem 페이지
// app.get('/seollem', (req, res) => {
//   res.sendFile(path.join(publicPath, 'seollem.html'))
// })

// 6. 정적 파일 서비스 (API보다 나중에!)
app.use(express.static(publicPath))

// 7. 루트 경로 - dance.html
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'seollem.html'))
})

// ============================================
// 404 핸들러
// ============================================
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
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
