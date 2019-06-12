const bcrypt = require('bcryptjs')
const { Model } = require('../lib/model')

class User extends Model {
  static async authenticate(email, password) {
    const user = User.findBy('email', email)
    const match = await bcrypt.compare(password, user.password)
    if (match) {
      return user
    } else {
      return null
    }
  }
}

User.prototype.validations = {
  email: {
    custom: [(email) => {
      if (!email.match(/.+@.+\..+/)) {
        throw 'Email is invalid.'
      }
    }]
  },
  password: {
    custom: [(pw) => {
      if (pw.length < 8) {
        throw 'Password must contain at least 8 characters.'
      }
    }]
  },
  role: {
    valueIn: ['admin', 'instructor', 'student']
  }
}

User.prototype.transformations = {
  password: [
    async (pw) => {
      return await bcrypt.hash(pw, 8)
    }
  ]
}

exports.User = User
