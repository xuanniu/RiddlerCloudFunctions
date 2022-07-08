const functions = require("firebase-functions");
const admin = require("firebase-admin")
const express = require("express")
const cors = require("cors");
const { FieldValue } = require("@google-cloud/firestore");
admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({origin: true}));

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

// exports.getAllUsers = functions.https.onRequest((request, response) => {
//     const snapshot = await admin.firestore().collection("users").get()
    
// });

// exports.addUsers = functions.https.onRequest((request, response) => {
//     const user = request.body
//     await admin.firestore().collection("users").add(user);
//     response.status(201).send();
// });


// app.get("/users", async (req, res) => {
//     const snapshot = admin.firestore().collection("users").get();
//     const users = [];
//     snapshot.forEach((doc) => {
//       const id = doc.id;
//       const data = doc.data();
//       users.push({id, ...data});
//     });
//     res.status(200).send("alluser");
//   });

// app.get("users/:id", async (req, res) => {
//   const snapshot = admin.firestore().collection('users').doc(req.params.id).get();
//   const userId = snapshot.id;
//   const userData = snapshot.data();
//   res.status(200).send("userid");
// })
// app.put("/users/:id", async (req, res) => {
//   const body = req.body;
//   admin.firestore().collection('users').doc(req.params.id).update(body);
//   res.status(200).send()
// });
// app.post("/users", async  (req, res) => {
//   const body = req.body;
//   admin.firestore().collection('users').add(body);
//   res.status(200).send(body)
// });
// app.delete("/users/:id", async (req, res) => {
//   admin.firestore().collection("users").doc(req.params.id).delete();
  
//   res.status(200).send();
// });

// exports.user= functions.https.onRequest(app);


exports.createLobby = functions.https.onCall((data) => {
    const hostId = data.userId;
    const lobbySize = data.lobbySize;
    const ref = db.collection("lobby").doc();
    const gameId = ref.id;
    const lobby = {
      host: hostId,
      size: lobbySize,
      pin: gameId,
      hostQuit: false,
      gameStarted: false,
      players: []
    };
    db.collection("lobby").doc(gameId).set(lobby);
    return gameId;
});

exports.joinLobby = functions.https.onCall(async (data) => {
  const gameId = data.gameId;
  const pName = data.playerName;
  const pId = data.playerId;
  const lobby = db.collection("lobby").doc(gameId)
  const size = await lobby.get().then(value => { return value.data().size});
  const players = await lobby.get().then(value => { return value.data().players});
  const player = {
    playerId : pId,
    playerName : pName
  };
  
  if ((await lobby.get()).exists && players.length < size) {
    //adds new player to the lobby
    lobby.update({players : FieldValue.arrayUnion(player)});
    return true;
  } else {
    return false;
  }
});

exports.startGame =  functions.https.onCall(async (data) =>  {
  const gameId = data.gameId;
  const question = data.question;
  const lobby = db.collection("lobby").doc(gameId);
  const hostId = await lobby.get().then(value => { return value.data().host});
  const players = await lobby.get().then(value => { return value.data().players});
  var playerList = []

  
  for (const p of players){
    const player = {
      playerId : p.playerId,
      playerName : p.playerName,
      score : 0,
      submittedAnswer : false
    }
    playerList.push(player)
  }

  const game = {
    pin : gameId,
    host : hostId,
    finished : false,
    createdTime : Date.now(),
    currentQuestion : 1,
    hostQuit: false,
    displayingLeaderboard : false,
    displayingResult : false,
    numAnswered : 0,
    question : question,
    players : playerList
  };

  db.collection("game").doc(gameId).set(game);
  lobby.update({gameStarted : true}); 
  return gameId;
});

exports.displayLeaderboard = functions.https.onCall((data) => {
  const gameId = data.gameId
  const game = db.collection("game").doc(gameId);
  game.update({displayingResult : false});
  game.update({displayingLeaderboard : true});
});

exports.displayResult= functions.https.onCall((data) => {
  const gameId = data.gameId
  const game = db.collection("game").doc(gameId);
  game.update({displayingResult : true});
  game.update({displayingLeaderboard : false});
});

exports.finishGame = functions.https.onCall((data) => {
  const gameId = data.gameId
  const game = db.collection("game").doc(gameId);
  game.update({finished : true});
});

exports.leaveLobby = functions.https.onCall(async (data) => {
  const gameId = data.gameId
  const playerId = data.playerId
  const lobbyType = data.lobbyType
  const lobby = db.collection(lobbyType).doc(gameId);
  const players = await lobby.get().then(value => { return value.data().players});
  var playerToRemove = [];
  for (const p of players){
    if (p.playerId == playerId) {
        playerToRemove = p;
    }
  }

  lobby.update({players : FieldValue.arrayRemove(playerToRemove)});
});

exports.hostLeave = functions.https.onCall(async (data) => {
  const gameId = data.gameId
  const lobbyType = data.lobbyType
  const lobby = db.collection(lobbyType).doc(gameId);

  lobby.update({hostQuit: true});
});


exports.deleteLobby = functions.firestore
    .document('lobby/{lobbyId}')
    .onWrite(snap => {
      const lobby = snap.after.data()
      if(lobby.players.length == 0 && (lobby.gameStarted || lobby.hostQuit)) {
        db.collection('lobby').doc(snap.after.id).delete();
      }
    });

exports.deleteGame = functions.firestore
.document('game/{gameId}')
.onUpdate(snap => {
  const game = snap.after.data()
  if(game.players.length == 0 && (game.finished || game.hostQuit)) {
    db.collection('game').doc(snap.after.id).delete();
  }
});

exports.nextQuestion =  functions.https.onCall(async (data) =>  {
  const gameId = data.gameId;
  const question = data.question;
  const game = db.collection("game").doc(gameId);
  const hostId = await game.get().then(value => { return value.data().host});
  const currentQuestion = await game.get().then(value => { return value.data().currentQuestion});
  const players = await game.get().then(value => { return value.data().players});
  var playerList = []

  
  for (const p of players){
    console.log(p)
    const player = {
      playerId : p.playerId,
      playerName : p.playerName,
      score : p.score,
      submittedAnswer : false
    }
    playerList.push(player)
  }

  const next = {
    pin : gameId,
    host : hostId,
    finished : false,
    createdTime : Date.now(),
    currentQuestion : currentQuestion + 1,
    hostQuit: false,
    displayingLeaderboard : false,
    displayingResult : false,
    numAnswered : 0,
    question : question,
    players : playerList
  };

  db.collection("game").doc(gameId).set(next);
  return true;
});

exports.submitAnswer = functions.https.onCall(async (data) =>  {
  const gameId = data.gameId;
  const playerId = data.playerId;
  const answer = data.answer;
  const timeLimit = 30;
  
  const game = db.collection("game").doc(gameId);
  const startTime = await game.get().then(value => { return value.data().createdTime});
  const players = await game.get().then(value => { return value.data().players});
  const question = await game.get().then(value => { return value.data().question});
  const numAnswered = await game.get().then(value => { return value.data().numAnswered});
  const displayingLeaderboard = await game.get().then(value => { return value.data().displayingLeaderboard});
  
  var currentPlayer = {};
  var updatedPlayer = {};
  var responseTime = (Date.now()-startTime)/1000;
  var score = 0;
  var totalScore = 0;
  var isAnswerCorrect = false;


  if (answer == question.correctAnswer) {
    score = Math.round((1-((responseTime/timeLimit)/2))*1000);
    isAnswerCorrect = true;
  }
  if (responseTime > 30)
    score = 0


  for (const p of players){
    if (p.playerId == playerId && !p.submittedAnswer && !displayingLeaderboard ) {
      currentPlayer = p;
      totalScore = p.score + score;
      updatedPlayer = {
        playerId : p.playerId,
        playerName : p.playerName,
        score : totalScore,
        submittedAnswer : true
      };
      game.update({numAnswered : numAnswered + 1})
      game.update({players : FieldValue.arrayRemove(currentPlayer)});
      game.update({players : FieldValue.arrayUnion(updatedPlayer)});
    }
  }

  const changes = {
    score : score,
    totalScore : totalScore,
    isAnswerCorrect : isAnswerCorrect
  };
  console.log(changes)
  return changes;
});
