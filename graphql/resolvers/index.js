const {mergeResolvers} = require('merge-graphql-schemas') 
const adminResolver = require('./admin/accountsResolver')
const studentResolver = require('./student/studentResolver')
const instructorResolver = require('./instructor/instructorResolver')
const courseResolver = require('./course/courseResolver')
const lessonResolver = require('./lesson/lessonResolver')
const testResolver = require('./test/testResolver')
const passwordResetResolver = require('./passwordReset/passwordResetResolver')
const categoryResolver = require('./category/categoryResolver')
const questionResolver = require('./question/questionResolver')
const notificationResolver = require('./notification/notificationResolver')
const authenticationResolver = require('./authentication/authenticationResolver')
const configurationResolver = require('./configuration/configurationResolver')
const transactionResolver = require('./transactions/transactionsResolver')

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