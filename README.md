우리 앱의 HTTP 요청 수, 에러 수 같은 커스텀 지표가 필요하면

# prometheus.yml (모니터링 담당자가 작성)
scrape_configs:
  - job_name: 'backend-blue'
    static_configs:
      - targets: ['backend-blue:8080']
    metrics_path: '/metrics'  # 수집 만든 엔드포인트!
  
  - job_name: 'backend-green'
    static_configs:
      - targets: ['backend-green:8080']
    metrics_path: '/metrics'
