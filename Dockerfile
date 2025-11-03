FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src ./src

# 빌드 시 환경 설정
ARG NODE_ENV=production
ARG APP_VERSION=1.0.0

ENV NODE_ENV=${NODE_ENV}
ENV APP_VERSION=${APP_VERSION}
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:8080/health',(r)=>{process.exit(r.statusCode===200?0:1)})"

CMD ["npm", "start"]