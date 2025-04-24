"use strict";

var db = require('./db');

var mausacSchema = new db.mongoose.Schema({
  name: {
    type: String
  },
  dungluong: {
    type: db.mongoose.Schema.Types.ObjectId,
    ref: 'dungluong'
  },
  chitiet: [{
    name: {
      type: String
    },
    price: {
      type: String
    }
  }]
});
var mausac = db.mongoose.model('mausac', mausacSchema);
module.exports = {
  mausac: mausac
};