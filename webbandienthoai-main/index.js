/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express')
var path = require('path')
var session = require('express-session')
var methodOverride = require('method-override')
var bodyParser = require('body-parser')
const MongoStore = require('connect-mongo')
var db = require('./models/db')
const userroutes = require('./routes/UserRouter')
const sanphamroutes = require('./routes/SanPhamRoutes')
const loaisanphamroutes = require('./routes/LoaiSanPhamRoutes')
const dungluongroutes = require('./routes/DungLuongRoutes')
const categoryrouter = require('./routes/CategoryRoutes.js')
const blogroutes = require('./routes/BlogRoutes')
const mausacriengroutes = require('./routes/MauSacRiengRoutes')
const magiamgiaroutes = require('./routes/MaGiamGiaRoutes')
const danhgiaroutes = require('./routes/DanhGiaRoutes')
const hoadonrouter = require('./routes/HoaDonRoutes')
const stockrouter = require('./routes/stockrouter')
const authroutes = require("./routes/Authroutes.js")
const adminnotifi = require('./socket/adminnotifi')
const http = require("http")
const { initSocket } = require('./config/socket');
const cors = require('cors')
const uri ='mongodb+srv://baongocxink03:KD3qvAqFfpKC1uzX@cluster0.aocmw.mongodb.net/webbandienthoai?retryWrites=true&w=majority'


const mongoStoreOptions = {
  mongooseConnection: db.mongoose.connection,
  mongoUrl: uri,
  collection: 'sessions'
}
const app = express()
const server = http.createServer(app)
const io = initSocket(server)

app.use(express.json())
app.use(cors())
console.log("Local changes & Remote changes")
app.use(
  session({
    secret: 'adscascd8saa8sdv87ds78v6dsv87asvdasv8',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create(mongoStoreOptions)
    // ,cookie: { secure: true }
  })
)
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, '/public')))
app.use(express.static(path.join(__dirname, '/uploads')))
app.use('/', userroutes)
app.use('/', sanphamroutes)
app.use('/', loaisanphamroutes)
app.use('/', dungluongroutes)
app.use('/', categoryrouter)
app.use('/', blogroutes)
app.use('/', mausacriengroutes)
app.use('/', danhgiaroutes)
app.use('/', magiamgiaroutes)
app.use('/', authroutes)
app.use('/', hoadonrouter)
app.use('/', stockrouter)

// Setup socket handlers
adminnotifi(io)

// Use server.listen instead of app.listen
server.listen(3005, () => {
  console.log('Server is running on port 3005')
  console.log(__dirname)
})

module.exports = { io, app, server }
