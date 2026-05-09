const express = require("express");

const Router = express.Router();

const {

    userRegister,

    userLogin,

    userLogout,

    getProfile

} = require("../Controller/UserController");

const authMiddleware = require(
    "../Middleware/AuthMiddleware"
);



Router.post("/signup", userRegister);

Router.post("/login", userLogin);

Router.get("/logout", userLogout);

Router.get(

    "/profile",

    authMiddleware,

    getProfile
);



module.exports = Router;