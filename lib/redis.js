const redis = require('redis')
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT || 6379
})

exports.redisClient = redisClient
