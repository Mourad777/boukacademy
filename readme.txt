CMS for instructors to create courses and for students to take courses
React is the front-end framework and Nodejs/Express is used on the server-slide
Redux is used for state management


AWS S3 services is used to store files
MongoDB is used as the database
Redis is used to cache chat messages and keep track of online users
i18n is used to convert the app into different languages
socketio is heavily used to give a real-time user experience
redux forms is used almost everywhere there are inputs

There can be 2 possible account types: instructor and student
-The app is designed in a way that the first instructor that registers will get admin rights
-An admin instructor is like an instructor just with the possibility to configure the platform
in more ways such as
-approval required prior to giving access to student
-approval required prior to giving access to instructor
-max courses per instructor
-max upload file size for students
-max upload file size for instructors
-require password before starting a test
-allow students or instructors to delete their account
-time limit to record voice
-Is there a drop course penalty
-Penalty (%) when dropping a course
-Course passing grade (%)

Instructor Panel Features
Create courses that include lessons, assignments, and, tests

COURSE
-The course name is the only required field, must be unique
-Courses can have pre-requisites, the student will not have access if the pre-requisite course
has not yet been completed
-Course syllabus with ckeditor
-Max number of students
-Language that the course is taught in
-Important dates: Enrollment date range, course date range, drop course deadline
-Office hours: weekly or on specific dates, the instructor can enable/disable chat
according to office hours

LESSONS
-Lessons are composed of slides and each slide can be either a video slide or a slide with text and or audio
that is recorded or uploaded from the device
-Lessons can have an available on date that makes the lesson visible to the student but not accessible before
that date

TESTS AND ASSIGNMENTS
-Test can have a timer
-If the student starts the test with a timer of 50 minutes but the due date is in 30 minutes, the
timer will be set to 30 minutes 

-Tests and Assignments rely heavily on ckeditor which is a wysiwyg
There can be 4 possible secionts: multiple-choice, essay, speaking, and fill-in-the-blanks
-The mc section can have 1 or more correct answers with questions being text or images
-The essay section includes questions being text or images
-The speaking section can have questions that are audio or text/images, the answer will be audio
that is recorded by the student
-The fill-in-the-blanks section has a piece of text made from the ckeditor and the blanks are created
by highlighting a piece of text with the yellow mark, the blank can be a selectable answer with 3 possible
options or a written answer, the instructor also has the option to include audio via a file or recording
for each blank that may include important information to answer correctly
The highlighted text is replaced by a string -BLANK- which is used to keep track of input fields when
the student is taking the test
-Tests and assignments can be reset for each individual student or for all students
-Editing is blocked if at least 1 student already started to take the test, it must be reset to permit
editing in that case

GRADING
-Partial grades can be given for each section
-The multiple-choice and fill in the blanks section are graded automatically since the correct answers
are very specific
-The speaking and essay sections must be graded manually since the instructor must evaluate the text and
audio of the student
-The instructor can highlight or add additional text to the students answer in the essay section, then
when the student will review the test, an option to view the unedited answer will be available
-Audio feedback is possible via recording for the speaking section
-Written feedback is available for all questions in all sections
-The final grade is calculated based on the marks for individual questions and weights of each section,
however it can be adjusted manually and an explanation can be provided

MODULES

NOTIFICATIONS

EMAILS

REAL-TIME FEATURES
-chat
-notifications
-new tests/assignments/lessons
-updates to important dates in the course/lessons/assignments/tests
-activating/de-activating a course
-submitting a test/assignments
-reviewing a test/assignments
-approving/denying access to a course
-releasing a final grade

SETTINGS