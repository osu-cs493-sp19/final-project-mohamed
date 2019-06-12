CREATE TABLE IF NOT EXISTS course_students (
  id SERIAL NOT NULL,
  course_id INT NOT NULL,
  student_id INT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE
);
