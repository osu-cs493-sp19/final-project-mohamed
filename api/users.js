const router = require('express').Router();

const {
  checkAuthToken,
  generateAuthToken
} = require('../lib/auth');
const { Course } = require('../models/course');
const { CourseStudent } = require('../models/courseStudent');
const { User } = require('../models/user');

// Route to create a new user.
router.post('/', async (req, res) => {
  try {
    const newUser = await User.create(req.body)
    res.status(201).json({id: newUser.id.toString()});
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
      err
    });
  }
});

// Route to get a specific user.
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findBy('id', req.params.id);
    delete user.password;
    if (user.role == 'instructor') {
      let courses = await Course.findManyBy('instructor_id', req.params.id);
      user.courses = courses.map(c => c.id);
    }
    if (user.role == 'student') {
      let courses = await CourseStudent.enrolledCourses(req.params.id);
      user.courses = courses.map(c => c.id);
    }
    res.status(200).json(user);
  } catch (err) {
    if (err.constructor.name === 'DBError') {
      if (err.type === 'NOT_FOUND') {
        return next()
      }
    }

    console.error(err);
    res.status(500).send({
      error: "Error retrieving user. Please try again later"
    });
  }
});

// Route to generate a JWT token for authentication.
router.post('/login', async (req, res) => {
  if (req.body && req.body.email && req.body.password) {
    const user = await User.authenticate(req.body.email, req.body.password);
    if (user) {
      const token = generateAuthToken(user.id);
      res.status(200).send({
        token: token
      });
    } else {
      res.status(401).send({
        error: "The specified credentials were invalid."
      });
    }
  } else {
    res.status(400).send({
      error: "Login request requires email and password."
    });
  }
});

module.exports = router;
