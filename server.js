require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const auth = require('./src/routes/authRoutes')
const userRoutes = require('./src/routes/userRoutes')
const errorHandler = require('./src/middleware/errorMiddleware')


// express app
const app = express()
app.use(cors());

//middleware
app.use(express.json())

app.use((req, res, next) => {
    console.log(req.path, req.method)
    next()
})

//routes
app.use('/api/auth', auth)
app.use('/api/user', userRoutes)
app.use('/api/translations', require('./src/routes/translationRoutes'))
app.use('/api/bulk', require('./src/routes/bulkOperations'))

app.use(errorHandler);
//connect to db

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
    .then(() => {
        //listen for requests
        app.listen(process.env.PORT, () => {
            console.log('Connected to the db & Server is running on port', process.env.PORT)
        })
    })
    .catch((error) => {
        console.log(error)
    })
    