const router = require('express').Router()
const multer = require('multer');
const crypto = require('crypto');

const { createSignedUrl, uploadFile } = require('../lib/gcs')

const { checkAuthToken } = require('../lib/auth')
const { Assignment } = require('../models/assignment')
const { AssignmentSubmission } = require('../models/assignmentSubmission')
const { Course } = require('../models/course')
const { CourseStudent } = require('../models/courseStudent')
const { User } = require('../models/user')

module.exports = router

const fileUpload = multer({
  storage: multer.memoryStorage()
}).single('file')

router.post('/', checkAuthToken, async (req, res) => {
  try {
    const course = await Course.findBy('id', req.body.courseId);
    if (! await User.courseInstructorOrAdmin(req.user, course.instructorId)) {
      return res.status(403).send({
        error: "Cannot create assignment without authentication as course instructor or admin."
      })
    }
    const assignment = await Assignment.create(req.body)
    res.status(201).send(assignment)
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'VALIDATION_ERROR') {
        return res.status(400).send({
          error: "The request body is invalid."
        })
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error creating assignment."
    });
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const assignment = await Assignment.findBy('id', req.params.id)
    res.status(200).send(assignment)
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error retrieving assignment."
    });
  }
})

router.patch('/:id', checkAuthToken, async (req, res, next) => {
  try {
    let assignment = await Assignment.findBy('id', req.params.id)
    const course = await Course.findBy('id', assignment.courseId);
    if (! await User.courseInstructorOrAdmin(req.user, course.instructorId)) {
      return res.status(403).send({
        error: "Cannot update assignment without authentication as course instructor or admin."
      })
    }
    assignment = await assignment.update(req.body)
    res.status(200).send(assignment)
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      } else if (err.type === 'VALIDATION_ERROR') {
        return res.status(400).send({
          error: "The request body is invalid."
        })
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error updating assignment."
    });
  }
})

router.delete('/:id', checkAuthToken, async (req, res, next) => {
  try {
    const assignment = await Assignment.findBy('id', req.params.id)
    const course = await Course.findBy('id', assignment.courseId);
    if (! await User.courseInstructorOrAdmin(req.user, course.instructorId)) {
      return res.status(403).send({
        error: "Cannot delete assignment without authentication as course instructor or admin."
      })
    }
    await assignment.destroy()
    res.status(204).send()
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error deleting assignment."
    });
  }
})

router.get('/:id/submissions', checkAuthToken, async (req, res, next) => {
  try {
    const assignment = await Assignment.findBy('id', req.params.id)
    const course = await Course.findBy('id', assignment.courseId);
    if (! await User.courseInstructorOrAdmin(req.user, course.instructorId)) {
      return res.status(403).send({
        error: "Cannot view assignment submissions without authentication as course instructor or admin."
      })
    }

    let params = ['assignment_id']
    const paramVals = [assignment.id]
    let countParams = []
    if ('studentId' in req.query) {
      params.push('student_id')
      paramVals.push(req.query.studentId)
    }
    for (let i = 0; i < params.length; ++i) {
      const param = params[i]
      params[i] = `${param} = $${i + 3}`
      countParams.push(`${param} = $${i + 1}`)
    }
    countParams = countParams.join(' AND ')
    params = params.join(' AND ')

    let page = parseInt(req.query.page) || 1
    const perPage = 10
    const totalSubmissions = await AssignmentSubmission.count({ where: [countParams, paramVals] })
    const totalPages = Math.ceil(totalSubmissions / perPage)
    if (totalPages === 0) {
      page = 1
    } else {
      page = page < 1 ? 1 : page
      page = page > totalPages ? totalPages : page
    }
    const offset = (page - 1) * perPage

    const submissions = await AssignmentSubmission.all(offset, perPage, { where: [params, paramVals] })
    for (const submission of submissions) {
      submission['file'] = `/submissions/${submission.id}/download`
    }

    res.status(200).send({
      submissions,
      pageNumber: page,
      totalPages: totalPages === 0 ? 1 : totalPages,
      pageSize: perPage,
      totalCount: totalSubmissions
    })
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error retrieving assignment submissions."
    });
  }
})

router.post('/:id/submissions', checkAuthToken, fileUpload, async (req, res, next) => {
  try {
    const assignment = await Assignment.findBy('id', req.params.id)
    if (! await User.isStudentInCourse(req.user, assignment.courseId)) {
      return res.status(403).send({
        error: "Cannot submit assignment without authentication as student enrolled in course."
      })
    }

    if (!req.file || !(req.body.studentId && req.body.assignmentId)) {
      return res.status(400).send({
        error: 'The request body is invalid.'
      })
    }

    let enrollment = await CourseStudent.all(0, 1, { where: ['student_id = $3 AND course_id = $4', [req.body.studentId, assignment.courseId]] })
    if (enrollment.length < 1) {
      return res.status(403).send({
        error: 'Not enrolled in course.'
      })
    }
    enrollment = enrollment[0]

    const randHex = crypto.pseudoRandomBytes(48).toString('hex');
    const filename = `${randHex}.${req.file.originalname}`
    const data = {
      assignmentId: req.body.assignmentId,
      studentId: req.body.studentId,
      enrollmentId: enrollment.id,
      submittedAt: new Date(),
      originalFilename: req.file.originalname,
      gcsFilename: filename
    }
    const submission = await AssignmentSubmission.create(data)

    await uploadFile(filename, req.file.buffer)

    res.status(200).json({
      id: submission.id
    });
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      } else if (err.type === 'VALIDATION_ERROR') {
        return res.status(400).send({
          error: "The request body is invalid."
        })
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error creating submission."
    });
  }
})
