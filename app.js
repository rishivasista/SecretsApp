require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");

// Install passport, passport-local, passport-local-mongoose
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

// Install passport-google-oauth2
const GoogleStrategy = require('passport-google-oauth20').Strategy;

//Install passport-Facebook
const FacebookStrategy = require("passport-facebook").Strategy;

// Install mongoose-findorcreate
const findOrCreate = require("mongoose-findorcreate");
const app = express();



app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-rishi:Stpaul2013@cluster0.tkbrp.mongodb.net/userDB?retryWrites=true&w=majority");

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());


// Serializing a User
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserializing a User
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});


// Using Google Oauth 2.0
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://serene-dusk-33774.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));
// Google Log in
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  }));

// Redirecting to Secrets after Authentication
app.get("/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });



// Using Facebook Oauth
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://serene-dusk-33774.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));
app.get("/auth/facebook",
  passport.authenticate("facebook"));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

// Rendering Authentication Page
app.get("/", (req, res) => {
  res.render("home");
});

// Rendering Register Page
app.route("/register")
  .get((req, res) => {
    res.render("register");
  })

  .post((req, res) => {
    User.register({
      username: req.body.username
    }, req.body.password, (err, user) => {
      if(err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    });
  });


// Rendering Login Page
app.route("/login")
  .get((req, res) => {
    res.render("login");
  })

  .post((req, res) => {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    req.login(user, (err) => {
      if(err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    });
  });


// Rendering Secrets Home Page
app.get("/secrets", (req, res) => {
  User.find({
    "secret": {
      $ne: null
    }
  }, (err, foundUsers) => {
    if(err) {
      console.log(err);
    } else {
      if(foundUsers) {
        res.render("secrets", {
          usersWithSecrets: foundUsers
        });
      }
    }
  });
});
// Rendering Submit Button action
app.get("/submit", (req, res) => {
  if(req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req, res) => {
  User.findById(req.user.id, (err, foundUser) => {
    if(err) {
      console.log(err);
    } else {
      if(foundUser) {
        foundUser.secret = req.body.secret;
        foundUser.save(() => {
          res.redirect("/secrets");
        });
      }
    }
  });
});
// Logout Button
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

let port = process.env.PORT;
if(port == null || port == "") {
  port = 3000;
}

app.listen(port, () => console.log("Server started on port 3000"));