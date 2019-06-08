class Model {
  constructor() {
    this.__setTableName()
    this.__loadSchema()
    this.__createMagic()
  }

  __setTableName() {
    if (!this.__proto__.__tableName) {
      const className = this.__proto__.constructor.name
      const snake = className.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)
      this.__proto__.__tableName = snake[0] === '_' ? snake.substring(1) : snake
    }
  }

  async __loadSchema() {
    if (!this.__proto__.__tableSchema || !this.__proto__.tableSchema) {
      const query = {
        text: 'SELECT * FROM information_schema.columns WHERE table_name = $1',
        values: [this.__tableName]
      }
      const rawSchema = await db.query(query)
        .then(res => res.rows)
      const schema = {}

      for (const col in rawSchema) {
        schema[col.column_name] = {
          hasDefault: schema[col].column_default !== null,
          nullable: schema[col].is_nullable,
          type: schema[col].data_type
        }
      }

      this.__proto__.__rawTableSchema = rawSchema
    }
  }

  __columns() {
    return this.__proto__.__tableSchema
      .map(col => col.column_name)
      .filter(col => col !== 'id')
  }

  create(data) {
    const columns = this.__columns()
    const queryCols = columns.join(', ')
    const params = [...Array(columns.length).keys()].map(k => `$${k + 1}`).join(', ')
    const values = []

    for (const col of queryCols) {
      values.push(col)
    }

    const query = {
      text: `INSERT INTO ${this.__proto__.__tableName} (${queryCols}) VALUES (${params}) RETURNING id`,
      values:
    }
  }

}
