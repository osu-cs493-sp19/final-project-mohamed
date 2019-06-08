const router = require('express').Router();

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

module.exports = router;
