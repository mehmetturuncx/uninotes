import { Router } from "express";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import  jwt  from "jsonwebtoken";
import { db } from "../prisma/db";
import bcrypt from "bcryptjs";

const router = Router();
 

router.post('/register', async (req,res)=>{
    const validation = registerSchema.safeParse(req);

    if(!validation.success) {
        return res.status(400).json({
            message: "Your informations are not correct.",
            errors: validation.error.issues
        });
    }

    const invCode = await db.orm.public.InviteCode.where({ code: req.body.inviteCode}).first();

    if(!invCode || invCode.isUsed == true) {
        return res.status(400).json({message: "Invalid or used invitation code."});
    }

    const password = validation.data.body.password;
    const email = validation.data.body.email;

    const isExist = await db.orm.public.User.where({email}).first();
    if(isExist){
        return res.status(400).json({message: "This email is already used."});
    }
 
    const hashedPassword = await bcrypt.hash(password,10);

    const newUser = await db.orm.public.User.create({email,password: hashedPassword});

    await db.orm.public.InviteCode
        .where({id: invCode.id})
        .update({isUsed: true, usedById: newUser.id});
    
    const token = jwt.sign(
            {id: newUser.id,
            email: email},
            process.env.JWT_SECRET || "default_secret",
            {expiresIn: "1h"}
        );
    
    return res.status(201).json({
        token,
        user: {id: newUser.id,email}
    });
});

router.post('/login', async (req,res)=>{
    const validation = loginSchema.safeParse(req);

    if(!validation.success) {
        return res.status(400).json({
            message: "Your informations are not correct.",
            errors: validation.error.issues
        });
    }
    
    const email = validation.data.body.email;
    const password = validation.data.body.password;
    
    const user = await db.orm.public.User.where({email}).first();

    if(!user) {
        return res.status(401).json({message: "Incorrect email or password!"});
    }

    const passCheck = await bcrypt.compare(password,user.password);
    if(!passCheck) {
        return res.status(401).json({message: "Incorrect email or password!"});
    }
    const token = jwt.sign(
            {id: user.id,
            email: email},
            process.env.JWT_SECRET || "default_secret",
            {expiresIn: "1h"}
        );
    
        return res.status(200).json({
            message: "Login succesfull!",
            token
        });
});

export default router;