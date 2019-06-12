CREATE TABLE IF NOT EXISTS assignment_submissions (
  id SERIAL NOT NULL,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  enrollment_id INT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (assignment_id) REFERENCES assignments (id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES course_students (id) ON DELETE CASCADE
);
