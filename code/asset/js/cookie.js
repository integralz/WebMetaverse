const express = require('express');
const app = express();

const cookieParser = require('cookie-parser');
app.use(cookieParser());

module.exports = {
    //쿠키 만들기, 1시간만 유지
    Make: function (id, res) {
        res.cookie('id', id,{
            maxAge: 3600000
        });
    },
    //쿠키가 존재하는지 여부 확인
    Check: function(req) {
        if(req.headers.cookie){
            return true;
        }
        return false;
    }
}