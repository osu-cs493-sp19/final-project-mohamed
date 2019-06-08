const { db } = require('./postgres')

class Model {
  constructor(row) {
    if (row) {
      for (const field in row) {
        this[field] = row[field]
      }
    }
  }

  static async __initialize() {
    if (!this.prototype.__initialized) {
      this.__setTableName()
      await this.__loadSchema()
    }
    this.prototype.__initialized = true
  }

  static __setTableName() {
    if (!this.prototype.__tableName) {
      const className = this.prototype.constructor.name
      const snake = className.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`) + 's'
      this.prototype.__tableName = snake[0] === '_' ? snake.substring(1) : snake
    }
  }

  static async __loadSchema() {
    if (!this.prototype.__tableSchema || !this.prototype.tableSchema) {
      const query = {
        text: 'SELECT * FROM information_schema.columns WHERE table_name = $1',
        values: [this.prototype.__tableName]
      }
      const rawSchema = await db.query(query)
        .then(res => res.rows)
      const schema = {}
      const validations = {}

      for (const col in rawSchema) {
        schema[rawSchema[col].column_name] = {
          hasDefault: rawSchema[col].column_default !== null,
          required: rawSchema[col].is_nullable === 'NO',
          type: rawSchema[col].data_type
        }
      }

      this.prototype.__tableSchema = schema
      this.prototype.__rawTableSchema = rawSchema
    }
  }

  static __columns({ omit = [] } = {}) {
    return Object.keys(this.prototype.__tableSchema)
      .filter(col => !omit.includes(col))
  }

  static validate(data, requiredFields = true) {
    const errors = []

    if (requiredFields) {
      for (const field in this.prototype.__tableSchema) {
        const columnInfo = this.prototype.__tableSchema[field]
        if (columnInfo.required && !columnInfo.hasDefault) {
          if (!(field in data)) {
            errors.push(`Missing required field ${field}.`)
            continue
          }
        }
      }
    }

    if (this.prototype.validations) {
      for (const field in this.prototype.validations) {
        const validation = this.prototype.validations[field]
        if (field in data) {
          if (validation.custom) {
            for (const f of validation.custom) {
              try {
                f(data[field])
              } catch (e) {
                errors.push(e)
                continue
              }
            }
          }

          if (validation.valueIn) {
            if (!validation.valueIn.includes(data[field])) {
              errors.push(`Invalid value provided for field ${field}.`)
            }
          }
        }
      }
    }

    if (errors.length < 1) {
      return true
    } else {
      throw { validationErrors: true, errors }
    }
  }

  static async transform(data) {
    for (const field in data) {
      if (this.prototype.transformations[field]) {
        for (const f of this.prototype.transformations[field]) {
          // Not necessarily async
          data[field] = await f(data[field])
        }
      }
    }
    return data
  }

  static extractSchemaFields(data) {
    const fields = {}
    for (const field of this.__columns()) {
      if (field in data) {
        fields[field] = data[field]
      }
    }
    return fields
  }

  static async findBy(field, val) {
    const query = {
      text: `SELECT ${this.__columns().join(', ')} FROM ${this.prototype.__tableName} WHERE ${field} = $1`,
      values: [val]
    }
    return await db.query(query).then(res => new this.prototype.constructor(res.rows[0]))
  }

  static async count() {
    const query = `SELECT COUNT(*) AS count FROM ${this.prototype.__tableName}`
    return await db.query(query).then(res => res.rows[0].count)
  }

  static async all(offset, perPage) {
    const query = {
      text: `SELECT ${this.__columns().join(', ')} FROM ${this.prototype.__tableName} ORDER BY id OFFSET $1 LIMIT $2`,
      values: [offset, perPage]
    }
    return await db.query(query).then(res => {
      for (let i = 0; i < res.rows.length; ++i) {
        res.rows[i] = new this.prototype.constructor(res.rows[i])
      }
      return res.rows
    })
  }

  static async create(data) {
    data = this.extractSchemaFields(data)
    this.validate(data)
    data = await this.transform(data)

    const columns = Object.keys(data).join(', ')
    const params = [...Array(Object.keys(data).length).keys()].map(k => `$${k + 1}`).join(', ')
    const values = Object.values(data)
    const query = {
      text: `INSERT INTO ${this.prototype.__tableName} (${columns}) VALUES (${params}) RETURNING *`,
      values: values
    }

    return await db.query(query).then(res => new this.prototype.constructor(res.rows[0]))
  }

  async update(data) {
    data = this.constructor.extractSchemaFields(data)
    this.constructor.validate(data, false)
    data = await this.constructor.transform(data)

    const fields = Object.keys(data)
    const values = Object.values(data)
    let i = 0
    for (; i < fields.length; ++i) {
      fields[i] = `${fields[i]} = $${i + 1}`
    }
    values.push(this.id)

    const query = {
      text: `UPDATE ${this.__proto__.__tableName} SET ${fields.join(', ')} WHERE id = $${i + 1}`,
      values: values
    }

    await db.query(query)

    for (const field in fields) {
      this[field] = data[field]
    }
  }
}

exports.Model = Model;
