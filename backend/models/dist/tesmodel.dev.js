"use strict";

var db = require('./db');

var test = new db.mongoose.Schema({
  name: {
    type: String
  }
});
var testmodel = db.mongoose.model('test', test);
module.exports = {
  testmodel: testmodel
};