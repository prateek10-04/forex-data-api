const express=require('express')
const router=new express.Router()
const User=require('../models/users')
const auth=require('../middleware/auth')
const Redis=require('ioredis')


let cacheEntry
const redis = new Redis({
    'port':6379,
    'host':'127.0.0.1'
})

router.post('/users/signup',async (req,res)=>{
    const user=new User(req.body)
    try{
        await user.save()
        const token=await user.generateAuthToken()
        res.send({user:await user.getData(),token})

    }catch(error){
        res.status(500).send()
    }
})

router.post('/users/login',async (req,res)=>{
    try{
        const user=await User.findUser(req.body.email,req.body.password)

       

        const token=await user.generateAuthToken()
        res.send({user:await user.getData(),token:token})

    }catch(error){
        res.status(500).send(error.message)
    }
})

router.get('/users/me',auth,async (req,res)=>{
    try{
        cacheEntry = await redis.get(`user:${req.user._id}`)

        if(cacheEntry){
            const user=JSON.parse(cacheEntry)
            const userData=new User(user)
            return res.send({user:await userData.getData(),source:'cache'})
        }
        await redis.set(`user:${req.user._id}`,JSON.stringify(req.user),'EX',3600)
        res.send({user: await req.user.getData(),source:'API'})
    }catch(error){
        res.status(500).send()
    }
})

router.delete('/users/delete/me',auth,async (req,res)=>{
    const user=await req.user
    try{
        const response =await User.deleteOne({_id:user._id})
        console.log(response)
        if (response.deletedCount === 0) {
            return res.status(404).send('User not found')
        }
        res.send('User deleted successfully')
    }catch(error){
        res.status(500).send()
    }
    

})

router.patch('/users/update/me',auth,async (req,res)=>{
    const updates=Object.keys(req.body)
    const valid=['name','email','password']
    const isValid=updates.every((update)=> valid.includes(update))

    
    try{
        if (!isValid){
            return res.status(404).send('Invalid Updates')
        }
        const user=await req.user
        updates.forEach((update)=> user[update]=req.body[update])
        await user.save()

        await redis.del(`user:${req.user._id}`)
        res.send({message:'User details updated!',user:await user.getData()})

    }catch(error){
        res.status(500).send(error.message)
    }

})

router.post('/users/logout/me',auth,async (req,res)=>{
    try{
        req.user.tokens=req.user.tokens.filter((token)=>{
            return token.token !== req.token
        })

        await req.user.save()
        res.send('User logged out!')
    }catch(error){
        res.status.send(error.message)
    }
})



module.exports=router