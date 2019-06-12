class DBError extends Error {
  constructor(type, errorData) {
    super()
    this.type = type
    this.errorData = errorData
  }
}

exports.DBError = DBError
