const { promisify } = require('util')
const { redisClient } = require('./redis')

const incrAsync = promisify(redisClient.incr).bind(redisClient)

module.exports = (maxReqPerMinute) => {
  return async (req, res, next) => {
    const date = new Date()
    const key = `${req.ip}:${date.getHours()}${date.getMinutes()}`
    const reqCount = await incrAsync(key)
    if (reqCount == 1) {
      await redisClient.expire(key, 60)
    }

    if (reqCount > maxReqPerMinute) {
      res.status(429).send({
        error: 'Too many requests sent this minute.'
      })
    } else {
      next()
    }
  }
}
