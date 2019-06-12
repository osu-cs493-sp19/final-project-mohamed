const router = require('express').Router();

const { checkAuthToken } = require('../lib/auth')
const { createSignedUrl } = require('../lib/gcs')
const { Assignment } = require('../models/assignment')
const { AssignmentSubmission } = require('../models/assignmentSubmission')
const { Course } = require('../models/course')
const { User } = require('../models/user')


module.exports = router

router.get('/:id/download', checkAuthToken, async (req, res, next) => {
  try {
    const submission = await AssignmentSubmission.findBy('id', req.params.id);
    const assignment = await Assignment.findBy('id', submission.assignmentId);
    const course = await Course.findBy('id', assignment.courseId);
    if (await User.courseInstructorOrAdmin(req.user, course.instructorId) ||
        req.user == submission.studentId)
    {
      res.status(200).send({
        downloadLink: await createSignedUrl(submission.gcsFilename)
      })
    } else {
      res.status(403).send({
        error: "Cannot get submission unless authenticated as submitting student, course instructor, or admin."
      });
    }
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error retrieving submission download link."
    });
  }
})
