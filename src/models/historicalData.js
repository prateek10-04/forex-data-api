const mongoose=require('mongoose')
const historicalDataSchema=new mongoose.Schema({
  date: { type: Date, required: true,unique:true },
 
  rate: { type: Object},
})

const history=mongoose.model('historicalData',historicalDataSchema)

module.exports=history