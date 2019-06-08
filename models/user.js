const bcrypt = require('bcryptjs')
const { db } = require('../lib/db')
const { ValidationError } = require('../lib/validation')

const UserSchema = {
  name: { required: true },
  email: {
    required: true,
    validate: (email) => {
      // validate email
      if (!email.match(/.+@.+\..+/)) {
        throw new ValidationError('Email is invalid.')
      }
    }
  },
  password: {
    required: true,
    validate: (pw) => {
      if (pw.length < 8) {
        throw new ValidationError('Password must contain at least 8 characters.')
      }
    },
    transform: async (pw) => {
      return await bcrypt.hash(pw, 8)
    }
  },
  role: {
    required: false,
    default: 'user'
  }
}

const createUser = (data) => {
  data = extractSchemaFields(data)
  const query = {
    text: 'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
    values: [data.name, data.email, data.password, data.role]
  }

  return db.query(query)
    .then(res => res.rows[0].id)
    .catch(e => e)
}

const findBy = (field, val) => {
  const query = {
    text: `SELECT * FROM users WHERE ${field} = $1`,
    values: [val]
  }

  return db.query(query)
    .then(res => res.rows[0])
    .catch(e => e)
}

const find = (id) => {
  return findBy('id', id)
}

const authenticate = async (email, password) => {
  const user = await findBy('email', email)
  const match = await bcrypt.compare(password, user.password)
  if (match) {
    return user
  } else {
    return null;
  }
}
