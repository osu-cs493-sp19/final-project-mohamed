const { db } = require('../lib/db')
const { ValidationError } = require('../lib/validation')

const CourseSchema = {
  subject: { required: true },
  courseNumber: { required: true },
  title: { required: true },
  term: { required: true },
  instructorId: { required: true }
}

const all = (page, per) => {
}

const createCourse = (data) => {
  data = extractSchemaFields(data)
  const query = {
    text: 'INSERT INTO courses (subject, course_number, title, term, instructor_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    values: [data.subject, data.courseNumber, data.title, data.term, data.instructorId]
  }

  return db.query(query)
    .then(res => res.rows[0].id)
    .catch(e => e)
}
