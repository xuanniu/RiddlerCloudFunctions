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
    const ref = db.collection("lobby").doc();
    const gameId = ref.id;
    const lobby = {
      host: hostId,
      pin: gameId,
      gameStarted: false,
      players: []
    };
    db.collection("lobby").doc(gameId).set(lobby);
    return gameId;
});

exports.joinLobby = functions.https.onCall((data) => {
  const gameId = data.gameId;
  const pName = data.playerName;
  const pId = data.playerId;
  const player = {
    playerId : pId,
    playerName : pName
  };
  const lobby = db.collection("lobby").doc(gameId);
  
  //adds new player to the lobby
  lobby.update({players : FieldValue.arrayUnion(player)});
  return gameId;
});

exports.startGame =  functions.https.onCall((data) =>  {
  const gameId = data.gameId;
  const question = data.question;
  const lobby = db.collection("lobby").doc(gameId);
  //const hostId = await lobby.get().data().host
  const players = lobby.get().then((value) => { return value.data().players});
  const game = {
    pin : gameId,
    // host : hostId,
    finished : false,
    createdTime : Date.now(),
    currentQuestion : 1,
    question : question
    // currentQuestion : 1,
    // question : question,
    // players : playerList
  };
  db.collection("game").doc(gameId).set(game);
  lobby.update({gameStarted : true}); 
  return gameId;
});
