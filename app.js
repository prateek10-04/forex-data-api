const express=require('express')
const forexData=require('./src/routers/forexData')
const userRouter=require('./src/routers/users')
require('./src/db/mongoose')
const axios=require('axios')

const rateLimit=require('express-rate-limit')

const app=express()

app.use(express.json())

const limiter=rateLimit({
    max:100,
    windowMs:60*60*1000,
    message:'Rate limit reached! Please try after an hour.'
})

app.use('/',limiter)

app.use(forexData)
app.use(userRouter)



  

app.listen(3000,()=>{
    console.log('Server running on port '+3000)
})



