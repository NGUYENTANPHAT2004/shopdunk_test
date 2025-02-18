"use strict";

var db = require('./db');

var dungluongSchema = new db.mongoose.Schema({
  name: {
    type: String
  },
  mausac: [{
    type: db.mongoose.Schema.Types.ObjectId,
    ref: 'mausac'
  }],
  idloaisp: {
    type: db.mongoose.Schema.Types.ObjectId,
    ref: 'loaisp'
  }
});
var dungluong = db.mongoose.model('dungluong', dungluongSchema);
module.exports = {
  dungluong: dungluong
};