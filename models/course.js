const { Model } = require('../lib/model')
const { Assignment } = require('./assignment')
const { CourseStudent } = require('./courseStudent')

class Course extends Model {
  async assignments() {
    return await Assignment.all(0, 99999, { where: ['course_id = $3', [this.id]] })
  }

  async enrollments() {
    // all requires a per page limit...99999 is just arbitrary
    return await CourseStudent.all(0, 99999, { where: ['course_id = $3', [this.id]] })
  }

  async enrolledStudents() {
    return await CourseStudent.enrolledStudents(this.id)
  }

  async enrollStudents(ids) {
    // This is just easier than crafting the query...
    const enrolledStudentIds = (await this.enrollments()).map(s => s.studentId)
    for (const id of ids) {
      if (!enrolledStudentIds.includes(parseInt(id))) {
        await CourseStudent.create({
          courseId: this.id,
          studentId: id
        })
      }
    }
  }

  async unenrollStudents(ids) {
    return await CourseStudent.unenrollStudents(this.id, ids)
  }
}

exports.Course = Course
