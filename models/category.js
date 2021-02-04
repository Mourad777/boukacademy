const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required:true
  },
  modules: [
    {
      moduleName: {
        type: String,
        required: false,
      },
      tests: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Test',
          required:false
        }
      ],
      assignments: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Test',
          required:false
        }
      ],
      lessons: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Lesson',
          required:false
        }
      ],
      // questions: [
      //   {
      //     type: Schema.Types.ObjectId,
      //     ref: 'Question',
      //     required:false
      //   }
      // ],
      _id: {
        type: Schema.Types.ObjectId,
        required: false,
      },
      subjects: [
        {
          subjectName:{
            type:String,
            required:false,
          },
          tests: [
            {
              type: Schema.Types.ObjectId,
              ref: 'Test',
              required:false
            }
          ],
          assignments: [
            {
              type: Schema.Types.ObjectId,
              ref: 'Test',
              required:false
            }
          ],
          lessons: [
            {
              type: Schema.Types.ObjectId,
              ref: 'Lesson',
              required:false
            }
          ],
          // questions: [
          //   {
          //     type: Schema.Types.ObjectId,
          //     ref: 'Question',
          //     required:false
          //   }
          // ],
          _id: {
            type: Schema.Types.ObjectId,
            required: false,
          },
          topics:[
            {
              topicName:{
                type:String,
                required:false,
              },
              tests: [
                {
                  type: Schema.Types.ObjectId,
                  ref: 'Test',
                  required:false
                }
              ],
              assignments: [
                {
                  type: Schema.Types.ObjectId,
                  ref: 'Test',
                  required:false
                }
              ],
              lessons: [
                {
                  type: Schema.Types.ObjectId,
                  ref: 'Lesson',
                  required:false
                }
              ],
              // questions: [
              //   {
              //     type: Schema.Types.ObjectId,
              //     ref: 'Question',
              //     required:false
              //   }
              // ],
              _id: {
                type: Schema.Types.ObjectId,
                required: false,
              },
            }
          ],
        }
      ],
    }
  ],
});

module.exports = mongoose.model('Category', categorySchema);