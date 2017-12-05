
// https://vast-peak-63221.herokuapp.com/

var express = require('express') //a minimal and flexible Node.js web application framework that provides a robust set of features to develop web and mobile applications.
, bodyParser = require('body-parser'); //this is a node.js middleware for handling JSON, Raw, Text and URL encoded form data.

var http = require('http');
var request = require('request');

const path = require('path')

var fs = require('fs'); //to read files

// to format dates
var moment = require('moment');

//nodejs server online port
const PORT = process.env.PORT || 5000;

//Chatbot facebook page, access token
const FB_PAGE_ACCESS_TOKEN = 'EAAFLoV6ANvIBADadfOI0WWJ0ZBSd3cAO5Vm5GCpDYrjw4MPKu8OIh5tyv9hwHzoATCQGdM2z2xck4Mmg3kW4V8yzGQVvLCULnNC5nkGn9kLZBrQJZCPGPYZAWAFBlZB0FqBgEUYC7crwJfiQ5MuUEaViBZBzZCDq2TitfieKLuduAZDZD';

//postgres database url
const DATABASE_URL = 'postgres://dcfvnzofeempgk:2c027d6f6788c5b82e4cbb9e9d388254211a61156d1fc1e35312c8c5885958aa@ec2-107-22-167-179.compute-1.amazonaws.com:5432/d3teg1g8u2anm';

// Map of Semesters to the DB Tables
const MAP_SEMESTER_TO_DB = [
  	"table_current_semester_year1",
 	  "table_current_semester_year2",
   	"table_current_semester_year3",
   	"table_current_semester_year4",
   	"table_current_semester_shortsem5",
   	"table_current_semester_shortsem6"
];

// Array to hold the week days
var weekday=new Array(7);
weekday[0]="Monday";
weekday[1]="Tuesday";
weekday[2]="Wednesday";
weekday[3]="Thursday";
weekday[4]="Friday";
weekday[5]="Saturday";
weekday[6]="Sunday";

// Time variables
var query_by_time_current_time, query_by_time_previous_starttime, query_by_time_previous_endtime, table_to_query, query_by_time_date;

// Date variables
var query_by_day_current_day, query_by_day_next_day, query_by_day_previous_day;

var app = express(); //getting an express instance , app?

const { Client } = require('pg');

//database connection information? database instance
const client = new Client({
  connectionString: DATABASE_URL,
  ssl: true,
});

client.connect(); //connecting to the database? client database instance

app.use(bodyParser.json());
app.set('view engine', 'pug');    // set a view engine to show reults in web browser
app.get('/', (req, res) => res.render('pages/index'));

//incomming request, resulting response
app.post('/', function(request, res){

  let action = request.body.result.action; //getting the value of the action of incomming request
  console.log(action);

  /*
      =============================================================================
      Fisrt Instance user connect to the bot with Facbook Platform
      Ask for the role from the user
      =============================================================================
  */

  if(action == 'ACTION_FB_REG_GETTINGSTARTED'){
    var facebookID = request.body.originalRequest.data.sender.id;//the facebook id
    console.log(facebookID);
	  //getFacebookData function was implemented in this js file.
    getFacebookData(facebookID, function(err, data){
      var firstName = data.first_name;  //first name, from the facebook account
      var firstMsg = `Hi ${firstName}`;
      res.send(JSON.stringify({'messages':
                      [{"type": 0, "speech": firstMsg},
                       {"type": 0, "speech": "I'm a Informational Chat bot for Pera Efac"},
                       {'title': 'To get started, tell me your role',
                        'replies': ['Lecturer', 'Instructor', 'Student'], 'type': 2}]}

      ))
    });
  }

  /*
      =============================================================================
      Actions used to Query Timetables using the time and date
      date, time variables are defined GLOBAL to all the time related Actions
      inorder to use in user asks (next and previous) followed by first query
      =============================================================================
  */

  // Need to query the DB using the time for the first time
  if(action == 'ACTION_QUERY_BY_TIME_1'){

    let facebookID = request.body.originalRequest.data.sender.id;           // facebook id
    query_by_time_current_time = request.body.result.parameters.time;       // time user asking
    // date user asking, if not use current date
    if(request.body.result.parameters.date){
      query_by_time_date = moment(request.body.result.parameters.date).format('dddd');
    }else {
      query_by_time_date = moment(new Date()).format('dddd');
    }

    queryByDateAndTime(query_by_time_date, query_by_time_current_time, facebookID, function (err, data) {
      if(!err){
        // Extract values from data and send to user + update our reference values  moment("12:15 AM", ["h:mm A"]).format("HH:mm");
        query_by_time_previous_endtime = data.endtime;
        query_by_time_previous_starttime = data.starttime;

        let starttime = moment(data.starttime, "HH:mm:ss").format('hh:mm A');
        let endtime = moment(data.endtime, "HH:mm:ss").format('hh:mm A');
        var reply = {'messages':
                        [{"type": 0, "speech": 'You have,'},
                         {"type": 0, "speech": `*${data.courseid}* from _${starttime}_ to _${endtime}_`}]}

        res.send(JSON.stringify(reply))
      }else {
        res.send(JSON.stringify({'messages': [{"type": 0, "speech": err}]}))
      }

    });

  }
  // Need to query the DB using the time for the second time (A next followed by 1st query)
  if(action == 'ACTION_QUERY_BY_TIME_NEXT'){

    let facebookID = request.body.originalRequest.data.sender.id;       // facebook id
    console.log(query_by_time_previous_endtime);
    queryByTimeNext(query_by_time_previous_endtime, facebookID, function (err, data) {
      if(!err){
        // Extract values from data and send to user + update our reference values

        query_by_time_previous_endtime = data.endtime;
        query_by_time_previous_starttime = data.starttime;

        let starttime = moment(data.starttime, "HH:mm:ss").format('hh:mm A');
        let endtime = moment(data.endtime, "HH:mm:ss").format('hh:mm A');
        var reply = {'messages':
                        [{"type": 0, "speech": 'You have,'},
                         {"type": 0, "speech": `*${data.courseid}* from _${starttime}_ to _${endtime}_`}]}

        res.send(JSON.stringify(reply))
      }else {
        res.send(JSON.stringify({'messages': [{"type": 0, "speech": err}]}))
      }

    });
  }
  // Need to query the DB using the time for the second time (A previous followed by 1st query)
  if(action == 'ACTION_QUERY_BY_TIME_PREVIOUS'){

    let facebookID = request.body.originalRequest.data.sender.id;       // facebook id
    console.log(query_by_time_previous_starttime);
    queryByTimePrevious(query_by_time_previous_starttime, facebookID, function (err, data) {
      if(!err){
        // Extract values from data and send to user + update our reference values

        query_by_time_previous_endtime = data.endtime;
        query_by_time_previous_starttime = data.starttime;

        let starttime = moment(data.starttime, "HH:mm:ss").format('hh:mm A');
        let endtime = moment(data.endtime, "HH:mm:ss").format('hh:mm A');
        var reply = {'messages':
                        [{"type": 0, "speech": 'You have,'},
                         {"type": 0, "speech": `*${data.courseid}* from _${starttime}_ to _${endtime}_`}]}

        res.send(JSON.stringify(reply))
      }else {
        res.send(JSON.stringify({'messages': [{"type": 0, "speech": err}]}))
      }

    });
  }

  /*
      =============================================================================
      Actions used to Query Timetables using only the day
      Date variables are defined GLOBAL to all the time related Actions
      inorder to use in user asks (next and previous) followed by first query
      =============================================================================
  */

  // Need to query the DB using the day for the first time
  if(action == 'ACTION_QUERY_BY_DAY_1'){

    let facebookID = request.body.originalRequest.data.sender.id;       // facebook id
    query_by_day_current_day = moment(request.body.result.parameters.day).format('dddd');      // day user asking
    console.log('Current day = ' + query_by_day_current_day);
    queryByDay(query_by_day_current_day, facebookID, function (err, data) {
      if(!err){
        // Extract values from data and send to user + update our reference values
        getPreviousDay(query_by_day_current_day, function (data) {
          query_by_day_previous_day = data;
        });
        getNextDay(query_by_day_current_day, function (data) {
          query_by_day_next_day = data;
        });
        res.send(JSON.stringify(data))
      }else {
        res.send(JSON.stringify({'messages': [{"type": 0, "speech": err}]}))
      }

    });
  }
  // Need to query the DB using the day for the second time
  if(action == 'ACTION_QUERY_BY_DAY_NEXT'){

    let facebookID = request.body.originalRequest.data.sender.id;       // facebook id
    query_by_day_current_day = query_by_day_next_day;      // day user asking

    queryByDay(query_by_day_current_day, facebookID, function (err, data) {
      if(!err){
        // Extract values from data and send to user + update our reference values

        getPreviousDay(query_by_day_current_day, function (data) {
          query_by_day_previous_day = data;
        });
        getNextDay(query_by_day_current_day, function (data) {
          query_by_day_next_day = data;
        });

        res.send(JSON.stringify(data))
      }else {
        res.send(JSON.stringify({'messages': [{"type": 0, "speech": err}]}))
      }

    });
  }
  // Need to query the DB using the day for the second time
  if(action == 'ACTION_QUERY_BY_DAY_PREVIOUS'){

    let facebookID = request.body.originalRequest.data.sender.id;       // facebook id
    query_by_day_current_day = query_by_day_previous_day;      // day user asking

    queryByDay(query_by_day_current_day, facebookID, function (err, data) {
      if(!err){
        // Extract values from data and send to user + update our reference values

        getPreviousDay(query_by_day_current_day, function (data) {
          query_by_day_previous_day = data;
        });
        getNextDay(query_by_day_current_day, function (data) {
          query_by_day_next_day = data;
        });
        res.send(JSON.stringify(data))
      }else {
        res.send(JSON.stringify({'messages': [{"type": 0, "speech": err}]}))
      }

    });
  }

});

// set the port your listening
app.listen(PORT);
console.log('listening to port : ' + PORT);

/*
  ==============================================================================

  Functions used to query the DB by Time and Date

  ==============================================================================
*/

//function to query the DB by time  e.g -> What do i have at 2pm ?
function queryByDateAndTime(date, time, facebookId, callback){

  console.log('======= Query By Time And Date =========');
  console.log('time = ' + time + " date = " + date);

  //console.log(facebookID);
  // get eNumber with facebookID
  let query = `Select registrationnumber FROM table_user_map_chatclients WHERE facebookid='${facebookId}';`;

  var error, data;

  client.query(query, function(err, result) {
    if (!err && result.rows.length > 0){
      // If no Error get eNumber and query studentInfotable
      let eNumber = result.rows[0].registrationnumber;
      console.log('eNumber = ' + eNumber);
      query = `Select fieldofstudy, semester FROM table_user_student_feels WHERE registrationnumber='${eNumber}';`;

      client.query(query, function(err, result) {
        if (!err && result.rows.length > 0){
          // If no Error get fieldOfStudy, Semester and query the respective table
          let fieldOfStudy = result.rows[0].fieldofstudy;
          let semester = result.rows[0].semester;
          table_to_query = MAP_SEMESTER_TO_DB[semester-1];   // Since indexing is done from 0
          console.log('table to Query = ' + table_to_query);

          query = `Select * FROM ${table_to_query} WHERE timetabledate='${date}' AND starttime<='${time}' AND endtime>='${time}';`;

          client.query(query, function(err, result) {

            if (!err && result.rows.length > 0){
              // If no Error get courseId, startTime, endTime and send back to the user
              console.log(result.rows);
              data = result.rows[0];
              callback(error, data);

            }else {
              error = err || `You don't have anything at ${time} on ${date}`;
              callback(error, data);
            }
          });

        }else {
          error = err || `Seems like you're not a Efac student`;
          callback(error, data);
        }
      });

    }else {
      error = err || `Looks like you are not registered yet`;
      callback(error, data);
    }

  });
}

//function to query the DB by time(user say next followed by 1st query)  e.g -> What do i have at 2pm ? Next ?
function queryByTimeNext(time, facebookId, callback){

  console.log('======= Query By Time Next =========');

  var error, data;

  query = `Select * FROM ${table_to_query} WHERE timetabledate='${query_by_time_date}' AND starttime>='${time}' order by starttime;`;

  client.query(query, function(err, result) {

    if (!err && result.rows.length > 0){
      // If no Error get courseId, startTime, endTime and send back to the user
      console.log(result.rows);
      data = result.rows[0];
      callback(error, data);

    }else {
      error = err || `That's all for ${query_by_time_date}`;
      callback(error, data);
    }
  });

}

//function to query the DB by time(user say previous followed by 1st query)  e.g -> What do i have at 2pm ? Before it ?
function queryByTimePrevious(time, facebookId, callback){

console.log('======= Query By Time Before =========');

var error, data;

query = `Select * FROM ${table_to_query} WHERE timetabledate='${query_by_time_date}' AND endtime<='${time}' order by endtime DESC;`;

client.query(query, function(err, result) {

  if (!err && result.rows.length > 0){
    // If no Error get courseId, startTime, endTime and send back to the user
    console.log(result.rows);
    data = result.rows[0];
    callback(error, data);

  }else {
    error = err || `You have nothing before that on ${query_by_time_date}`;
    callback(error, data);
  }
});

}


/*
  ==============================================================================

  Functions used to query the DB by Day

  ==============================================================================
*/


//function to query the DB by time  e.g -> What do i have at 2pm ?
function queryByDay(day, facebookId, callback){

  console.log(`======= Query By Day on ${day}=========`);

  //console.log(facebookID);
  // get eNumber with facebookID
  let query = `Select registrationnumber FROM table_user_map_chatclients WHERE facebookid='${facebookId}';`;

  var error;

  var data = {}          // empty Object
  var key = 'messages';
  data[key] = [];       // empty Array, which you can push() values into

  client.query(query, function(err, result) {
    if (!err && result.rows.length > 0){
      // If no Error get eNumber and query studentInfotable
      let eNumber = result.rows[0].registrationnumber;
      console.log('eNumber = ' + eNumber);
      query = `Select fieldofstudy, semester FROM table_user_student_feels WHERE registrationnumber='${eNumber}';`;

      client.query(query, function(err, result) {
        if (!err && result.rows.length > 0){
          // If no Error get fieldOfStudy, Semester and query the respective table
          let fieldOfStudy = result.rows[0].fieldofstudy;
          let semester = result.rows[0].semester;
          table_to_query = MAP_SEMESTER_TO_DB[semester-1];   // Since indexing is done from 0
          console.log('table to Query = ' + table_to_query);
          query = `Select * FROM ${table_to_query} WHERE timetabledate='${day}' ORDER BY starttime;`;

          client.query(query, function(err, result) {

            if (!err && result.rows.length > 0){
              // If no Error get courseId, startTime, endTime and send back to the user

              var firstMsg = {type : 0, speech : `On ${day} you have,`}
              data[key].push(firstMsg)

              for (var i = 0; i < result.rows.length; i++) {

                let cousreID = result.rows[i].courseid;
                // format the time into Am, Pm format
                let startTime = moment(result.rows[i].starttime, "HH:mm:ss").format('hh:mm A');
                let endTime = moment(result.rows[i].endtime, "HH:mm:ss").format('hh:mm A');

                let msg = `*${cousreID}*\n_${startTime}_ - _${endTime}_`;
                var course = {type : 0, speech : msg};

                data[key].push(course);
              }

              callback(error, data);

            }else {
              error = err || `You don't have anything on ${day}`;
              callback(error, data);
            }
          });

        }else {
          error = err || `Seems like you're not a Efac student`;
          callback(error, data);
        }
      });

    }else {
      error = err || `Looks like you are not registered yet`;
      callback(error, data);
    }

  });
}

// Get user information using the facebookId
function getFacebookData(facebookId, callback) {

  request({
    method: 'GET',
    url: 'https://graph.facebook.com/v2.8/' + facebookId,
    qs: {
      access_token: FB_PAGE_ACCESS_TOKEN
    }
  },

  function(err, response, body) {

    let userData = null
    if (err) console.log(err);
    else userData = JSON.parse(response.body);

    callback(err, userData);
  });
}

// function to get the day(Monday, Tuesday,.. of the week)
function getWeekDay(callback) {

  var data = weekday[new Date().getDay()-1];

  callback(data);

}

// function to get the next day
function getNextDay(day, callback) {

  var data;

  for (var i = 0; i < weekday.length; i++) {
    if(weekday[i] == day){
      if(i == 6){
        data = weekday[0];
      }else {
        data = weekday[i+1];
      }
    }
  }

  callback(data);

}

// function to get the next day
function getPreviousDay(day, callback) {

  var data;

  for (var i = 0; i < weekday.length; i++) {

    if(weekday[i] === day){
      if(i == 0){
        data = weekday[6];
      }else {
        data = weekday[i-1];
      }
    }
  }

  callback(data);

}

// function to check current details in userInfo
// here when user, requests <host>/users this function triggers.
app.get('/users', function (request, response) {

    console.log('===== db_query =====');

    var userList = [];

    client.query('SELECT * FROM table_user_student_feels', function(err, result) {
      if (err){
        console.error(err); response.send("Error " + err);
      }else{
        //console.log(result.rows);
	  		for (var i = 0; i < result.rows.length; i++) {

		  		var user = {
		  			'eNumber':result.rows[i].registrationnumber,
		  			'firstName':result.rows[i].firstname,
		  			'lastName':result.rows[i].lastname,
		  			'eMail':result.rows[i]. primaryemail,
            'fieldOfStudy':result.rows[i].fieldofstudy,
            'semester':result.rows[i].semester
		  		}
		  		userList.push(user);
	  	}
	  	response.render('pages/userInfo', {"userList": userList});  // use the userInfo.pug file to show data
    }
  });
});

// function to check user Chat client mappings
// here when user, requests <host>/userChatMap this function triggers.
app.get('/userChatMap', function (request, response) {

    console.log('===== db_query =====');

    var userList = [];

    client.query('SELECT * FROM table_user_map_chatclients', function(err, result) {
      if (err){
        console.error(err); response.send("Error " + err);
      }else{
        //console.log(result.rows);
	  		for (var i = 0; i < result.rows.length; i++) {

		  		var chatMap = {
		  			'eNumber':result.rows[i].registrationnumber,
		  			'facebookID':result.rows[i].facebookid,
		  			'whatsappID':result.rows[i].whatsappid,
		  			'viberID':result.rows[i].viberid,
            'twitterID':result.rows[i].twitterid
		  		}
		  		userList.push(chatMap);
	  	}
	  	response.render('pages/userchatmapping', {"userList": userList});  // use the userInfo.pug file to show data
    }
  });
});


// function to check short semester time table
// here when user, requests <host>/shortSem this function triggers.
app.get('/shortSem', function (request, response) {

    console.log('===== db_query =====');

    var timeTableList = [];

    client.query('SELECT * FROM table_current_semester_shortsem5', function(err, result) {
      if (err){
        console.error(err); response.send("Error " + err);
      }else{
        //console.log(result.rows);
	  		for (var i = 0; i < result.rows.length; i++) {

		  		var course = {
		  			'day':result.rows[i].timetabledate,
		  			'start':result.rows[i].starttime,
		  			'end':result.rows[i].endtime,
		  			'fos':result.rows[i].fieldofstudy,
            'id':result.rows[i].courseid
		  		}
		  		timeTableList.push(course);
	  	}
	  	response.render('pages/shortSem', {"timeTableList": timeTableList});  // use the shortSem.pug file to show data
    }
  });
});


/*
function checkENumber(givenNumber, callback) {
  let num = givenNumber.replace('/', '').replace('e', '').replace('E', '').trim().toString();
  console.log(num);
  console.log(num.length);

  if(num.length != 5)var err = 'Invalid registration number';
  else {
    var data = 'E/' + num.substring(0,2) + '/' + num.substring(2,5);
    console.log(data);
  }
  callback(err, data);
}
*/
