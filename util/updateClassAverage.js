const Result = require('../models/result')

const updateClassAverage = async (test) => {
    const allResults = await Result.find({
        test: test._id,
        graded: true,
        closed: true,
        isExcused:false,
      });
      const gradeSum = allResults.reduce((prev, curr) => prev + curr.grade, 0);
      const classAverage = parseFloat(
        (gradeSum / allResults.length).toFixed(2)
      );
      return classAverage
}

exports.updateClassAverage = updateClassAverage;

//class average must be updated in the following curcumstances:
//1- grading a test
//2- excusing a test that has a grade
//3- reseting a test