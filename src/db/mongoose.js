const mongoose=require('mongoose')

mongoose.connect('mongodb+srv://taskapp:Prateek10@cluster0.ssftsf9.mongodb.net/forex-Data?retryWrites=true',{useNewUrlParser:true,useUnifiedTopology: true})
.then(()=>{
    console.log('Connected to database')

})