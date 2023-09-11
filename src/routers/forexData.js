const express=require('express')
const router=new express.Router()
const axios=require('axios')
const list='USDINRAEDEUR'
const Redis=require('ioredis')
const intrestedCurrencies = require('../../config')
const history=require('../models/historicalData')
const cron=require('node-cron')
const auth=require('../middleware/auth')
let cacheEntry


const redis = new Redis({
    'port':6379,
    'host':'127.0.0.1'
})




router.get('/rates',auth,async (req,res)=>{
    try{
        cacheEntry= await redis.get(`liveRates`)
        
        if(cacheEntry){
            cacheEntry=JSON.parse(cacheEntry)
            const interestedRates = {}
            for (const currency of intrestedCurrencies) {
            if (cacheEntry[currency]) {
            interestedRates[currency] = cacheEntry[currency]
                }
            else{
                return res.status(404).send(`Currency ${currency} not found`)
            }
        }
            
            return res.send({baseCurrency:'EUR',rates:interestedRates,source:'cache'})
        }

        const response=await axios.get('http://api.exchangeratesapi.io/v1/latest?access_key=36239b21cfda0fc7b812d1b48abb7bd3')
        await redis.set(`liveRates`,JSON.stringify(response.data.rates),'EX',3600)
        const allRates = response.data.rates

        const interestedRates = {}

        for (const currency of intrestedCurrencies) {
        if (allRates[currency]) {
            interestedRates[currency] = allRates[currency]
            }
            else{
                return res.status(404).send(`Currency ${currency} not found`)
            }
        }
        return res.status(200).json({baseCurrency:'EUR',rates:interestedRates,source:'API'})
    }catch(error){
        res.status(500).send()
    }
})


router.get('/convert/live',auth,async (req,res)=>{
    try{

        const {fromCurrency,toCurrency,amount}=req.body
        if(!fromCurrency){
            return res.status(400).send('Please provide source Currency')
        }
        if(!toCurrency){
            return res.status(400).send('Please provide target Currency')
        }


        cacheEntry = await redis.get('convert')
        
        if(cacheEntry){
            cacheEntry=JSON.parse(cacheEntry)
            if (!cacheEntry[fromCurrency] || !cacheEntry[toCurrency]){
                return res.status(404).send('Invalid currency name')
            }
    
            const convertedAmount = amount*((cacheEntry[toCurrency])/cacheEntry[fromCurrency])
            res.status(200).send({convertedAmount,source:'cache'})
        }
        
        const response=await axios.get('http://api.exchangeratesapi.io/v1/latest?access_key=36239b21cfda0fc7b812d1b48abb7bd3')
        redis.set('convert',JSON.stringify(response.data.rates),'EX',3600)
        const allRates=response.data.rates

        

        if (!allRates[fromCurrency] || !allRates[toCurrency]){
            return res.status(404).send('Invalid currency name')
        }

        const convertedAmount = amount*((allRates[toCurrency])/allRates[fromCurrency])
        res.status(200).send({convertedAmount,source:'API'})

    }catch(error){
        res.status(500).send()
    }
})

cron.schedule('0 0 * * *',async()=>{
    try{
        const presentDate= new Date().toJSON().slice(0, 10)
    const response= await axios.get(`http://api.exchangeratesapi.io/v1/${presentDate}?access_key=36239b21cfda0fc7b812d1b48abb7bd3`)
    const historicalRate=response.data.rates
    
    const data = new history({
        date:presentDate,
        rate:historicalRate
    })

    await data.save()
    }
    catch(error){
        console.error(error.message)
    }


})

router.post('/historical',auth,async (req,res)=>{
  
        try {
          const { from, to, amount } = req.body
          const endDate = new Date().toJSON().slice(0, 10)
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - 0)
          const startDateString = startDate.toJSON().slice(0, 10)
      
          const dateRange = []
          let currentDate = new Date(startDateString)
      
          while (currentDate <= new Date(endDate)) {
            dateRange.push(currentDate.toJSON().slice(0, 10))
            currentDate.setDate(currentDate.getDate() + 1)
          }
      
          const conversionPromises = dateRange.map(async (date) => {
            const data = await history.findOne({ date })
      
            if (!data || !data.rate[from] || !data.rate[to]) {
              return Promise.reject(new Error('Invalid currency name'))
            }
      
            const convertedAmount = amount * (data.rate[to] / data.rate[from])
            return { date, convertedAmount }
          })
      
          const conversionResults = await Promise.all(conversionPromises)
      
          if (conversionResults.some((result) => result instanceof Error)) {
           
            return res.status(400).json({ error: 'Invalid currency name' })
          }
      
          
          res.status(200).json(conversionResults)
        } catch (error) {
          res.status(500).json()
        }
      
      
})



module.exports=router