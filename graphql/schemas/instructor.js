const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Student {
        _id: ID!
        firstName: String!
        lastName: String!
        email: String
        password: String,
        dob: String
        coursesEnrolled: [ID]
        profilePicture:String
        blockedContacts:[String]
        lastLogin:String
        completedCourses:[ID]
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

    type Resource {
        resourceName:String!
        resource:String!
    }

    type Course {
        _id: ID!
        courseName: String!
        studentCapacity: Int
        language: String
        courseActive: Boolean!
        enrollmentStartDate: String
        enrollmentEndDate: String
        courseStartDate: String
        courseEndDate: String
        courseDropDeadline: String
        syllabus: String
        prerequisites: [Course]
        studentsEnrollRequests:[Request]
        lessons: [Lesson]
        students: [ID!]!
        courseImage: String
        regularOfficeHours: [OfficeHourDay]
        irregularOfficeHours: [OfficeHourDate]
        createdAt: String
        resources:[Resource]
        cost:Float
        couponCode:String
        couponExpiration:String
    }

    type Slide {
        slideContent: String
        audio: String
        video: String
    }

    type Lesson {
        _id: ID!
        course: ID!
        published: Boolean!
        lessonName: String!
        availableOnDate: String
        lessonSlides: [Slide!]!
        createdAt: String
    }
    
    type OfficeHourDay {
        day:String!
        startTime: String!
        endTime: String!
        timezoneRegion:String!
    }

    type OfficeHourDate {
        date:String!
        startTime: String!
        endTime: String!
        timezoneRegion:String!
    }

    type Doc {
        document: String!
        documentType: String!
    }

    type Instructor {
        _id: ID!
        firstName: String!
        lastName: String!
        email: String!
        password: String,
        dob: String
        language:String!
        coursesTeaching:[Course]
        profilePicture:String
        blockedContacts:[String]
        lastLogin:String
        documents:[Doc]
        isAccountSuspended:Boolean!
        isAccountApproved:Boolean!
    }

    type RootQuery {
        instructor: Instructor!
        instructors: [Instructor]!
    }

    schema {
        query: RootQuery
    }
`);
