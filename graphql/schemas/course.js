const { buildSchema } = require('graphql');

module.exports = buildSchema(`

    type TestResult {
        _id:ID!
        test: ID!
        student:ID!
        course: ID!
        closed: Boolean!
        grade: Float
        graded: Boolean!
    }

    type Doc {
        document: String!
        documentType: String!
    }

    type Student {
        _id: ID!
        firstName: String!
        lastName: String!
        email: String
        password: String,
        dob: String
        language:String!
        coursesEnrolled: [ID]
        profilePicture:String
        blockedContacts:[String]
        lastLogin:String
        completedCourses:[ID]
        testResults:[TestResult]
        documents: [Doc]
    }
    
    type Document {
        document:String!
        documentType:String!
    }
 
    type Instructor {
        _id: ID!
        firstName: String!
        lastName: String!
        email: String!
        password: String,
        dob: String!
        language:String!
        profilePicture:String
        blockedContacts:[String]
        lastLogin:String
        documents:[Doc]
    }

    type Slide {
        slideContent: String
        audio: String
        video: String
        studentsSeen:[ID!]!
        seen:Boolean
    }

    type Lesson {
        _id: ID!
        course: ID!
        published: Boolean!
        availableOnDate: String
        lessonName: String!
        lessonSlides: [Slide!]!
        createdAt: String
    }

    type OfficeHourDay {
        _id: ID
        day: String!
        startTime: String!
        endTime: String!
        timezoneRegion:String!
    }

    type OfficeHourDate {
        _id: ID
        date:String!
        startTime: String!
        endTime: String!
        timezoneRegion:String!
    }

    type Test {
        _id: ID!
        course: ID!
        testName: String!
        published: Boolean!
        testType: String
        weight: Float!
        timer: Int
        classAverage: Float
        availableOnDate: String
        dueDate: String
        passingGrade:Float
        passingRequired:Boolean
        gradeReleaseDate: String
        allowLateSubmission: Boolean
        lateDaysAllowed: Int
        latePenalty: Float
        sectionWeights:SectionWeight
        essayQuestions: [EssayQuestion]
        multipleChoiceQuestions: [McQuestion]
        speakingQuestions: [SpeakingQuestion]
        fillInBlanksQuestions: FillBlanksSection
        assignment: Boolean!
        notes: String
        blockedNotes: Boolean!
        readingMaterials: [ReadingMaterial]
        audioMaterials: [AudioMaterial]
        createdAt: String
        completed:Boolean
    }

    type ReadingMaterial {
        content: String
        section: String
        fileUpload: Boolean
    }

    type AudioMaterial {
        audio: String
        section: String
        fileUpload: Boolean
    }

    type SectionWeight {
        mcSection: Float
        essaySection: Float
        speakingSection: Float
        fillBlankSection: Float
    }

    type FillBlanksSection {
        text: String
        blanks: [Blanks]
    }

    type Blanks {
        _id: ID
        correctAnswer: String
        marks: Float
        selectableAnswer: Boolean
        incorrectAnswers: [String]
        audio: String
        answerOptions: [String]
    }

    type McQuestion {
        question: String
        marks: Float
        solution: String
        correctAnswers: [String]
        answerOptions: [String]
    }

    type EssayQuestion {
        _id: ID
        question: String
        marks: Float
        solution: String
    }

    type SpeakingQuestion {
        _id: ID
        question: String
        marks: Float
        questionAudio: String
        audio: String
    }

    type Request {
        _id:ID!
        student:Student!
        approved:Boolean!
        denied:Boolean!
        deniedReason:String
        resubmissionAllowed:Boolean!
        droppedOut:Boolean!
    }

    type StudentGrade {
        passed:Boolean!
        grade:Float!
        gradeOverride:Boolean!
        gradeAdjustmentExplanation:String
        student:ID!
    }

    type Resource {
        _id:ID!
        resourceName:String!
        resource:String!
    }

    type Course {
        _id: ID!
        courseName: String!
        courseActive: Boolean!
        enrolled:Boolean
        grade:Float
        passed:Boolean
        droppedOut:Boolean
        accessDenied:Boolean
        enrollmentRequested:Boolean
        studentCapacity: Int
        language:String
        numberOfStudents: Int
        enrollmentStartDate: String
        enrollmentEndDate: String
        courseStartDate: String
        courseEndDate: String
        courseDropDeadline: String
        syllabus: String
        prerequisites: [Course]
        lessons:[Lesson]
        studentsEnrollRequests:[Request]
        tests: [Test]!
        courseInstructor: Instructor!
        courseImage: String
        regularOfficeHours: [OfficeHourDay]
        irregularOfficeHours: [OfficeHourDate]
        createdAt: String
        completed:Boolean
        totalIncludedTests: Int
        studentGrades:[StudentGrade!]!
        resources:[Resource]
    }

    type CourseData {
        courses: [Course!]!
    }

    input OfficeHourDayInput {
        day:String!
        startTime:String!
        endTime:String!
        timezoneRegion:String!
    }

    input OfficeHourDateInput {
        date:String!
        startTime:String!
        endTime:String!
        timezoneRegion:String!
    }

    input CourseInputData {
        courseId:ID!
        courseName: String!
        courseActive: Boolean!
        createdAt: String
        studentCapacity: Int
        language:String
        prerequisites: [ID]
        enrollmentStartDate: String
        enrollmentEndDate: String
        courseStartDate: String
        courseEndDate: String
        courseDropDeadline: String
        syllabus: String
        courseImage: String
        regularOfficeHours: [OfficeHourDayInput]
        irregularOfficeHours: [OfficeHourDateInput]
    }

    type RootQuery {
        courses: [Course!]!
        course(id: ID!): Course!
        instructorCourses: [Course!]!  
    }

    input ResourceInputData {
        resourceName: String!
        resource: String!
    }

    input GradeCourseInputData {
        courseId: ID!
        studentId: ID!
        grade: Float!
        gradeOverride: Boolean!
        gradeAdjustmentExplanation: String
        passed:Boolean!
    }

    type RootMutation {
        createCourse(courseInput: CourseInputData): Course!
        updateCourse(courseInput: CourseInputData): Course!
        updateCourseResources(resources:[ResourceInputData],courseId:ID!): Course!
        deleteCourse(id: ID!): Boolean
        enrollRequest(studentId: ID!, courseId: ID!): String!
        enrollApprove(studentId: ID!, courseId: ID!): String!
        enrollDeny(studentId: ID!, courseId: ID! reason: String, allowResubmission: Boolean!): String!
        dropCourse(studentId: ID!, courseId: ID!): Student!
        changeCourseState(courseId: ID!): Course!
        gradeCourse(gradeCourseInput:GradeCourseInputData): Boolean!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
