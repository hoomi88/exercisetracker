const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const TIMEOUT = 10000;

let mongoose = require("mongoose");
const { reduce } = require('bluebird');

mongoose.Promise = require('bluebird');
const { Schema } = mongoose;

//mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.set('useFindAndModify', false);

const exerciseSessionSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
});

const userSchema = new Schema({
  username: {type: String, required: true},
  log: [exerciseSessionSchema]
});


let Session = mongoose.model('Session', exerciseSessionSchema);
let User = mongoose.model('User', userSchema);


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


app.use(express.urlencoded({ extended: false }));



app.post('/api/users', function (req, res) {

  //console.log(req);

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  let myUsername = req.body.username;  
  let newUser = new User({username: myUsername});
  newUser.save((err, savedUser) => {
    if (!err){
      let resObj = {};
      resObj["username"] = savedUser.username;
      resObj["_id"] = savedUser.id;
      res.json(resObj)
    }
  });  
});

app.post('/api/users/:_id/exercises', function (req, res, next) {
  
  let newSession = new Session({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })

  if (newSession.date === ''){
    newSession.date = new Date().toISOString().substring(0,10);
  }
  
  User.findByIdAndUpdate(
    req.body[":_id"],
    {$push: {log: newSession}},
    {new: true},
    (err, updatedUser) => {
      console.log(updatedUser);
      let resObj = {
        _id: updatedUser._id,
        username: updatedUser.username,
        date: new Date(newSession.date).toDateString(),
        duration: newSession.duration,
        description: newSession.description
      };
      res.json(resObj);
    }
  );
});

//610eaab254dc35023d66f5c8
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
app.get("/api/users/", function (req, res) {
  User.find({},(err, arrayOfUsers) => {
    if (!err){
      res.json(arrayOfUsers);
    }
  })  
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//&{from?}&{to?}&{limit?}
app.get("/api/users/:_id/logs", function (req, res) {
  //http://localhost:8080/api/users/6110425836925e58f48faa0a/logs?&limit=2&from=2009-01-01&to=2011-01-01
  console.log(req.query)
  User.findById(req.params._id,(err, result) =>{
    if (!err) {
      

      if (req.query.from || req.query.to){
        let fromDate = new Date(0)
        let toDate = new Date()
        if (req.query.from){
          fromDate = new Date(req.query.from);
        }
        if (req.query.to){
          toDate = new Date(req.query.to);
        }
        fromDate = fromDate.getTime();
        toDate = toDate.getTime();
        result.log = result.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()
          return sessionDate >= fromDate && sessionDate <= toDate
        });

      }

      if (req.query.limit){
        result.log = result.log.slice(0, req.query.limit);
      }

      let resObj = {
        _id: result._id,
        username: result.username,
        count: result.log.length,
        log: result.log
      };
      res.json(resObj);      
    }
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
