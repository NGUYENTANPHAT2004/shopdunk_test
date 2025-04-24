const mongoose = require('mongoose')
const uri = 'mongodb+srv://phat1z:123@ez88.akrq2.mongodb.net/datn?retryWrites=true&w=majority&appName=ez88'

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000
}

mongoose.connect(uri, options)
  .then(() => {
    console.log('Successfully connected to MongoDB.')
  })
  .catch(err => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err)
})

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected')
})

module.exports = { mongoose }