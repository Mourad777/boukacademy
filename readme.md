CMS for instructors to create courses and for students to take courses
React is the front-end framework and Nodejs/Express is used on the backend
Redux is used for state management

AWS S3 services is used to store files
MongoDB is used as the database
Redis is used to cache chat messages and keep track of online users
i18n is used to convert the app into different languages
socketio is used to give a real-time user experience
redux forms are used throughout the app to facilitate state
management of inputs

There can be 2 possible account types: instructor and student
-The app is designed in a way that the first instructor that registers will get admin privaleges
-An admin instructor is like an instructor just with the possibility to configure the platform
in more ways such as
-approval required prior to giving access to a new student/instructor account
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
Create courses that include lessons, assignments, tests, course resources, office hours

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
-Lesson slides are marked completed after the student views the slide for a few seconds or if the slide includes an audio
or video, the media must be watched/listened till the end for the slide to be marked as completed

TESTS AND ASSIGNMENTS
-Test can have a timer
-If the student starts the test with a timer of 50 minutes but the due date is in 30 minutes, the
timer will be set to 30 minutes 

-Tests and Assignments rely on the wysiwyg ckeditor
There can be 4 possible sections: multiple-choice, essay, speaking, and fill-in-the-blanks
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
-a hierarchal system with 3 levels was created for instructors to organized the course
-the 3 levels of hierarchy include modules, subjects and topics
-tests, lessons, and assignments can be selectively included into each module, subject or topic

NOTIFICATIONS
-push notifications use the webpush api so that the user can be notified even if the app is closed
-bell notifications are used to easily show updates when the app is opened

EMAILS
-emails are send via the sendgrid api

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
-the setting that a user has access to depends on whether they are an admin,
instructor, or student
-some of the settings include hiding active status, recieve emails, bell notifications,
push notifications for updates to important documents such as tests, assignments, lessons
-the admin can control the size of files that can be uploaded for both students and instructors
-the admin can also control whether opening a new account requires admin approval before being
allowed to use the app
-the instructor has control over whether course enrollment approval is required prior to accessing
a course

PAYMENTS
-There are two types of payment methods at the moment
 1)Credit card payments via the stripe api
 2)Bitcoin payments via the coinbase ecommerce api
    ->coinbase does the heavy lifting of monitoring the bitcoin
      network for changes in the payment status, it usually takes
      between 5 and 30 minutes to confirm a bitcoin transaction
-Credit card payments are approved or denied instantly, if approved via
credit card or bitcoin the student will have access to the course or a 
request for enrollment will be submitted depending on the configuration of the app

CHARTS
-nivo charts are used to display progress reports and to display the weight of each
section of a test/assignment