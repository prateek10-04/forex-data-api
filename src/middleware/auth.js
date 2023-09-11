const jwt=require('jsonwebtoken')
const User=require('../models/users')

const auth=async (req,res,next)=>{
    try{
        
        const token=req.header('Authorization').replace('Bearer ','')
        const decoded=jwt.verify(token,'secretToken')
        
        const user=await User.findOne({_id:decoded._id,'tokens.token': token})
        if(!user){
            throw new Error()
        }
        req.token=token
        req.user=user


    }catch(error){
        res.status(401).send({error:'Please authenticate'})
    }
    next()
}

module.exports=auth