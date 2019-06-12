const router = require('express').Router();

const { createSignedUrl } = require('../lib/gcs')
const { AssignmentSubmission } = require('../models/assignmentSubmission')

module.exports = router

router.get('/:id/download', async (req, res, next) => {
  try {
    const submission = await AssignmentSubmission.findBy('id', req.params.id)
    res.status(200).send({
      downloadLink: await createSignedUrl(submission.gcsFilename)
    })
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
