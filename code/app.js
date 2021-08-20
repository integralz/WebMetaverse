const express = require('express');
const app = express();
const port = 3000;

//MYSQL에 접속하기 위한 설정, 비밀번호를 노출하지 않기 위해 module.export로 계정 접속
const db_config = require(__dirname + '/asset/js/sql_login.js');
const connection = db_config.Init();
db_config.Connect(connection);

//asset 하위 항목들을 사용하기 위한 설정
app.use(express.static(__dirname + '/asset'));
//three js 연결을 위한 경로 설정
const path = require('path');
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')));
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')));
//로그인, 회원가입시 기입된 정보를 post로 받기 위한 설정
//body-parser은 deprecated됨
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
//쿠키 사용을 위한 설정
const cookieParser = require(__dirname + '/asset/js/cookie.js');

app.get('/', (req, res) => {
  if(cookieParser.Check(req)){
    res.sendFile(__dirname + "/asset/html/world.html");
  }
  else{
    res.sendFile(__dirname + "/asset/html/login.html");
  }
});

//로그인을 위한 post
app.post('/', (req, res) => {
  const information = req.body;
  const id = information.id;
  const password = information.password;

  connection.query(`select * from id_password where id = '${id}'`, function (err, rows, fields) {
    if (err) console.log(err);
    //아이디가 조회가 되면 비밀번혹사 맞는지 확인 진행
    if(rows.length !== 0){
      const temporary_key = rows[0].temporary_key;
      //비밀번호 암호화를 위해 module.export를 통해 함수 호출
      const hash_password = db_config.CreateHash(password, temporary_key);
      //비밀번호가 맞다면 쿠키 생성
      if(hash_password === rows[0].password){
        cookieParser.Make(id, res);
        res.write("<script>alert('welcome!')</script>");
      }
      else{
        res.write("<script>alert('There is no account. Please check your id and password.')</script>");
      }
    }
    else{
      res.write("<script>alert('There is no account. Please check your id and password.')</script>");
    }
    res.write("<script>window.location=\"/\"</script>");
  });
});

app.get('/signup', (req, res) => {
  res.sendFile(__dirname + "/asset/html/signup.html");
});

//회원가입을 위한 post
app.post('/signup', (req, res) => {
  const information = req.body;
  const id = information.id;
  const password = information.password;
  const temporary_key = Math.round(new Date().valueOf() * Math.random()) + "";
  //비밀번호 암호화를 위해 module.export를 통해 함수 호출
  const hash_password = db_config.CreateHash(password, temporary_key);

  connection.query(`select * from id_password where id = '${id}'`, function (err, rows, fields) {
    if (err) console.log(err);
    //중복된 아이디가 존재하거나, 계정 양식이 다를 경우 재기입 
    if (rows.length !== 0 || id === '' || password == '') {
      if (rows.length !== 0) {
        res.write("<script>alert('There is a duplicated ID already')</script>");
      }
      else if (id === '') {
        res.write("<script>alert('please input the id')</script>");
      }
      else if (password === '') {
        res.write("<script>alert('please input the password')</script>");
      }
      res.write("<script>window.location=\"/signup\"</script>");
    }
    //계정 생성이 가능하면 데이터베이스에 계정 생성
    else {
      let obj = {};
      obj.id = id;
      obj.password = hash_password;
      obj.temporary_key = temporary_key;
      connection.query('insert into id_password set ?', obj, function (err, rows, cols) {
        if (err) throw err;
        console.log("database insertion ok= %j", obj);
      });

      res.redirect("/");
    }
  });

});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
