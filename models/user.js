const bcrypt = require('bcryptjs')
const { Model } = require('../lib/model')

let CourseStudent = null; // Part of hacky workaround to circular dependency

class User extends Model {
  static async authenticate(email, password) {
    try {
      const user = await User.findBy('email', email)
      const match = await bcrypt.compare(password, user.password)
      if (match) {
        return user
      } else {
        return null
      }
    } catch (err) {
      if (err.constructor.name === 'DBError') {
        if (err.type === 'NOT_FOUND') {
          return null
        }
      }
      throw err
    }
  }

  // Determines if a given user has permissions to create another user based on its contents
  // Returns false if not authorized and true if authorized or there's a validation issue
  static async canCreateUser(creatorId, requestBody) {
    if (! requestBody.role) { return true; } // Let validation catch this
    if (! creatorId) {
      return requestBody.role == 'student';
    }
    if (requestBody.role == 'instructor' || requestBody.role == 'admin') {
      const user = await User.findBy('id', creatorId);
      return user.role == 'admin';
    } else {
      return true;
    }
  }

  // Determines if a given user is a course instructor or admin
  static async courseInstructorOrAdmin(userId, instructorId) {
    // Fail if not authenticated
    if (! userId) {
      return false;
    }
    // Succeed if updater is course instructor
    if (userId == instructorId) {
      return true;
    }
    // Succeed if updater is admin
    const user = await User.findBy('id', userId);
    return user.role == 'admin';
  }

  static async isStudentInCourse(userId, courseId) {
    // Fail if not authenticated
    if (! userId) {
      return false;
    }
    // Part of hacky workaround to circular dependency
    if (CourseStudent == null) {
      CourseStudent = require('./courseStudent').CourseStudent;
    }
    // Check if student is enrolled in course
    const courses = await CourseStudent.enrolledCourses(userId);
    for (let course of courses) {
      if (courseId == course.id) {
        return true;
      }
    }
    return false;
  }

  // Nullifies req.user if the user doesn't exist or isn't an admin
  static async requireAdmin(req, res, next) {
    if (req.user) {
      try {
        const user = await User.findBy('id', req.user);
        if (user.role != 'admin') {
          req.user = null;
        }
      } catch (err) {
        if (err.constructor.name === 'DBError') {
          if (err.type === 'NOT_FOUND') {
            req.user = null;
          }
        }
        throw err
      }
    }
    next();
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
