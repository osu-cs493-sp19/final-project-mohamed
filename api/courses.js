const router = require('express').Router()
const { Course } = require('../models/course')

module.exports = router

router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1
    const perPage = 10
    const totalCourses = await Course.count()
    const totalPages = Math.ceil(totalCourses / perPage)
    page = page > totalPages ? totalPages : page
    const offset = (page - 1) * perPage

    const params = ['subject', 'number', 'term'].filter(p => p in req.query)
    const paramVals = params.map(p => req.query[p])
    for (let i = 0; i < params.length; ++i) {
      params[i] = `${params[i]} = $${i + 3}`
    }
    let whereConstraint = params.join(' AND ')

    if (whereConstraint.length < 1) {
      whereConstraint = []
    } else {
      whereConstraint = [whereConstraint, paramVals]
    }

    res.status(200).send({
      courses: await Course.all(offset, perPage, { where: whereConstraint })
    })
  } catch (err) {
    console.log(' -- Error:', err)
    res.status(500).json({
      error: 'Error fetching courses.'
    })
  }
})

router.post('/', async (req, res) => {
  try {
    const newCourse = await Course.create(req.body)
    res.status(201).send(newCourse)
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'VALIDATION_ERROR') {
        return res.status(400).send({
          err
        })
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error creating course."
    });
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const course = await Course.findBy('id', req.params.id)
    res.status(200).send(course)
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error retrieving course."
    });
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    let course = await Course.findBy('id', req.params.id)
    course = await course.update(req.body)
    res.status(200).send(course)
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
      error: "Error updating course."
    });
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const course = await Course.findBy('id', req.params.id)
    await course.destroy()
    res.status(204).send()
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error deleting course."
    });
  }
})

router.get('/:id/students', async (req, res, next) => {
  try {
    const course = await Course.findBy('id', req.params.id)
    const students = await course.enrollments()
    res.status(200).send({
      students: students.map(s => s.studentId)
    })
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error retrieving students."
    });
  }
})

router.post('/:id/students', async (req, res, next) => {
  try {
    const course = await Course.findBy('id', req.params.id)

    if (!req.body || !(req.body.add || req.body.remove)) {
      return res.status(400).send({
        error: "The request body is invalid."
      })
    }

    if (req.body.add) {
      await course.enrollStudents(req.body.add)
    }
    if (req.body.remove) {
      await course.unenrollStudents(req.body.remove)
    }

    res.status(200).send()
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error updating course enrollments."
    });
  }
})


router.get('/:id/roster', async (req, res, next) => {
  try {
    const course = await Course.findBy('id', req.params.id)
    const students = await course.enrolledStudents()
    const csv = students.map(s => `${s.id},"${s.name}",${s.email}`).join('\n')
    res.type('text/csv').status(200).send(csv)
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error retrieving course roster."
    });
  }
})

router.get('/:id/assignments', async (req, res, next) => {
  try {
    const course = await Course.findBy('id', req.params.id)
    const assignments = await course.assignments()
    res.status(200).send({
      assignments: assignments.map(a => a.id)
    })
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error retrieving assignments for course."
    });
  }
})
