"use strict";

var db = require('./db');

var spChema = new db.mongoose.Schema({
  img: {
    type: String,
    require: true
  },
  name: {
    type: String,
    require: true
  },
  noidung: {
    type: String,
    require: false
  },
  price: {
    type: String,
    require: true
  },
  kichthuocmanhinh: {
    type: String,
    require: false
  },
  congnghemanhinh: {
    type: String,
    require: false
  },
  camerasau: {
    type: String,
    require: false
  },
  cameratruoc: {
    type: String,
    require: false
  },
  chip: {
    type: String,
    require: false
  },
  bonho: {
    type: String,
    require: false
  },
  pin: {
    type: String,
    require: false
  },
  hedieuhanh: {
    type: String,
    require: false
  },
  dophangiai: {
    type: String,
    require: false
  },
  tinhnangmanhinh: {
    type: String,
    require: false
  },
  GPU: {
    type: String,
    require: false
  },
  quayvideo: {
    type: String,
    require: false
  },
  tinhnangcamera: {
    type: String,
    require: false
  },
  kichthuoc: {
    type: String,
    require: false
  },
  trongluong: {
    type: String,
    require: false
  },
  congnghesac: {
    type: String,
    require: false
  },
  congsac: {
    type: String,
    require: false
  },
  kieumanhinh: {
    type: String,
    require: false
  },
  tinhnagdacbiet: {
    type: String,
    require: false
  },
  loai: {
    type: Number,
    require: false
  },
  dungluong: [{
    type: db.mongoose.Schema.Types.ObjectId,
    ref: 'dungluong'
  }]
}, {
  collection: 'Sanpham'
}); //tạo model

var spModel = db.mongoose.model('spModel', spChema);
module.exports = {
  spModel: spModel
};