const {mergeResolvers} = require('merge-graphql-schemas') 
const adminResolver = require('./admin/accounts')
const studentResolver = require('./student/student')
const instructorResolver = require('./instructor/instructor')
const courseResolver = require('./course/course')
const lessonResolver = require('./lesson/lesson')
const testResolver = require('./test/test')
const passwordResetResolver = require('./passwordReset/passwordReset')
const categoryResolver = require('./category/category')
const questionResolver = require('./question/question')
const notificationResolver = require('./notification/notification')
const authenticationResolver = require('./authentication/authentication')
const configurationResolver = require('./configuration/configuration')
const transactionResolver = require('./transactions/transactions')

const resolvers = [
    adminResolver,
    studentResolver,
    instructorResolver,
    courseResolver,
    lessonResolver,
    testResolver,
    passwordResetResolver,
    categoryResolver,
    questionResolver,
    notificationResolver,
    authenticationResolver,
    configurationResolver,
    transactionResolver,
]

module.exports = mergeResolvers(resolvers)