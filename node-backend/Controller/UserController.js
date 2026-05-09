const User = require("../Model/User");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");



// ================= SIGNUP =================

const userRegister = async(req,res)=>{

    try{

        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });

        if(existingUser){

            return res.status(400).json({
                message:"User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password,10);

        const user = new User({

            name,

            email,

            password: hashedPassword
        });

        await user.save();

        res.status(201).json({

            message:"User registered successfully"
        });

    } catch (err) {
        console.log(err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: "Server Error: " + err.message });
    }
};



// ================= LOGIN =================

const userLogin = async(req,res)=>{

    try{

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if(!user){

            return res.status(400).json({
                message:"User not found"
            });
        }

        const isMatch = await bcrypt.compare(

            password,

            user.password
        );

        if(!isMatch){

            return res.status(400).json({
                message:"Invalid credentials"
            });
        }

        const token = jwt.sign(

            {
                id:user._id
            },

            process.env.JWT_SECRET,

            {
                expiresIn:"7d"
            }
        );

        res.cookie(

            "token",

            token,

            {
                httpOnly:true,

                secure:true,

                sameSite:"lax"
            }
        );

        res.json({

            message:"Login successful",

            user:{
                id:user._id,
                name:user.name,
                email:user.email
            }
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Server Error" });
    }
};



// ================= LOGOUT =================

const userLogout = async(req,res)=>{

    res.clearCookie("token");

    res.json({
        message:"Logout successful"
    });
};



// ================= PROFILE =================

const getProfile = async(req,res)=>{

    try{

        const user = await User.findById(req.user.id)
        .select("-password");

        res.json(user);

    }catch(err){

        console.log(err);

        res.status(500).json({
            error:"Server Error"
        });
    }
};



module.exports = {

    userRegister,

    userLogin,

    userLogout,

    getProfile
};