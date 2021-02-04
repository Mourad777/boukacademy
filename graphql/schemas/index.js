const {mergeTypes} = require('merge-graphql-schemas') 

const studentType = require('./student')
const instructorType = require('./instructor')
const courseType = require('./course')
const lessonType = require('./lesson')
const testType = require('./test')
const passwordResetType = require('./passwordReset')
const categoryType = require('./category')
const questionType = require('./question')
const notificationType = require('./notification')
const authenticationType = require('./authentication')
const configurationType = require('./configuration')

const types = [
    studentType,
    instructorType,
    courseType,
    lessonType,
    testType,
    passwordResetType,
    categoryType,
    questionType,
    notificationType,
    authenticationType,
    configurationType,
]

module.exports = mergeTypes(types, {all:true})