const express = require('express');
const app = express();
const port = 3001;


const db_config = require(__dirname + '/asset/js/sql_login.js');
const conn = db_config.init();
db_config.connect(conn);

app.use(express.static(__dirname + '/asset'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + "/asset/html/login.html");
});

app.get('/signup', (req, res) => {
  res.sendFile(__dirname + "/asset/html/signup.html");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
