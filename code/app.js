const express = require('express');
const { SocketAddress } = require('net');
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
//socket.io 연결을 위한 경로 설정
app.use('/dist/', express.static(path.join(__dirname, 'node_modules/socket.io/client-dist')));
//로그인, 회원가입시 기입된 정보를 post로 받기 위한 설정
//body-parser은 deprecated됨
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
//쿠키 사용을 위한 설정
const cookieParser = require(__dirname + '/asset/js/cookie.js');

app.get('/', (req, res) => {
  if (cookieParser.Check(req)) {
    res.sendFile(__dirname + "/asset/html/makecharacter.html");
  }
  else {
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
    if (rows.length !== 0) {
      const temporary_key = rows[0].temporary_key;
      //비밀번호 암호화를 위해 module.export를 통해 함수 호출
      const hash_password = db_config.CreateHash(password, temporary_key);
      //비밀번호가 맞다면 쿠키 생성
      if (hash_password === rows[0].password) {
        cookieParser.Make(id, res);
        res.write("<script>alert('welcome!')</script>");
      }
      else {
        res.write("<script>alert('There is no account. Please check your id and password.')</script>");
      }
    }
    else {
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

//생성된 캐릭터를 데이터 베이스에 저장
app.post('/makecharacter', (req, res) => {
  const information = req.body;
  const id = information.id;
  const id_character_json = information.character_json;
  console.log(id_character_json.length);

  //id 별로 캐릭터 저장
  connection.query(`select * from id_character where id = '${id}'`, function (err, rows, fields) {
    if (err) console.log(err);
    //캐릭터 변경
    if (rows.length !== 0) {
      connection.query(`update id_character set character_json = '${id_character_json}' where id = '${id}'`, function (err, rows, cols) {
        if (err) throw err;
        console.log("database change ok");
      });
    }
    //캐릭터 생성
    else {
      let obj = {};
      obj.id = id;
      obj.character_json = id_character_json;

      connection.query('insert into id_character set ?', obj, function (err, rows, cols) {
        if (err) throw err;
        console.log("database insertion ok= %j", obj);
      });
    }
  });
  //생성된 캐릭터를 통해 world로 이동
  res.redirect("/world");
});

//world로의 이동
app.get('/world', (req, res) => {
  if (cookieParser.Check(req)) {
    res.sendFile(__dirname + "/asset/html/world.html");
  }
  else {
    res.sendFile(__dirname + "/asset/html/login.html");
  }
});

const server = app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});

//캐릭터 데이터 module 가져옴
const character_data = require(__dirname + '/asset/js/character_data.js');
//접속 중인 캐릭터를 담기 위한 배열 및 map
let id_container = [];
let character_container = {};

//socket.io 설정
const io = require('socket.io')(server);

io.on("connection", (socket) => {
  //접속에 대한 구현, id 또한 저장
  socket.on('NewUserConnect', function (id) {
    socket.id = id;
    const message = socket.id + '님이 접속했습니다.';

    io.emit("updateMessage", {
      name: 'SERVER',
      message: message
    });

    //접속 계정 명단에 id를 기입하고, character의 정보 또한 map에 담는다.
    let user_character = character_data.MakeCharacter();
    user_character.id = socket.id;

    //접속한 계정의 캐릭터를 알기 위한 sql문 호출
    connection.query(`select * from id_character where id = '${id}'`, function (err, rows, fields) {
      if (err) console.log(err);
      //조회가 되면 캐릭터 담기
      if (rows.length !== 0) {
        user_character.character_json = rows[0].character_json;
        //접속중인 유저 명단 작성
        character_container[id] = user_character;
        id_container.push(id);

        //새로 접속한 사람을 위해 online한 유저를 체크하는 메세지를 보낸다.
        for (let id_container_index in id_container) {
          const user_id = id_container[id_container_index]
          io.emit("OnlineUserCheck", character_container[user_id]);
        }
      }
      else {
        res.write("<script>alert('There is no character you make. Please check your character')</script>");
        res.write("<script>window.location=\"/\"</script>");
      }
    });
  });
  //퇴장에 대한 구현
  socket.on('disconnect', function () {
    //접속 유저가 disconnect할 때의 조건 추가
    if (character_container[socket.id] !== undefined) {
      var message = socket.id + '님이 퇴장했습니다';

      socket.broadcast.emit('updateMessage', {
        name: 'SERVER',
        message: message
      });

      //disconnect한 유저의 캐릭터를 없애기 위해서 메세지를 보낸다.
      socket.broadcast.emit('OfflineUserCheck', character_container[socket.id]);
      //disconnect 될시에 접속 명단에서 제거하고, character의 정보를 map에서 뺴냄.
      for (let id_container_index in id_container) {
        if (id_container[id_container_index] == socket.id) {
          id_container.splice(id_container_index, 1);
          break;
        }
      }
      delete character_container[socket.id];
    }
  });
  //메세지 전송에 대한 구현
  socket.on('sendMessage', function (data) {
    data.id = socket.id;
    io.sockets.emit('updateMessage', data);
  });
  //각 유저들의 캐릭터 움직임을 최신화하기 위한 구현
  socket.on('CharacterPosition', function (data) {
    const id = data.id;
    const character = character_container[id];
    character.x = data.x;
    character.y = data.y;
    character.z = data.z;
    character.direction = data.direction;
    character.walk_status = data.walk_status;

    socket.broadcast.emit('UpdateCharacter', character);
  });

});
