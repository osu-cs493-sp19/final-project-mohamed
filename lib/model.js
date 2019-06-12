const { db } = require('./postgres')
const { DBError } = require('./dberror')

class Model {
  constructor(row) {
    if (row) {
      for (const field in row) {
        const camelField = field.replace(/_[a-z]/g, l => l.substring(1).toUpperCase())
        this[camelField] = row[field]
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
    if (!this.prototype.__tableSchema || !this.prototype.__rawTableSchema) {
      const query = {
        text: 'SELECT * FROM information_schema.columns WHERE table_name = $1',
        values: [this.prototype.__tableName]
      }
      const rawSchema = await db.query(query)
        .then(res => res.rows)
      const schema = {}

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
      throw new DBError('VALIDATION_ERROR', { validationErrors: errors })
    }
  }

  static async transform(data) {
    if (!this.prototype.transformations) {
      return data
    }
    for (const field in data) {
      if (field in this.prototype.transformations) {
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
      // Convert field name to camelcase
      const camelField = field.replace(/_[a-z]/g, l => l.substring(1).toUpperCase())
      if (camelField in data) {
        fields[field] = data[camelField]
      }
    }
    return fields
  }

  static async findBy(field, val) {
    const query = {
      text: `SELECT ${this.__columns().join(', ')} FROM ${this.prototype.__tableName} WHERE ${field} = $1`,
      values: [val]
    }
    return await db.query(query)
      .then(res => {
        if (res.rows.length < 1) {
          throw new DBError('NOT_FOUND')
        }
        return new this.prototype.constructor(res.rows[0])
      })
      .catch(this.__catchError)
  }

  static async count() {
    const query = `SELECT COUNT(*) AS count FROM ${this.prototype.__tableName}`
    return await db
      .query(query).then(res => res.rows[0].count)
      .catch(this.__catchError)
  }

  static async all(offset, perPage, { where = [] } = {}) {
    const query = {
      text: `SELECT ${this.__columns().join(', ')} FROM ${this.prototype.__tableName}`,
      values: [offset, perPage]
    }

    if (where.length >= 2) {
      query.text = `${query.text} WHERE ${where[0]}`
      query.values = query.values.concat(where[1])
    }

    query.text = `${query.text} ORDER BY id OFFSET $1 LIMIT $2`

    return await db.query(query)
      .then(res => {
        for (let i = 0; i < res.rows.length; ++i) {
          res.rows[i] = new this.prototype.constructor(res.rows[i])
        }
        return res.rows
      })
      .catch(this.__catchError)
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

    return await db.query(query)
      .then(res => new this.prototype.constructor(res.rows[0]))
      .catch(this.__catchError)
  }

  static async rawQuery(query) {
    return await db.query(query)
      .catch(this.__catchError)
  }

  async update(data) {
    data = this.constructor.extractSchemaFields(data)
    if (Object.keys(data).length < 1) {
      throw new DBError('VALIDATION_ERROR', { validationErrors: ['No valid fields in request body.'] })
    }
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
      .catch(this.constructor.__catchError)

    // Reload the updated row...
    return await this.constructor.findBy('id', this.id)
  }

  static __catchError(e) {
    if (e.constructor.name === 'DBError') {
      throw e
    } else {
      throw new DBError('RAW_ERROR', { rawError: e })
    }
  }
}

exports.Model = Model;
