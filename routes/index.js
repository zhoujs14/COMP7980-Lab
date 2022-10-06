var express = require('express');
var router = express.Router();

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var url = 'mongodb://22435816:ekggxfwyYEhxtWtMHmUDDKlIfuoPdqW8e17eIcpaDySfGhAHd8qfMWocFigGUVtwIuwCqtnPrbw4Fsd3RzUpvg==@22435816.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&replicaSet=globaldb&maxIdleTimeMS=120000&appName=@22435816@';

var db;

MongoClient.connect(url, function (err, client) {
  db = client.db('bookingsDB');
  console.log("DB connected");
});

/* GET home page ? */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

/* redirect to search page */
router.get('/search', function (req, res, next) {
  res.redirect('http://localhost:3000/search.html')
});

// handle search form
router.get("/searchBookings", async function (req, res) {
  let form = req.query

  let whereClause = {}
  //email
  if (form.email)
    whereClause.email = { $regex: form.email } //partitial match
  //numTickets
  if (form.numTickets)
    whereClause.numTickets = parseInt(form.numTickets)
  //payment method
  if (form.payment !== 'ALL')
    whereClause.payment = form.payment
  //team
  if (form.team !== 'ALL')
    whereClause.team = form.team
  //hero
  if (form.superhero !== 'ALL')
    whereClause.superhero = form.superhero
  //term
  if (form.term === 'on')
    whereClause.term = form.term
  else if (form.term === 'off')
    whereClause.term = { $exists: false } // term not exist

  //console.log('combined:', whereClause)
  //paginate
  let perPage = Math.max(form.perPage, 6) || 6

  let result = await db.collection("bookings").find(whereClause, {
    limit: perPage,
    skip: perPage * (Math.max(form.page - 1, 0) || 0)
  }).toArray()

  let pages = Math.ceil(await db.collection("bookings").find(whereClause).count() / perPage)
  let parameters = ''
  for (let i in form)
    if (i && i != 'perPage' && i !== 'page')
      parameters = parameters + '&' + i + '=' + form[i]
  res.render('searchResult', { bookings: result, pages: pages, parameters: parameters, lastPage: (Math.max(req.query.page - 1, 0) || 0), nextPage: (Math.min(parseInt(req.query.page) + 1, pages) || 0) })
});

/* Display all Bookings */
router.get('/bookings', async function (req, res) {

  let results = await db.collection("bookings").find({}, { limit: 100 }).toArray();
  res.render('bookings', { bookings: results });

});

/* Display a single Booking */
router.get('/bookings/read/:id', async function (req, res) {
  // :id path variable
  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOne({ _id: ObjectId(req.params.id) })

  if (result)
    // render booking.ejs with {}
    res.render('booking', { booking: result });
  else
    res.status(404).send('Unable to find the requested resource!');

});

/* Handle the Form */
router.post('/bookings', async function (req, res) {

  req.body.numTickets = parseInt(req.body.numTickets);

  let result = await db.collection("bookings").insertOne(req.body);
  res.status(201).json({ id: result.insertedId });

});

// Delete a single Booking
router.post('/bookings/delete/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOneAndDelete({ _id: ObjectId(req.params.id) })

  if (!result.value) return res.status(404).send('Unable to find the requested resource!');

  res.send("Booking deleted.");

});

// get information by id and jump to update form
router.get('/bookings/update/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOne({ _id: ObjectId(req.params.id) });

  if (!result) return res.status(404).send('Unable to find the requested resource!');

  console.log('update:', result)

  res.render("update", { booking: result })

});

// Updating a single Booking
router.post('/bookings/update/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  req.body.numTickets = parseInt(req.body.numTickets);

  var result = await db.collection("bookings").findOneAndReplace({ _id: ObjectId(req.params.id) },
    req.body
  );

  if (!result.value)
    return res.status(404).send('Unable to find the requested resource!');

  res.send("Booking updated.");

});

/* Searching */
router.get('/bookings/search', async function (req, res) {

  var whereClause = {};

  // allow partial match
  if (req.query.email) whereClause.email = { $regex: req.query.email };

  var parsedNumTickets = parseInt(req.query.numTickets);
  if (!isNaN(parsedNumTickets)) whereClause.numTickets = parsedNumTickets;

  let results = await db.collection("bookings").find(whereClause).toArray();

  return res.render('bookings', { bookings: results });

});

/* Pagination */
router.get('/bookings/paginate', async function (req, res) {

  var perPage = Math.max(req.query.perPage, 2) || 2;

  var results = await db.collection("bookings").find({}, {
    limit: perPage,
    skip: perPage * (Math.max(req.query.page - 1, 0) || 0)
  }).toArray();

  var pages = Math.ceil(await db.collection("bookings").count() / perPage);

  return res.render('paginate', { bookings: results, pages: pages });

});

/* Ajax-Pagination */
router.get('/api/bookings', async function (req, res) {

  var perPage = Math.max(req.query.perPage, 2) || 2;

  var results = await db.collection("bookings").find({}, {
    limit: perPage,
    skip: perPage * (Math.max(req.query.page - 1, 0) || 0)
  }).toArray();

  var pages = Math.ceil(await db.collection("bookings").count() / perPage);

  // return res.render('paginate', { bookings: results, pages: pages, perPage: perPage });

  return res.json({ bookings: results, pages: pages })

});

// Form for updating a single Booking
router.get('/api/bookings/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOne({ _id: ObjectId(req.params.id) });

  if (!result) return res.status(404).send('Unable to find the requested resource!');

  res.json(result);

});

// Updating a single Booking - Ajax
router.put('/api/bookings/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  req.body.numTickets = parseInt(req.body.numTickets);

  var result = await db.collection("bookings").findOneAndReplace(
    { _id: ObjectId(req.params.id) }, req.body
  );

  if (!result.value)
    return res.status(404).send('Unable to find the requested resource!');

  res.send("Booking updated.");

});

//Delete a single Booking
router.delete('/api/bookings/:id', async function (req, res) {

  if (!ObjectId.isValid(req.params.id))
    return res.status(404).send('Unable to find the requested resource!');

  let result = await db.collection("bookings").findOneAndDelete({ _id: ObjectId(req.params.id) })

  if (!result.value) return res.status(404).send('Unable to find the requested resource!');

  return res.status(204).send();

});
module.exports = router;
