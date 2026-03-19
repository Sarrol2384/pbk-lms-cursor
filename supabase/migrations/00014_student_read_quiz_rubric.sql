-- Allow enrolled students to read quiz_questions and assignment_rubrics for assessments
-- in courses they are approved for. (Admin/lecturer already have access via existing policies.)

-- quiz_questions: SELECT for students enrolled in the course that contains this assessment
CREATE POLICY "quiz_questions_student_read" ON quiz_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assessments a
    JOIN modules m ON m.id = a.module_id
    JOIN enrollments e ON e.course_id = m.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
    WHERE a.id = quiz_questions.assessment_id
  )
);

-- assignment_rubrics: SELECT for students enrolled in the course that contains this assessment
CREATE POLICY "assignment_rubrics_student_read" ON assignment_rubrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assessments a
    JOIN modules m ON m.id = a.module_id
    JOIN enrollments e ON e.course_id = m.course_id AND e.user_id = auth.uid() AND e.status = 'approved'
    WHERE a.id = assignment_rubrics.assessment_id
  )
);
