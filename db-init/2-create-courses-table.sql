CREATE TABLE IF NOT EXISTS courses (
  id SERIAL NOT NULL,
  subject TEXT NOT NULL,
  number INT NOT NULL,
  title TEXT NOT NULL,
  term TEXT NOT NULL,
  instructor_id INT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (instructor_id) REFERENCES users (id) ON DELETE CASCADE
);
