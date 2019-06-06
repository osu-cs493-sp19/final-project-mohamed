class ValidationError extends Error {
  constructor(msg) {
    super(msg)
  }
}

const validate = (data, schema) => {
  const errors = [];
  for (const key in schema) {
    // Check that field is present if it is required
    if (schema[key].required) {
      if (!(key in data)) {
        errors.push(new ValidationError(`Missing required field ${key}.`))
        continue;
      }
    }

    // Run field-specific validation function if present
    if (key in data) {
      if (schema[key].validate) {
        try {
          // validation functions should throw ValidationError
          schema[key].validate(data[key])
        } catch (e) {
          if (e instanceof ValidationError) {
            errors.push(e)
          } else {
            throw e
          }
        }
      }
    }
  }

  // Throw the errors if there are any
  if (errors.length < 1) {
    return true
  } else {
    throw { validationErrors: true, errors }
  }
}

const extractSchemaFields = (data, schema) => {
  const fields = {}
  for (const key in schema) {
    if (key in data) {
      // Transform data if a transformation function is present
      if (schema[key].transform) {
        fields[key] = schema[key].transform(data[key])
      } else {
        fields[key] = data[key]
      }
    }
  }
  return fields
}
