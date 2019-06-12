const { Model } = require('../lib/model')
const { User } = require('./user')

let Course = null

class CourseStudent extends Model {
  static async enrolledStudents(courseId) {
    const enrollments = await this.all(0, 99999, { where: ['course_id = $3', [courseId]] })
    if (enrollments.length < 1) {
      return []
    }
    const studentIds = enrollments.map(e => e.studentId)
    const params = [...Array(studentIds.length).keys()].map(k => `$${k + 3}`).join(', ')
    const whereQuery = `id IN (${params})`
    return await User.all(0, 99999, { where: [whereQuery, studentIds] })
  }

  static async unenrollStudents(courseId, students) {
    const params = [...Array(students.length).keys()].map(k => `$${k + 2}`).join(', ')
    const query = {
      text: `DELETE FROM ${this.prototype.__tableName} WHERE course_id = $1 AND student_id IN (${params})`,
      values: [courseId].concat(students)
    }
    return await this.rawQuery(query)
  }

  static async enrolledCourses(studentId) {
    const enrollments = await this.all(0, 99999, { where: ['student_id = $3', [studentId]] })
    if (enrollments.length < 1) {
      return []
    }
    const courseIds = enrollments.map(e => e.courseId);
    const params = [...Array(courseIds.length).keys()].map(k => `$${k + 3}`).join(', ')
    const whereQuery = `id IN (${params})`
    if (Course === null) {
      Course = require('./course').Course
    }
    return await Course.all(0, 99999, { where: [whereQuery, courseIds] })
  }
}

exports.CourseStudent = CourseStudent
