CREATE TYPE user_role AS ENUM (
  'admin',
  'instructor',
  'student'
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  role user_role NOT NULL,
  PRIMARY KEY (id)
);