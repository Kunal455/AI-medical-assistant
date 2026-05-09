const jwt = require("jsonwebtoken");

const authMiddleware = async(req,res,next)=>{

    try{

        const token = req.cookies.token;

        if(!token){

            return res.status(401).json({
                message:"No token found"
            });
        }

        const decoded = jwt.verify(

            token,

            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    }catch(err){

        return res.status(401).json({
            message:"Invalid token"
        });
    }
};

module.exports = authMiddleware;